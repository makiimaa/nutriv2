# be-py/services/nutrition_group.py
from typing import List, Dict, Any, Optional, Tuple
from bson import ObjectId
from datetime import datetime
from common.db import students, classes, measurements, db
from utils.bmi import bmi_status
from ai.gemini_client import generate as gemini_generate
from ai.ollama_client import generate as ollama_generate
import json, re

def _parse_ai_json(raw: str):
    if not raw or not isinstance(raw, str):
        return {}
    try:
        return json.loads(raw)
    except Exception:
        pass
    try:
        m = re.search(r"(\{.*\}|\[.*\])", raw, flags=re.S)
        if m:
            return json.loads(m.group(1))
    except Exception:
        pass
    return {}

_groupings = db["student_groupings"]

def _oid(x: str) -> ObjectId:
    return ObjectId(x)

def _allergy_key(hinfo: dict) -> str:
    arr = [ (a or "").strip().lower() for a in (hinfo or {}).get("allergies", []) if a ]
    if not arr: return "none"
    for key in ["tôm", "shrimp", "peanut", "đậu phộng", "dairy", "sữa"]:
        if any(key in a for a in arr): return key
    return "multi"

def _load_roster(class_id: str) -> List[Dict[str, Any]]:
    return list(students.find(
        {"classId": _oid(class_id), "isActive": {"$ne": False}},
        {"_id":1,"fullName":1,"healthInfo":1}
    ))

def _latest_bmi_map(student_ids: List[ObjectId]) -> Dict[str, str]:
    out = {}
    for sid in student_ids:
        m = measurements.find_one({"studentId": sid}, sort=[("measurementDate",-1)])
        out[str(sid)] = (m and bmi_status(m.get("bmi"))) or "unknown"
    return out

def _bucketize(roster: List[Dict[str,Any]]) -> Dict[str, List[str]]:
    ids = [s["_id"] for s in roster]
    bmi_map = _latest_bmi_map(ids)
    buckets: Dict[str, List[str]] = {}
    for s in roster:
        sid = str(s["_id"])
        b = bmi_map.get(sid, "unknown")
        ak = _allergy_key(s.get("healthInfo") or {})
        key = f"{b}|{ak}"
        buckets.setdefault(key, []).append(sid)
    return buckets

def _make_group_name(key: str) -> str:
    b, a = key.split("|", 1)
    alg = "không dị ứng" if a == "none" else f"dị ứng {a}"
    return f"{b} - {alg}"

def _merge_buckets_to_limit(buckets: Dict[str,List[str]], limit: int) -> List[Dict[str,Any]]:
    items = sorted(buckets.items(), key=lambda kv: len(kv[1]), reverse=True)
    if len(items) <= limit:
        return [{"key": k, "name": _make_group_name(k), "studentIds": v} for k,v in items]
    top = items[:limit-1]
    rest = items[limit-1:]
    others: List[str] = []
    for _, ids in rest:
        others.extend(ids)
    out = [{"key": k, "name": _make_group_name(k), "studentIds": v} for k,v in top]
    out.append({"key": "mixed|mixed", "name": "Hỗn hợp", "studentIds": others})
    return out

def analyze_grouping(class_id: str, group_count: Optional[int], engine: str, teacher_hint: str) -> Dict[str,Any]:
    from ai.gemini_client import generate as gemini_generate
    from ai.ollama_client import generate as ollama_generate

    cls = classes.find_one({"_id": _oid(class_id)}, {"name": 1})
    if not cls:
        return {"ok": False, "message": "Class not found"}

    roster = _load_roster(class_id)
    if not roster:
        return {"ok": False, "message": "No students found"}

    data_points = []
    for s in roster:
        info = s.get("healthInfo", {}) or {}
        sid = str(s["_id"])
        m = measurements.find_one({"studentId": s["_id"]}, sort=[("measurementDate", -1)])
        bmi = bmi_status(m.get("bmi")) if m else "unknown"
        data_points.append({
            "id": sid,
            "name": s.get("fullName"),
            "bmi": bmi,
            "allergies": info.get("allergies", []),
            "diseases": info.get("diseases", []),
            "gender": info.get("gender"),
            "notes": info.get("notes", "")
        })

    prompt = f"""
Bạn là chuyên gia dinh dưỡng và sức khoẻ trẻ nhỏ.
Hãy chia các học sinh sau thành tối đa {group_count or 5} nhóm dựa trên thể trạng (BMI), dị ứng, bệnh lý, giới tính, và sự tương đồng dinh dưỡng.

Trả về JSON *duy nhất* dạng mảng:
[
  {{
    "key": "group_1",
    "name": "Nhóm mô tả ngắn",
    "description": "Mô tả chi tiết về nhóm",
    "criteriaSummary": {{"BMI": "béo phì", "Allergy": "sữa"}},
    "studentIds": ["id1","id2"]
  }}
]

Gợi ý của giáo viên: {teacher_hint or "Không có"}.
Dữ liệu học sinh:
{json.dumps(data_points, ensure_ascii=False)}
    """.strip()

    try:
        if engine == "ollama":
            raw = ollama_generate(prompt)
        else:
            raw = gemini_generate(prompt)

        parsed = _parse_ai_json(raw)
        if not parsed:
            raise ValueError("AI không trả JSON hoặc kết quả rỗng")

        if not isinstance(parsed, list):
            raise ValueError("Kết quả không phải danh sách nhóm")

        groups = []
        for idx, g in enumerate(parsed):
            sid_list = g.get("studentIds") or []
            if isinstance(sid_list, dict):
                sid_list = list(sid_list.values())
            groups.append({
                "key": g.get("key") or f"group_{idx+1}",
                "name": g.get("name") or f"Nhóm {idx+1}",
                "description": g.get("description", ""),
                "criteriaSummary": g.get("criteriaSummary", {}),
                "studentIds": [str(x) for x in sid_list],
            })

        return {
            "ok": True,
            "groupCount": len(groups),
            "groups": groups,
            "engine": engine,
            "class": {"_id": class_id, "name": cls.get("name")},
        }

    except Exception as e:
        try:
            buckets = _bucketize(roster)
            limit = min(5, max(1, group_count or len(buckets) or 1))
            groups0 = _merge_buckets_to_limit(buckets, limit)
            fallback = []
            for g in groups0:
                crit = {}
                if g["key"] != "mixed|mixed":
                    b,a = g["key"].split("|",1)
                    crit = {"bmi": b, "allergy": a}
                desc = f"Nhóm {g['name']}. {len(g['studentIds'])} học sinh."
                if teacher_hint:
                    desc += f" (Hint: {teacher_hint})"
                fallback.append({
                    "key": g["key"],
                    "name": g["name"],
                    "description": desc,
                    "criteriaSummary": crit,
                    "studentIds": g["studentIds"],
                })
            return {"ok": True, "groups": fallback, "engine": "fallback", "note": str(e)}
        except Exception as e2:
            return {"ok": False, "message": f"Lỗi AI: {str(e)} / fallback: {e2}"}


def save_grouping(payload: Dict[str,Any]) -> Tuple[bool, Optional[str]]:
    doc = {
        "classId": _oid(payload["classId"]),
        "name": payload.get("name") or f"Phân nhóm - {datetime.utcnow().date().isoformat()}",
        "engine": payload.get("engine","gemini"),
        "groupCount": int(payload.get("groupCount") or 0),
        "teacherHint": payload.get("teacherHint") or "",
        "groups": payload.get("groups") or [],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    r = _groupings.insert_one(doc)
    return True, str(r.inserted_id)

def list_groupings(class_id: str, page: int, page_size: int) -> Dict[str,Any]:
    q = {"classId": _oid(class_id)}
    total = _groupings.count_documents(q)
    cur = _groupings.find(q).sort([("createdAt",-1)]).skip((page-1)*page_size).limit(page_size)
    items = []
    for d in cur:
        d["_id"] = str(d["_id"])
        d["classId"] = str(d["classId"])
        items.append(d)
    return {"ok": True, "total": total, "items": items}

def get_grouping(group_id: str) -> Optional[Dict[str,Any]]:
    d = _groupings.find_one({"_id": _oid(group_id)})
    if not d: return None
    d["_id"] = str(d["_id"])
    d["classId"] = str(d["classId"])
    return d

def regen_grouping(group_id: str) -> Optional[Dict[str,Any]]:
    old = _groupings.find_one({"_id": _oid(group_id)})
    if not old: return None
    data = analyze_grouping(
        class_id=str(old["classId"]),
        group_count=old.get("groupCount"),
        engine=old.get("engine","gemini"),
        teacher_hint=old.get("teacherHint",""),
    )
    return data
