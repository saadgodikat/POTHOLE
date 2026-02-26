import os, logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from detector import load_model, detect, model_info

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Startup] Pre-loading pothole detection model…")
    load_model()
    logger.info("[Startup] Model ready ✓")
    yield
    logger.info("[Shutdown] AI service stopped.")


app = FastAPI(
    title="StreetIntel AI — Pothole Detection Service",
    description=(
        "YOLOv8 pothole detection with **3-level danger classification**.\n\n"
        "Danger levels (prioritised most dangerous first):\n"
        "- 🔴 **Critical** — Large, high-confidence potholes (immediate danger)\n"
        "- 🟡 **Moderate** — Medium detections (needs attention soon)\n"
        "- 🟢 **Minor** — Small / low-confidence detections (monitor)\n\n"
        "Model: `keremberke/yolov8n-pothole-detection` (HuggingFace Hub)"
    ),
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ── Response schemas ──────────────────────────────────────────────────────────
class SingleDetection(BaseModel):
    defect_type:     str
    raw_class:       str
    confidence:      float
    danger_level:    str            # "critical" | "moderate" | "minor"
    danger_label:    str            # human-readable label
    danger_priority: int            # 1 (most dangerous) → 3 (least)
    severity:        str            # legacy: "low" | "medium" | "high"
    bbox:            List[float]

class DetectionResult(BaseModel):
    defect_type:     Optional[str]
    raw_class:       Optional[str]
    confidence:      float
    danger_level:    Optional[str]
    danger_label:    Optional[str]
    danger_priority: Optional[int]
    severity:        Optional[str]
    bbox:            Optional[List[float]]
    is_valid:        bool
    all_detections:  List[SingleDetection]

class HealthResponse(BaseModel):
    status:       str
    model:        str
    class_names:  List[str]
    danger_levels: List[str]

class ModelInfoResponse(BaseModel):
    model_path:           str
    class_names:          List[str]
    confidence_threshold: float
    danger_levels:        List[str]


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["System"])
def health():
    info = model_info()
    return {
        "status": "ok",
        "model": info["model_path"],
        "class_names": info["class_names"],
        "danger_levels": info["danger_levels"],
    }


@app.get("/model-info", response_model=ModelInfoResponse, tags=["System"])
def get_model_info():
    """Return metadata about the currently loaded detection model."""
    return model_info()


@app.post("/detect", response_model=DetectionResult, tags=["Detection"])
async def detect_defect(file: UploadFile = File(...)):
    """
    Detect potholes in an uploaded image using a fine-tuned YOLOv8 model.

    **Danger Levels** (most dangerous first):
    - 🔴 `critical` — Large, high-confidence pothole (priority 1)
    - 🟡 `moderate` — Medium detection (priority 2)
    - 🟢 `minor` — Small / low-confidence (priority 3)

    The primary result is always the **most dangerous** detection found.
    All detections are returned in `all_detections`, sorted by danger priority.

    **Severity** (legacy field): maps to `high` / `medium` / `low` for backward compatibility.
    """
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported type: {file.content_type}. Use JPEG, PNG, or WebP.")

    try:
        image_bytes = await file.read()
        logger.info(f"[Detect] {file.filename} — {len(image_bytes)/1024:.1f} KB")

        result = detect(image_bytes)

        threshold = float(os.getenv("CONFIDENCE_THRESHOLD", "0.15"))
        result["is_valid"] = result["confidence"] >= threshold

        return result

    except Exception as e:
        logger.error(f"[Detect] Error: {e}", exc_info=True)
        raise HTTPException(500, f"Detection failed: {str(e)}")
