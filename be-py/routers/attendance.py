# be-py/routers/attendance.py
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
import numpy as np
import cv2, base64, json
from insightface.app import FaceAnalysis

face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))

router = APIRouter()

def _read_image_to_bgr(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)  
    return img

def _best_face_embedding(img_bgr: np.ndarray) -> Optional[np.ndarray]:
    faces = face_app.get(img_bgr)
    if not faces:
        return None
    f = max(faces, key=lambda x: getattr(x, "det_score", 0.0))
    emb = getattr(f, "normed_embedding", None)
    return emb

def _decode_embedding(b64: str) -> Optional[np.ndarray]:
    try:
        buf = base64.b64decode(b64.encode("ascii"))
        return np.frombuffer(buf, dtype=np.float32)
    except Exception:
        return None

def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))

@router.get("/health")
def health():
    return {"ok": True, "service": "attendance", "model": "buffalo_l"}

@router.post("/embed")
async def embed(image: UploadFile = File(...)):
    try:
        content = await image.read()
        img = _read_image_to_bgr(content)
        emb = _best_face_embedding(img)
        if emb is None:
            return JSONResponse({"ok": False, "message": "Không phát hiện khuôn mặt"}, status_code=200)
        b64 = base64.b64encode(emb.astype(np.float32).tobytes()).decode("ascii")
        return {"ok": True, "embedding": b64}
    except Exception as e:
        return JSONResponse({"ok": False, "message": str(e)}, status_code=500)

@router.post("/match")
async def match(
    image: UploadFile = File(...),
    gallery: str = Form(...),             
    threshold: float = Form(0.45),        
):
    try:
        content = await image.read()
        img = _read_image_to_bgr(content)
        probe = _best_face_embedding(img)
        if probe is None:
            return {"ok": False, "message": "Không phát hiện khuôn mặt"}

        gal: List[dict] = json.loads(gallery)
        best_id, best_sim = None, -1.0
        for item in gal:
            sid = item.get("studentId")
            emb_b64 = item.get("embedding") or ""
            gal_emb = _decode_embedding(emb_b64)
            if gal_emb is None or gal_emb.shape[0] == 0:
                continue
            sim = _cosine(probe, gal_emb)
            if sim > best_sim:
                best_sim, best_id = sim, sid

        if best_id is None or best_sim < threshold:
            return {"ok": False, "message": "Không có ai vượt ngưỡng"}

        return {
            "ok": True,
            "studentId": best_id,
            "similarity": best_sim * 100.0,  
        }
    except Exception as e:
        return JSONResponse({"ok": False, "message": str(e)}, status_code=500)

@router.post("/match_many")
async def match_many(
    image: UploadFile = File(...),
    gallery: str = Form(...),              
    threshold: float = Form(0.45),
):
    try:
        content = await image.read()
        img = _read_image_to_bgr(content)
        faces = face_app.get(img)
        if not faces:
            return {"ok": False, "message": "Không phát hiện khuôn mặt"}

        gal: List[dict] = json.loads(gallery)
        parsed = []
        gal_vecs = []
        for it in gal:
            sid = it.get("studentId")
            emb_b64 = it.get("embedding") or ""
            vec = _decode_embedding(emb_b64)
            if vec is not None and vec.shape[0] > 0:
                gal_vecs.append((sid, vec))

        for f in faces:
            emb = getattr(f, "normed_embedding", None)
            if emb is None:
                continue
            # so khớp
            best_id, best_sim = None, -1.0
            cands = []
            for sid, vec in gal_vecs:
                sim = _cosine(emb, vec)
                cands.append({"studentId": sid, "similarity": sim * 100.0})
                if sim > best_sim:
                    best_sim, best_id = sim, sid

            box = getattr(f, "bbox", None)
            box_list = list(map(float, box)) if box is not None else []

            parsed.append({
                "box": box_list,
                "best": (best_id and best_sim >= threshold) and {
                    "studentId": best_id,
                    "similarity": best_sim * 100.0
                } or None,
                "candidates": sorted(cands, key=lambda x: x["similarity"], reverse=True)[:5]
            })

        return {"ok": True, "faces": parsed}
    except Exception as e:
        return JSONResponse({"ok": False, "message": str(e)}, status_code=500)
