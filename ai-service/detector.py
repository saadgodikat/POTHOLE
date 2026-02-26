from ultralytics import YOLO
from huggingface_hub import hf_hub_download
from PIL import Image
import io, os, logging

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
# Model loading priority (highest to lowest):
#   1. models/pothole_finetuned.pt — your own fine-tuned model (from train.py)
#   2. MODEL_PATH env var          — explicit override
#   3. HF_REPO/HF_FILENAME         — HuggingFace pretrained model (default)
#   4. yolov8n.pt                  — COCO fallback
LOCAL_TRAINED_MODEL = os.path.join(os.path.dirname(__file__), "models", "pothole_finetuned.pt")
HF_REPO     = os.getenv("HF_REPO", "Harisanth/Pothole-Finetuned-YOLOv8")
HF_FILENAME = os.getenv("HF_FILENAME", "best.pt")
MODEL_PATH  = os.getenv("MODEL_PATH", "")  # If set, overrides everything

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.15"))

# ── Three-level danger classification ─────────────────────────────────────────
# Potholes are classified into 3 danger levels based on confidence + bbox area:
#   🔴 CRITICAL  — Large, high-confidence potholes (immediate danger)
#   🟡 MODERATE  — Medium detections (needs attention soon)
#   🟢 MINOR     — Small / low-confidence detections (monitor)
#
# The system ALWAYS prioritises the most dangerous pothole first.

DANGER_LEVELS = {
    "critical": {"color": "red",    "priority": 1, "label": "Critical — Immediate Danger"},
    "moderate": {"color": "yellow", "priority": 2, "label": "Moderate — Needs Attention"},
    "minor":    {"color": "green",  "priority": 3, "label": "Minor — Monitor"},
}

# Confidence thresholds for danger classification
DANGER_THRESHOLDS = {
    "confidence": {"critical": 0.75, "moderate": 0.50},  # >= 0.75 = critical, >= 0.50 = moderate, else minor
    "area_ratio": {"critical": 0.08, "moderate": 0.03},  # bbox area / image area ratios
}

# ── Class label mapping (handles pothole-only & RDD2022 models) ──────────────
CLASS_MAP = {
    # Pothole-specific model classes
    "pothole":  "pothole",
    "Pothole":  "pothole",
    # RDD2022 backward compatibility
    "D00": "longitudinal_crack",
    "D10": "transverse_crack",
    "D20": "alligator_crack",
    "D40": "pothole",
}

_model      = None
_model_used = None   # Track which model is actually loaded


def _download_hf_model() -> str:
    """Download model weights from HuggingFace Hub and return the local path."""
    logger.info(f"[Detector] Downloading model from HuggingFace: {HF_REPO}/{HF_FILENAME}")
    try:
        local_path = hf_hub_download(repo_id=HF_REPO, filename=HF_FILENAME)
        logger.info(f"[Detector] ✅ Downloaded to: {local_path}")
        return local_path
    except Exception as e:
        logger.warning(f"[Detector] ❌ HuggingFace download failed: {e}")
        raise


def load_model() -> YOLO:
    """
    Load the best available YOLOv8 pothole detection model.

    Loading priority:
      1. models/pothole_finetuned.pt (your fine-tuned model from train.py)  ← BEST
      2. MODEL_PATH env var (explicit local override)
      3. HuggingFace Hub download (Harisanth pretrained)
      4. yolov8n.pt COCO fallback
    """
    global _model, _model_used
    if _model is None:
        # Priority 1: Custom fine-tuned model
        if os.path.exists(LOCAL_TRAINED_MODEL):
            model_path = LOCAL_TRAINED_MODEL
            source = "custom fine-tuned"
        # Priority 2: Explicit MODEL_PATH override
        elif MODEL_PATH and os.path.exists(MODEL_PATH):
            model_path = MODEL_PATH
            source = "MODEL_PATH env"
        else:
            model_path = None
            source = None

        if model_path:
            logger.info(f"[Detector] Loading {source} model: {model_path}")
            try:
                _model = YOLO(model_path)
                _model_used = model_path
            except Exception as e:
                logger.warning(f"[Detector] Failed to load {source} model: {e}")
                _model = None

        # Priority 3: HuggingFace download
        if _model is None:
            try:
                hf_path = _download_hf_model()
                _model = YOLO(hf_path)
                _model_used = f"hf://{HF_REPO}/{HF_FILENAME}"
            except Exception:
                pass

        # Priority 4: COCO fallback
        if _model is None:
            fallback = "yolov8n.pt"
            logger.warning(f"[Detector] Falling back to {fallback} (COCO — not pothole-specific)")
            _model = YOLO(fallback)
            _model_used = fallback

        class_names = list(_model.names.values()) if _model.names else []
        logger.info(f"[Detector] ✅ Model ready [{_model_used}] — Classes: {class_names}")

    return _model


def model_info() -> dict:
    """Return metadata about the currently loaded model."""
    model = load_model()
    return {
        "model_path": _model_used or MODEL_PATH or f"hf://{HF_REPO}/{HF_FILENAME}",
        "is_custom_trained": os.path.exists(LOCAL_TRAINED_MODEL),
        "class_names": list(model.names.values()) if model.names else [],
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "danger_levels": list(DANGER_LEVELS.keys()),
    }


def _compute_bbox_area(bbox: list) -> float:
    """Compute area of a bounding box [x1, y1, x2, y2]."""
    if not bbox or len(bbox) < 4:
        return 0.0
    return max(0, bbox[2] - bbox[0]) * max(0, bbox[3] - bbox[1])


def _classify_danger(confidence: float, bbox: list, image_width: int, image_height: int) -> str:
    """
    Classify pothole danger level using BOTH confidence score AND relative size.

    Three levels (prioritised most dangerous first):
      🔴 critical — high confidence AND/OR large pothole relative to image
      🟡 moderate — medium confidence or medium-sized pothole
      🟢 minor   — low confidence, small pothole
    """
    bbox_area = _compute_bbox_area(bbox)
    image_area = max(image_width * image_height, 1)  # avoid div by zero
    area_ratio = bbox_area / image_area

    # Score combines confidence and size for holistic danger assessment
    # Confidence is weighted more (70%) since the model is trained for this
    danger_score = (confidence * 0.7) + (min(area_ratio / 0.15, 1.0) * 0.3)

    if confidence >= DANGER_THRESHOLDS["confidence"]["critical"] or danger_score >= 0.70:
        return "critical"
    elif confidence >= DANGER_THRESHOLDS["confidence"]["moderate"] or danger_score >= 0.40:
        return "moderate"
    return "minor"


def detect(image_bytes: bytes) -> dict:
    """
    Run YOLOv8 pothole detection inference on image bytes.

    Returns detections sorted by DANGER LEVEL (most dangerous first):
    {
        "defect_type":     str | None,    # "pothole" (or crack type for RDD2022)
        "raw_class":       str | None,    # original model class label
        "confidence":      float,         # 0.0–1.0
        "danger_level":    str | None,    # "critical" | "moderate" | "minor"
        "danger_label":    str | None,    # human-readable danger description
        "danger_priority": int | None,    # 1 (most dangerous) → 3 (least)
        "severity":        str | None,    # legacy: "low" | "medium" | "high"
        "bbox":            list | None,   # [x1, y1, x2, y2]
        "all_detections":  list           # all boxes above threshold, sorted by danger
    }
    """
    model = load_model()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_width, img_height = image.size

    results = model.predict(source=image, conf=CONFIDENCE_THRESHOLD, verbose=False)

    if not results or len(results[0].boxes) == 0:
        return {
            "defect_type":     None,
            "raw_class":       None,
            "confidence":      0.0,
            "danger_level":    None,
            "danger_label":    None,
            "danger_priority": None,
            "severity":        None,
            "bbox":            None,
            "all_detections":  [],
        }

    boxes = results[0].boxes

    # Build all detections list with danger classification
    all_detections = []
    for i in range(len(boxes)):
        conf      = float(boxes.conf[i])
        class_id  = int(boxes.cls[i])
        raw_label = results[0].names[class_id]
        defect    = CLASS_MAP.get(raw_label, raw_label.lower())
        bbox      = [round(v, 2) for v in boxes.xyxy[i].tolist()]

        # Classify danger level
        danger = _classify_danger(conf, bbox, img_width, img_height)
        danger_info = DANGER_LEVELS[danger]

        # Legacy severity mapping (kept for backward compatibility with backend)
        legacy_severity = {"critical": "high", "moderate": "medium", "minor": "low"}

        all_detections.append({
            "defect_type":     defect,
            "raw_class":       raw_label,
            "confidence":      round(conf, 4),
            "danger_level":    danger,
            "danger_label":    danger_info["label"],
            "danger_priority": danger_info["priority"],
            "severity":        legacy_severity[danger],
            "bbox":            bbox,
        })

    # ⚠️  Sort by DANGER PRIORITY first (1=critical), then by confidence descending
    # This ensures the MOST DANGEROUS pothole is always returned as the primary result
    all_detections.sort(key=lambda x: (x["danger_priority"], -x["confidence"]))
    best = all_detections[0]

    logger.info(
        f"[Detector] 🎯 Best: {best['defect_type']} ({best['raw_class']}) "
        f"conf={best['confidence']:.2%} danger={best['danger_level'].upper()} "
        f"({best['danger_label']}) | total detections={len(all_detections)}"
    )

    return {
        "defect_type":     best["defect_type"],
        "raw_class":       best["raw_class"],
        "confidence":      best["confidence"],
        "danger_level":    best["danger_level"],
        "danger_label":    best["danger_label"],
        "danger_priority": best["danger_priority"],
        "severity":        best["severity"],
        "bbox":            best["bbox"],
        "all_detections":  all_detections,
    }
