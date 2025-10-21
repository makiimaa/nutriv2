
from typing import Literal
from services.nutrition_service import generate_single, generate_for_class, plan_menus_for_class, plan_menus_for_student
from bson import ObjectId
from datetime import datetime
from common.db import nutri_recs, students
from fastapi import APIRouter, Body, Query, HTTPException
from typing import Literal
from services.nutrition_service import (
    generate_single, generate_for_class,
    plan_menus_for_class, plan_menus_for_student
)


from datetime import datetime

def _stringify(obj):
    """Đệ quy: ObjectId -> str, datetime -> iso, list/dict -> map lại."""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        
        return obj.isoformat()
    if isinstance(obj, list):
        return [_stringify(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _stringify(v) for k, v in obj.items()}
    return obj


router = APIRouter()

@router.post("/generate")
def generate(
    studentId: str = Body(...),
    period: Literal["day","week"] = Body("day"),
    engine: Literal["gemini","ollama"] = Body("gemini"),
):
    return generate_single(studentId, period, engine)

@router.post("/generate-class")
def generate_class(
    classId: str = Body(...),
    period: Literal["day","week"] = Body("day"),
    engine: Literal["gemini","ollama"] = Body("gemini"),
):
    return generate_for_class(classId, period, engine)

@router.get("/latest")
def latest(studentId: str):
    d = nutri_recs.find_one({"studentId": ObjectId(studentId)}, sort=[("generatedDate",-1)])
    if not d:
        return {"ok": False, "message": "No recommendation"}
    out = _stringify(d)
    out["_id"] = str(d["_id"])
    out["studentId"] = str(d.get("studentId", "")) if d.get("studentId") else None
    return {"ok": True, "data": out}

@router.get("/list")
def list_rec(studentId: str, limit: int = 10):
    cur = nutri_recs.find({"studentId": ObjectId(studentId)}).sort("generatedDate",-1).limit(limit)
    out = []
    for d in cur:
        x = _stringify(d)
        x["_id"] = str(d["_id"])
        x["studentId"] = str(d.get("studentId", "")) if d.get("studentId") else None
        out.append(x)
    return {"ok": True, "items": out}

@router.get("/detail/{rec_id}")
def detail(rec_id: str):
    try:
        oid = ObjectId(rec_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")

    doc = nutri_recs.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    
    safe = _stringify(doc)
    
    safe["_id"] = str(doc["_id"])
    if "studentId" in doc:
        safe["studentId"] = str(doc["studentId"])

    return {"ok": True, "item": safe}

@router.post("/plan-menus")
def plan_menus(body: dict = Body(...)):
    class_id = body.get("classId")
    if not class_id:
        raise HTTPException(status_code=400, detail="Missing classId")
    start_date = body.get("startDate") or datetime.utcnow().date().isoformat()
    days = int(body.get("days") or 1)
    engine: Literal["gemini","ollama"] = body.get("engine","gemini")
    return plan_menus_for_class(class_id, start_date, days, engine)

@router.post("/plan-student")
def plan_student(body: dict = Body(...)):
    student_id = body.get("studentId")
    if not student_id:
        raise HTTPException(status_code=400, detail="Missing studentId")
    start_date = body.get("startDate") or datetime.utcnow().date().isoformat()
    days = int(body.get("days") or 1)
    engine: Literal["gemini","ollama"] = body.get("engine","gemini")
    return plan_menus_for_student(student_id, start_date, days, engine)

@router.get("/drafts")
def list_menu_drafts(classId: str | None = None, page: int = Query(1, ge=1), pageSize: int = Query(10, ge=1, le=50)):
    q = {"type": "menu_draft"}
    if classId:
        q["classId"] = ObjectId(classId)
    total = nutri_recs.count_documents(q)
    cur = (nutri_recs.find(q).sort([("date",-1),("_id",-1)])
           .skip((page-1)*pageSize).limit(pageSize))
    out=[]
    for d in cur:
        d["_id"]=str(d["_id"])
        if d.get("classId"): d["classId"]=str(d["classId"])
        sg=d.get("studentGroup") or {}
        sg["studentIds"]=[str(x) for x in sg.get("studentIds",[])]
        d["studentGroup"]=sg
        out.append(d)
    return {"ok": True, "page": page, "pageSize": pageSize, "total": total, "items": out}