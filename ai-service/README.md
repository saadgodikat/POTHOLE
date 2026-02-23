# 🕳️ RoadWatch AI — Pothole Detection Service

YOLOv8-powered pothole detection with **3-level danger classification**.

## Danger Levels

| Level | Priority | Meaning |
|---|---|---|
| 🔴 **Critical** | 1 | Large, high-confidence pothole — immediate danger |
| 🟡 **Moderate** | 2 | Medium detection — needs attention soon |
| 🟢 **Minor** | 3 | Small / low-confidence — monitor |

The system **always prioritises the most dangerous** pothole in an image.

## Model

Default: [`keremberke/yolov8n-pothole-detection`](https://huggingface.co/keremberke/yolov8n-pothole-detection) — a YOLOv8n model fine-tuned specifically for pothole detection. Auto-downloads from HuggingFace Hub on first run.

**Alternatives** (set via `MODEL_PATH` env var):
- `keremberke/yolov8s-pothole-detection` — larger, more accurate
- `keremberke/yolov8n-road-damage-detection` — general road damage (4 classes)
- `./models/your_model.pt` — local custom model

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Test the model offline
python test_detector.py

# 4. Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health + model info |
| `GET` | `/model-info` | Detailed model metadata |
| `POST` | `/detect` | Upload image → get pothole detection |

Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)

## Test Script

```bash
python test_detector.py
```

Runs the model on all images in `test_images/` and prints results:
```
══════════════════════════════════════════════════════════════════════
  RoadWatch AI — Pothole Detection Test
══════════════════════════════════════════════════════════════════════

  Model:        keremberke/yolov8n-pothole-detection
  Classes:      ['pothole']
  Danger Levels: ['critical', 'moderate', 'minor']

──────────────────────────────────────────────────────────────────────
  Testing: pothole_severe.png
──────────────────────────────────────────────────────────────────────
  📌 PRIMARY DETECTION (Most Dangerous):
  [1] 🔴 POTHOLE
      Confidence:    87.5%
      Danger Level:  critical — Critical — Immediate Danger
      Priority:      1
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MODEL_PATH` | `keremberke/yolov8n-pothole-detection` | HuggingFace Hub model or local `.pt` path |
| `CONFIDENCE_THRESHOLD` | `0.30` | Minimum confidence for detection |

## Response Example

```json
{
  "defect_type": "pothole",
  "confidence": 0.8752,
  "danger_level": "critical",
  "danger_label": "Critical — Immediate Danger",
  "danger_priority": 1,
  "severity": "high",
  "bbox": [120.5, 200.3, 450.1, 380.7],
  "is_valid": true,
  "all_detections": [...]
}
```
