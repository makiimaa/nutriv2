# be-py/services/nutrition_service.py
import json
from typing import Literal, Dict, Any
from bson import ObjectId
from utils.bmi import age_in_months, bmi_status
from common.db import students, measurements, intakes, health, nutri_recs, food_items
from datetime import datetime, timedelta, date
from typing import List, Tuple

WEEKDAYS = {0,1,2,3,4} 

def _oid(x: str) -> ObjectId: return ObjectId(x)

def load_student_context(student_id: str, days: int = 7) -> Dict[str, Any]:
    s = students.find_one({"_id": _oid(student_id)})
    if not s:
        raise ValueError("Student not found")

    dob = s.get("dateOfBirth")
    dob_date = dob.date() if hasattr(dob, "date") else dob
    age_months = age_in_months(dob_date)

    cls_id = s.get("classId")                
    cls_id_str = str(cls_id) if cls_id else None

    m = measurements.find_one({"studentId": s["_id"]}, sort=[("measurementDate", -1)])
    weight, height, bmi = None, None, None
    if m:
        weight, height, bmi = m.get("weight"), m.get("height"), m.get("bmi")

    since = datetime.utcnow() - timedelta(days=days)
    rec_intakes = list(
        intakes.find({"studentId": s["_id"], "date": {"$gte": since}}, {"_id": 1})
    )
    intake_ids = [str(x["_id"]) for x in rec_intakes]

    recent_health = list(
        health.find({"studentId": s["_id"], "date": {"$gte": since}})
    )
    health_conds, activity = [], None
    if recent_health:
        last = sorted(recent_health, key=lambda x: x.get("date", datetime.min))[-1]
        activity = last.get("activityLevel")
        us = last.get("healthStatus", {}).get("unusualSymptoms") or []
        health_conds.extend(us)

    allergies = (s.get("healthInfo") or {}).get("allergies", []) or []

    return {
        "student": {
            "_id": str(s["_id"]),
            "fullName": s.get("fullName"),
            "gender": s.get("gender"),
            "dob": str(dob_date),
            "classId": cls_id,                
        },
        "inputData": {
            "age": age_months,
            "weight": weight,
            "height": height,
            "bmi": bmi,
            "recentIntakeHistory": intake_ids,
            "healthConditions": health_conds,
            "allergies": allergies,
            "activityLevel": activity,
        },
        "bmiStatus": bmi_status(bmi) if bmi else None,

        "studentClassId": cls_id,            
        "studentClassIdStr": cls_id_str,   
    }

def build_prompt_single(ctx: Dict[str, Any], period: Literal["day","week"]) -> str:
    return f"""
Bạn là chuyên gia dinh dưỡng cho trẻ mầm non. Hãy tạo gợi ý dinh dưỡng cá nhân hoá cho học sinh sau theo dạng JSON STRICT, KHÔNG thêm giải thích.
Thông tin:
- Họ tên: {ctx['student']['fullName']}
- Tuổi (tháng): {ctx['inputData']['age']}
- Giới tính: {ctx['student']['gender']}
- Cân nặng: {ctx['inputData']['weight']} kg
- Chiều cao: {ctx['inputData']['height']} cm
- BMI hiện tại: {ctx['inputData']['bmi']} (nhóm: {ctx.get('bmiStatus')})
- Dị ứng: {", ".join(ctx['inputData']['allergies']) or "không"}
- Mức vận động: {ctx['inputData']['activityLevel'] or "không rõ"}
- Lịch sử intake 7 ngày: {ctx['inputData']['recentIntakeHistory']}

YÊU CẦU:
- Sinh kế hoạch cho: "{period}".
- Tránh dị ứng.
- Trả về JSON hợp lệ theo cấu trúc:
{{
  "recommendations": {{
    "dailyCaloriesTarget": <number>,
    "macronutrients": {{
      "protein": {{"target": <number>, "min": <number>, "max": <number>}},
      "fat": {{"target": <number>, "min": <number>, "max": <number>}},
      "carbohydrate": {{"target": <number>, "min": <number>, "max": <number>}}
    }},
    "micronutrients": {{
      "calcium":  {{"target": <number>, "min": <number>, "max": <number>}},
      "iron":     {{"target": <number>, "min": <number>, "max": <number>}},
      "vitaminA": {{"target": <number>, "min": <number>, "max": <number>}},
      "vitaminC": {{"target": <number>, "min": <number>, "max": <number>}},
      "vitaminD": {{"target": <number>, "min": <number>, "max": <number>}}
    }},
    "suggestedFoods": [{{"foodItemId": "", "reason": "", "frequency": "daily"}}],
    "foodsToAvoid":   [{{"foodItemId": "", "reason": ""}}],
    "mealDistribution": {{"breakfast": 30, "lunch": 50, "snack": 20}},
    "specialNotes": "..."
  }},
  "confidence": 0.7
}}
- Chỉ in JSON hợp lệ.
"""

def parse_json(text: str) -> Dict[str, Any]:
    i, j = text.find("{"), text.rfind("}")
    if i >= 0 and j > i: text = text[i:j+1]
    return json.loads(text)

def save_nutrition(student_id: str, model_name: str, ctx: Dict[str,Any], obj: Dict[str,Any]) -> str:
    doc = {
        "studentId": ObjectId(student_id),
        "generatedDate": datetime.utcnow(),
        "inputData": ctx["inputData"],
        "recommendations": obj["recommendations"],
        "aiModel": model_name,
        "confidence": obj.get("confidence", 0.7),
        "appliedToMenu": False,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    rid = nutri_recs.insert_one(doc).inserted_id
    return str(rid)

def generate_single(student_id: str, period: str, engine: Literal["gemini","ollama"]) -> Dict[str,Any]:
    ctx = load_student_context(student_id, days=7)
    prompt = build_prompt_single(ctx, period)

    if engine == "gemini":
        from ai.gemini_client import generate
        raw = generate(prompt, model="gemini-2.5-flash")
        model_name = "gemini-2.5-flash"
    else:
        from ai.ollama_client import generate
        raw = generate(prompt)
        model_name = "ollama"

    data = parse_json(raw)
    rec_id = save_nutrition(student_id, model_name, ctx, data)
    return {"ok": True, "recommendationId": rec_id, "model": model_name}

def generate_for_class(class_id: str, period: str, engine: Literal["gemini","ollama"]) -> Dict[str,Any]:
    cur = students.find({"classId": ObjectId(class_id), "isActive": {"$ne": False}}, {"_id": 1})
    ids = [str(x["_id"]) for x in cur]

    groups = {"underweight": [], "normal": [], "overweight": [], "obese": []}
    items = []

    for sid in ids:
        try:
            ctx = load_student_context(sid, days=7)
            grp = ctx.get("bmiStatus") or "normal"
            groups.setdefault(grp, []).append(sid)

            prompt = build_prompt_single(ctx, period)
            if engine == "gemini":
                from ai.gemini_client import generate
                raw = generate(prompt, model="gemini-2.5-flash"); model = "gemini-2.5-flash"
            else:
                from ai.ollama_client import generate
                raw = generate(prompt); model = "ollama"

            data = parse_json(raw)
            rid = save_nutrition(sid, model, ctx, data)
            items.append({"studentId": sid, "recommendationId": rid})
        except Exception as e:
            items.append({"studentId": sid, "error": str(e)})

    return {"ok": True, "classId": class_id, "groups": groups, "items": items}

def _weekday_dates_from(start_iso: str, days: int) -> List[date]:
    d0 = datetime.fromisoformat(start_iso).date()
    out = []
    d = d0
    while len(out) < days:
        if d.weekday() in WEEKDAYS:
            out.append(d)
        d = d + timedelta(days=1)
    return out

def _group_key(ctx: Dict[str,Any]) -> Tuple[str,str]:
    bmi = (ctx.get("bmiStatus") or "normal")
    allergies = tuple(sorted((ctx["inputData"].get("allergies") or [])))
    sig = ",".join(allergies) or "no-allergy"
    return (bmi, sig)

def _group_name(bmi: str, sig: str) -> str:
    label = {
        "underweight": "nhóm suy dinh dưỡng",
        "normal":      "nhóm bình thường",
        "overweight":  "nhóm thừa cân",
        "obese":       "nhóm béo phì",
        "unknown":     "nhóm chưa rõ",
    }.get(bmi, "nhóm bình thường")
    if sig != "no-allergy": label += f" - tránh({sig})"
    return label

def _load_food_catalog(excluded_allergens: List[str]) -> List[Dict[str,Any]]:
    cur = food_items.find({
        "isActive": True,
        "allergens": {"$nin": excluded_allergens}
    }).limit(50)
    return list(cur)

def _pick_meal(items: List[Dict[str,Any]], names: List[str], qty=100):
    by_name = {i["name"].lower(): i for i in items}
    chosen = []
    for n in names:
        it = by_name.get(n.lower())
        if it: chosen.append({"foodItemId": str(it["_id"]), "quantity": qty, "name": it["name"]})
    if not chosen:
        for it in items[:3]:
            chosen.append({"foodItemId": str(it["_id"]), "quantity": qty, "name": it["name"]})
    return chosen

def _menu_from_ai_targets(ai_rec: Dict[str,Any], items: List[Dict[str,Any]]):
    sugg = [ (x.get("foodItemId") or "").strip() for x in (ai_rec.get("suggestedFoods") or []) ]
    breakfast = _pick_meal(items, sugg[:3])
    lunch     = _pick_meal(items, sugg[3:6])
    snack     = _pick_meal(items, sugg[6:8], qty=80)
    return {"breakfast":{"items":breakfast}, "lunch":{"items":lunch}, "snack":{"items":snack}}

def plan_menus_for_class(class_id: str, start_date: str, days: int, engine: Literal["gemini","ollama"]):
    cur = students.find({"classId": ObjectId(class_id), "isActive": {"$ne": False}}, {"_id":1})
    sids = [str(x["_id"]) for x in cur]

    groups: Dict[Tuple[str,str], List[str]] = {}
    ctx_map: Dict[str,Dict[str,Any]] = {}
    for sid in sids:
        try:
            ctx = load_student_context(sid, days=7)
            ctx_map[sid] = ctx
            key = _group_key(ctx) 
            groups.setdefault(key, []).append(sid)
        except Exception:
            continue

    days = max(1, min(5, int(days)))
    dates = _weekday_dates_from(start_date, days)

    previews = []
    draft_ids = []

    for (bmi, sig), members in groups.items():
        allergies = [] if sig=="no-allergy" else sig.split(",")
        catalog = _load_food_catalog(allergies)

        rep_ctx = ctx_map[members[0]]
        prompt = build_prompt_single(rep_ctx, "day")  
        if engine == "gemini":
            from ai.gemini_client import generate
            raw = generate(prompt, model="gemini-2.5-flash"); model="gemini-2.5-flash"
        else:
            from ai.ollama_client import generate
            raw = generate(prompt); model="ollama"
        ai_obj = parse_json(raw)["recommendations"]

        for d in dates:
            meals = _menu_from_ai_targets(ai_obj, catalog)

            doc = {
                "type": "menu_draft",
                "classId": ObjectId(class_id),
                "studentGroup": {
                    "bmi": bmi, "allergySig": sig, "name": _group_name(bmi, sig), "studentIds": [ObjectId(x) for x in members]
                },
                "date": datetime(d.year, d.month, d.day),
                "meals": meals,
                "aiModel": model,
                "generatedDate": datetime.utcnow(),
                "appliedToMenu": False,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
            }
            rid = nutri_recs.insert_one(doc).inserted_id
            draft_ids.append(str(rid))

            previews.append({
                "recId": str(rid),
                "date": d.isoformat(),
                "groupName": _group_name(bmi, sig),
                "studentCount": len(members),
                "meals": meals
            })

    return {
        "ok": True,
        "classId": class_id,
        "startDate": start_date,
        "days": len(dates),
        "draftIds": draft_ids,
        "previews": previews,
        "note": "Các bản nháp đã lưu vào nutritional_recommendations.type=menu_draft. Dùng API save để đẩy sang menus."
    }

def plan_menus_for_student(student_id: str, start_date: str, days: int, engine: Literal["gemini","ollama"]):
    ctx = load_student_context(student_id, days=7)
    allergies = ctx["inputData"].get("allergies") or []
    catalog = _load_food_catalog(allergies)

    days = max(1, min(5, int(days)))
    dates = _weekday_dates_from(start_date, days)

    prompt = build_prompt_single(ctx, "day")
    if engine == "gemini":
        from ai.gemini_client import generate
        raw = generate(prompt, model="gemini-2.5-flash"); model="gemini-2.5-flash"
    else:
        from ai.ollama_client import generate
        raw = generate(prompt); model="ollama"
    ai_obj = parse_json(raw)["recommendations"]

    previews, draft_ids = [], []
    for d in dates:
        meals = _menu_from_ai_targets(ai_obj, catalog)
        doc = {
            "type": "menu_draft",
            "classId": ctx.get("studentClassId"),
            "studentGroup": {
                "bmi": ctx.get("bmiStatus") or "normal",
                "allergySig": ",".join(allergies) or "no-allergy",
                "name": f"bé {ctx['student'].get('fullName') or 'không tên'}",
                "studentIds": [ObjectId(student_id)]
            },
            "date": datetime(d.year, d.month, d.day),
            "meals": meals,
            "aiModel": model,
            "generatedDate": datetime.utcnow(),
            "appliedToMenu": False,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        rid = nutri_recs.insert_one(doc).inserted_id
        draft_ids.append(str(rid))
        previews.append({
            "recId": str(rid),
            "date": d.isoformat(),
            "groupName": f"bé {ctx['student'].get('fullName') or 'không tên'}",
            "studentCount": 1,
            "meals": meals
        })
    return {"ok": True, "studentId": student_id, "startDate": start_date, "days": len(dates),
            "draftIds": draft_ids, "previews": previews}