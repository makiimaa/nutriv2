# services/nutrition_planner.py
from __future__ import annotations
import os
from typing import List, Dict, Any, Literal, Tuple
from bson import ObjectId
from datetime import datetime, timedelta, date as _date
import requests

from common.db import students, classes, food_items, measurements, daily_health_status as health, nutri_recs, daily_food_intake as intake

from ai.gemini_client import generate as ggen
from ai.ollama_client import generate as lgen

from utils.bmi import bmi_status
import json, re

NEST_API = os.getenv("API_BASE", "http://127.0.0.1:3000")
CTX_DAYS = 7                             
ENGINE_MAP = {"gemini": "gemini", "ollama": "ollama", "local": "ollama"}  

def _oid(x: str) -> ObjectId:
    return ObjectId(x)

def _normalize_engine(e: str) -> Literal["gemini", "ollama"]:
    e = (e or "gemini").strip().lower()
    return ENGINE_MAP.get(e, "gemini")  

def _school_days(start_ymd: str, days: int) -> List[str]:
    """Sinh danh sách ngày (YYYY-MM-DD), bỏ T7/CN; tối đa 7 ngày."""
    d0 = datetime.fromisoformat(start_ymd).date()
    days = max(1, min(7, int(days)))
    out: List[str] = []
    cur = d0
    while len(out) < days:
        if cur.weekday() < 5: 
            out.append(cur.isoformat())
        cur += timedelta(days=1)
    return out

def _load_food_catalog() -> List[Dict[str, Any]]:
    cur = food_items.find(
        {"isActive": {"$ne": False}},
        {"_id": 1, "name": 1, "unit": 1, "category": 1, "nutrition": 1, "allergens": 1, "isVegetarian": 1, "isHalal": 1},
    )
    out: List[Dict[str, Any]] = []
    for d in cur:
        d["_id"] = str(d["_id"])
        out.append(d)
    return out

def _catalog_index(catalog: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {it["_id"]: it for it in catalog}

def _pick_id_by_name(name: str, catalog: List[Dict[str, Any]]) -> str | None:
    if not name:
        return None
    n = name.strip().lower()
    for it in catalog:
        if it["name"].strip().lower() == n:
            return it["_id"]
    for it in catalog:
        nm = it["name"].strip().lower()
        if n in nm or nm in n:
            return it["_id"]
    return None

def _with_names(items: List[Dict[str, Any]], idx: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for it in items or []:
        fid = it.get("foodItemId")
        nm = it.get("name")
        if not nm and fid and fid in idx:
            nm = idx[fid]["name"]
        out.append({**it, "name": nm})
    return out

def _filter_catalog_by_allergen(catalog: List[Dict[str, Any]], allergy: str | None) -> List[Dict[str, Any]]:
    if not allergy or allergy == "none":
        return catalog
    key = (allergy or "").lower()
    def ok(it: Dict[str, Any]) -> bool:
        for a in it.get("allergens") or []:
            if key in (a or "").lower():
                return False
        return True
    return [it for it in catalog if ok(it)]

def _fetch_class_context(class_id: str, days: int = CTX_DAYS) -> Dict[str, Any]:
    try:
        r = requests.get(f"{NEST_API}/nutrition/context", params={"classId": class_id, "days": days}, timeout=15)
        if r.status_code == 200 and isinstance(r.json(), dict):
            return r.json()
    except Exception:
        pass
    since = datetime.utcnow() - timedelta(days=days+2)
    recent_menus: List[str] = []
    for d in nutri_recs.find({"createdAt": {"$gte": since}}, {"recommendations": 1}).limit(500):
        meals = ((d.get("recommendations") or {}).get("meals") or {})
        for k in ("breakfast", "lunch", "snack"):
            for it in (meals.get(k, {}).get("items") or []):
                name = (it.get("name") or "").strip().lower()
                if name:
                    recent_menus.append(name)
    return {"menusRecent": recent_menus, "intakeRecent": [], "healthRecent": []}

def _penalize_repeats(candidates: List[Dict[str, Any]], ctx: Dict[str, Any]) -> List[Dict[str, Any]]:
    recent_names = set([s for s in (ctx.get("menusRecent") or [])])
    if not recent_names:
        return candidates
    def score(x: Dict[str, Any]) -> int:
        nm = (x.get("name") or "").strip().lower()
        return 1 if nm and nm not in recent_names else 2  
    return sorted(candidates, key=score)

def _ai(engine: Literal["gemini", "ollama"], prompt: str) -> str:
    if engine == "gemini":
        return ggen(prompt, model="gemini-2.5-flash")
    return lgen(prompt)

def _parse_ai_json(raw: str) -> Dict[str, Any]:
    
    try:
        return json.loads(raw)
    except Exception:
        try:
            m = re.search(r"\{.*\}", raw, flags=re.S)
            if m:
                return json.loads(m.group(0))
        except Exception:
            pass
    return {}

def _menu_from_ai_json(j: Dict[str, Any], catalog: List[Dict[str, Any]]) -> Dict[str, Any]:
    idx = _catalog_index(catalog)
    def norm(arr):
        out = []
        for x in (arr or []):
            fid = x.get("foodItemId")
            nm = (x.get("name") or "").strip()
            if not fid and nm:
                fid = _pick_id_by_name(nm, catalog)
            if not fid and not nm:
                continue
            qty = float(x.get("quantity") or 100)
            unit = (idx.get(fid, {}).get("unit") if fid else (x.get("unit") or "g")) or "g"
            out.append({"foodItemId": fid, "name": nm or (idx.get(fid, {}) or {}).get("name"), "quantity": qty, "unit": unit})
        return out

    meals_in = (j.get("meals") or {})
    return {
        "breakfast": {"items": norm(meals_in.get("breakfast"))},
        "lunch":     {"items": norm(meals_in.get("lunch"))},
        "snack":     {"items": norm(meals_in.get("snack"))},
    }

def _save_menu_draft(school_id: ObjectId, class_id: ObjectId, date_ymd: str, group_name: str, meals: Dict[str, Any], engine: str) -> str:
    doc = {
        "type": "menu_draft",
        "classId": class_id,
        "date": datetime.fromisoformat(date_ymd),
        "studentGroup": {"name": group_name},
        "meals": meals,
        "aiModel": engine,
        "appliedToMenu": False,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    ins = nutri_recs.insert_one(doc)
    return str(ins.inserted_id)

def _group_class_students_simple(class_id: str) -> List[Dict[str, Any]]:
    """Phân nhóm đơn giản theo BMI + dị ứng (MVP), để fallback khi không có groupId."""
    roster = list(students.find({"classId": _oid(class_id), "isActive": {"$ne": False}}, {"_id": 1, "fullName": 1, "healthInfo": 1}))
    latest_map: Dict[str, str] = {}
    for s in roster:
        m = measurements.find_one({"studentId": s["_id"]}, sort=[("measurementDate", -1)])
        latest_map[str(s["_id"])] = (m and bmi_status(m.get("bmi"))) or "unknown"

    def allergy_key(s) -> str:
        arr = ((s.get("healthInfo") or {}).get("allergies") or [])
        arr = [a.strip().lower() for a in arr if a]
        if not arr:
            return "none"
        for key in ("shrimp", "tôm", "peanut", "đậu phộng", "dairy", "sữa"):
            if any(key in x for x in arr):
                return key
        return "multi"

    buckets: Dict[str, List[str]] = {}
    for s in roster:
        bid = latest_map.get(str(s["_id"]), "unknown")
        ak = allergy_key(s)
        gk = f"{bid}|{ak}"
        buckets.setdefault(gk, []).append(str(s["_id"]))

    out = []
    for gk, ids in buckets.items():
        bmi_part, alg_part = gk.split("|", 1)
        name = f"{bmi_part} - {('không dị ứng' if alg_part=='none' else f'dị ứng {alg_part}')}"
        out.append({"key": gk, "name": name, "studentIds": ids, "constraints": {"bmi": bmi_part, "allergy": alg_part}})
    return out

def _fetch_saved_grouping(group_id: str) -> Tuple[List[Dict[str, Any]], str]:
    try:
        r = requests.get(f"{NEST_API}/nutrition/groupings/{group_id}", timeout=12)
        if r.status_code == 200:
            item = (r.json() or {}).get("item") or {}
            return item.get("groups") or [], item.get("name") or ""
    except Exception:
        pass
    return [], ""

def _build_prompt_for_group(constraints: Dict[str, Any], ctx: Dict[str, Any]) -> str:
    recent = ctx.get("menusRecent") or []
    recent_hint = ", ".join(list(dict.fromkeys([x for x in recent]))[:12]) 
    return f"""
Bạn là chuyên gia dinh dưỡng mầm non. Hãy tạo thực đơn TRONG NGÀY cho nhóm học sinh có đặc điểm:
- BMI: {constraints.get('bmi')}
- Dị ứng: {constraints.get('allergy')}
- Tránh lặp món gần đây: [{recent_hint}]
- Xuất JSON STRICT:
{{
  "meals": {{
    "breakfast": [{{"foodItemId":"", "name":"", "quantity":120, "unit":"g"}}],
    "lunch":     [{{"foodItemId":"", "name":"", "quantity":150, "unit":"g"}}],
    "snack":     [{{"foodItemId":"", "name":"", "quantity":100, "unit":"g"}}]
  }}
}}
    """.strip()

def plan_menus_for_class(
    class_id: str,
    start_date: str,
    days: int,
    engine: str,
    group_id: str | None,
) -> Dict[str, Any]:
    eng = _normalize_engine(engine)

    cls = classes.find_one({"_id": _oid(class_id)}, {"name": 1, "schoolId": 1})
    if not cls:
        return {"ok": False, "message": "Class not found"}

    catalog = _load_food_catalog()
    dates = _school_days(start_date, days)
    ctx = _fetch_class_context(class_id, CTX_DAYS)

    # Lấy nhóm
    groups, grouping_name = ([], "")
    if group_id:
        groups, grouping_name = _fetch_saved_grouping(group_id)
    if not groups:
        groups = _group_class_students_simple(class_id)

    previews: List[Dict[str, Any]] = []
    draft_ids: List[str] = []

    for g in groups:
        group_name = g.get("name") or "nhóm"
        constraints = g.get("constraints") or {}
        filtered_catalog = _filter_catalog_by_allergen(catalog, constraints.get("allergy"))

        for ds in dates:
            prompt = _build_prompt_for_group(constraints, ctx)
            raw = _ai(eng, prompt)
            j = _parse_ai_json(raw)
            meals = _menu_from_ai_json(j, filtered_catalog)

            for k in ("breakfast", "lunch", "snack"):
                items = meals[k]["items"]
                meals[k]["items"] = _penalize_repeats(items, ctx)

            rec_id = _save_menu_draft(cls["schoolId"], _oid(class_id), ds, group_name, meals, eng)
            draft_ids.append(rec_id)

            previews.append({
                "recId": rec_id,
                "date": ds,
                "groupName": group_name,
                "studentCount": len(g.get("studentIds") or []),
                "meals": meals, 
            })

    return {
        "ok": True,
        "schoolId": str(cls["schoolId"]),
        "class": {"_id": class_id, "name": cls.get("name")},
        "previews": previews,
        "draftIds": draft_ids,
    }

def plan_menus_for_student(
    student_id: str,
    start_date: str,
    days: int,
    engine: str,
) -> Dict[str, Any]:
    eng = _normalize_engine(engine)

    s = students.find_one({"_id": _oid(student_id)}, {"fullName": 1, "classId": 1, "schoolId": 1})
    if not s:
        return {"ok": False, "message": "Student not found"}

    cls = classes.find_one({"_id": s.get("classId")}, {"name": 1, "schoolId": 1})
    school_id = s.get("schoolId") or (cls and cls.get("schoolId"))
    catalog = _load_food_catalog()
    dates = _school_days(start_date, days)

    ctx = _fetch_class_context(str(s.get("classId")), CTX_DAYS)

    previews: List[Dict[str, Any]] = []
    draft_ids: List[str] = []

    base_prompt = f"""
Bạn là chuyên gia dinh dưỡng mầm non. Hãy tạo thực đơn TRONG NGÀY cho học sinh {s.get('fullName','')}
- Tránh lặp món gần đây trong lớp
- Xuất JSON STRICT:
{{
  "meals": {{
    "breakfast": [{{"foodItemId":"", "name":"", "quantity":120, "unit":"g"}}],
    "lunch":     [{{"foodItemId":"", "name":"", "quantity":150, "unit":"g"}}],
    "snack":     [{{"foodItemId":"", "name":"", "quantity":100, "unit":"g"}}]
  }}
}}
    """.strip()

    for ds in dates:
        raw = _ai(eng, base_prompt)
        j = _parse_ai_json(raw)
        meals = _menu_from_ai_json(j, catalog)

        for k in ("breakfast", "lunch", "snack"):
            items = meals[k]["items"]
            meals[k]["items"] = _penalize_repeats(items, ctx)

        rec_id = _save_menu_draft(school_id, s.get("classId"), ds, s.get("fullName", "Học sinh"), meals, eng)
        draft_ids.append(rec_id)

        previews.append({
            "recId": rec_id,
            "date": ds,
            "groupName": s.get("fullName") or "HS",
            "studentCount": 1,
            "meals": meals,
        })

    return {
        "ok": True,
        "student": {"_id": student_id, "fullName": s.get("fullName")},
        "schoolId": str(school_id),
        "classId": str(s.get("classId") or ""),
        "previews": previews,
        "draftIds": draft_ids,
    }
