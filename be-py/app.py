# be-py/app.py
from fastapi import FastAPI
from routers.attendance import router as attendance_router 
from routers.nutrition import router as nutrition_router
from routers.nutrition_group import router as nutrition_group_router
from fastapi.routing import APIRoute

app = FastAPI(title="nuv2-ai-gateway")

app.include_router(attendance_router, prefix="/face", tags=["face"])
app.include_router(nutrition_router,  prefix="/nutrition", tags=["nutrition"])
app.include_router(nutrition_group_router)

for r in app.routes:
    if isinstance(r, APIRoute):
        print("FASTAPI ROUTE:", r.path, r.methods)

# run:
# uvicorn app:app --reload --port 8001