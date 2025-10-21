# be-py/routers/nutrition_group.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from services.nutrition_group import analyze_grouping, save_grouping, list_groupings, get_grouping, regen_grouping

router = APIRouter(prefix="/nutrition/group", tags=["nutrition-group"])

class AnalyzeReq(BaseModel):
    classId: str
    groupCount: Optional[int] = Field(None, ge=1, le=5)
    engine: Optional[str] = Field("gemini", pattern="^(gemini|ollama)$")
    teacherHint: Optional[str] = None

@router.post("/analyze")
def analyze_ep(req: AnalyzeReq):
    data = analyze_grouping(
        class_id=req.classId,
        group_count=req.groupCount,
        engine=req.engine or "gemini",
        teacher_hint=req.teacherHint or "",
    )
    return data  
class SaveReq(BaseModel):
    classId: str
    name: Optional[str] = None
    engine: str = Field("gemini", pattern="^(gemini|ollama)$")
    groupCount: int = Field(..., ge=1, le=5)
    teacherHint: Optional[str] = None
    groups: List[Dict[str, Any]]

@router.post("/save")
def save_ep(req: SaveReq):
    ok, item_id = save_grouping(req.dict())
    if not ok:
        raise HTTPException(status_code=400, detail="Save failed")
    return {"ok": True, "id": item_id}

@router.get("/list")
def list_ep(classId: str, page: int = Query(1, ge=1), pageSize: int = Query(10, ge=1, le=100)):
    return list_groupings(classId, page, pageSize)  

@router.get("/{id}")
def detail_ep(id: str):
    item = get_grouping(id)
    if not item:
        raise HTTPException(status_code=404, detail="Not Found")
    return {"ok": True, "item": item}

@router.post("/{id}/regen")
def regen_ep(id: str):
    data = regen_grouping(id)
    if not data:
        raise HTTPException(status_code=404, detail="Not Found")
    return data
