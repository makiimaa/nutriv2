
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from services.nutrition_planner import plan_menus_for_class, plan_menus_for_student
from datetime import datetime

router = APIRouter(prefix="/nutrition", tags=["nutrition"])

EngineStr = Literal["gemini", "ollama", "local"]  

def _validate_iso_date(s: str) -> None:
    try:
        datetime.fromisoformat(s)
    except Exception:
        raise HTTPException(status_code=422, detail="startDate phải là YYYY-MM-DD")

class PlanMenusReq(BaseModel):
    classId: str = Field(..., description="Mongo ObjectId của lớp")
    startDate: str = Field(..., description="YYYY-MM-DD")
    days: int = Field(..., ge=1, le=7, description="Số ngày (1..7)")
    engine: EngineStr = Field("gemini", description='"gemini" | "ollama" | "local"')
    groupId: Optional[str] = Field(None, description="ID phân nhóm đã lưu (tùy chọn)")

    @validator("startDate")
    def _vd_start_date(cls, v):
        _validate_iso_date(v)
        return v

class PlanStudentReq(BaseModel):
    studentId: str = Field(..., description="Mongo ObjectId của học sinh")
    startDate: str = Field(..., description="YYYY-MM-DD")
    days: int = Field(..., ge=1, le=7)
    engine: EngineStr = Field("gemini")

    @validator("startDate")
    def _vd_start_date(cls, v):
        _validate_iso_date(v)
        return v

@router.post("/plan-menus")
def plan_menus_ep(req: PlanMenusReq):
    data = plan_menus_for_class(
        class_id=req.classId,
        start_date=req.startDate,
        days=req.days,
        engine=req.engine,
        group_id=req.groupId,
    )
    if not data.get("ok"):
        raise HTTPException(status_code=400, detail=data.get("message", "Không sinh được menu"))
    return data

@router.post("/plan-student")
def plan_student_ep(req: PlanStudentReq):
    data = plan_menus_for_student(
        student_id=req.studentId,
        start_date=req.startDate,
        days=req.days,
        engine=req.engine,
    )
    if not data.get("ok"):
        raise HTTPException(status_code=400, detail=data.get("message", "Không sinh được menu"))
    return data
