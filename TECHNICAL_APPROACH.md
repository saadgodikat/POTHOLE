# 🚦 RoadWatch — Technical Approach

> A comprehensive deep-dive into the architecture, design decisions, and data flow of the RoadWatch AI Road Inspection System.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Layer 1 — Mobile App (React Native / Expo)](#3-layer-1--mobile-app-react-native--expo)
4. [Layer 2 — Backend API (Node.js / Express)](#4-layer-2--backend-api-nodejs--express)
5. [Layer 3 — AI Detection Service (Python / FastAPI / YOLOv8)](#5-layer-3--ai-detection-service-python--fastapi--yolov8)
6. [Layer 4 — Database (SQLite / better-sqlite3)](#6-layer-4--database-sqlite--better-sqlite3)
7. [End-to-End Data Flow](#7-end-to-end-data-flow)
8. [Key Design Decisions](#8-key-design-decisions)
9. [Technology Stack Summary](#9-technology-stack-summary)
10. [Phase Roadmap](#10-phase-roadmap)

---

## 1. System Overview

RoadWatch is a **three-tier distributed system** that lets citizens report road defects (potholes, cracks, surface damage) directly from their smartphones. The reported images are automatically analysed by a fine-tuned YOLOv8 object-detection model, and the results — defect type, confidence score, severity rating, and bounding box — are persisted in a SQLite database for downstream administration.

**Core problem solved:**  
Manual road inspection is slow, costly, and geographically incomplete. RoadWatch crowdsources defect discovery through a mobile app, automates AI classification in the background, and produces structured, geo-tagged records that can feed into a city-level work-order system.

---

## 2. Architecture

```
┌─────────────────────────────────────────────┐
│         MOBILE APP (React Native / Expo)    │
│  Camera → Image Compress → GPS → HTTP POST  │
└────────────────────┬────────────────────────┘
                     │  POST /api/report
                     │  multipart/form-data (image + GPS)
                     ▼
┌─────────────────────────────────────────────┐
│        BACKEND API (Node.js / Express)      │
│  Multer → SQLite Insert → 201 Response      │
│           ↘ async fire-and-forget           │
└────────────────────┬────────────────────────┘
                     │  POST /detect
                     │  multipart/form-data (image)
                     ▼
┌─────────────────────────────────────────────┐
│    AI SERVICE (Python / FastAPI / YOLOv8)   │
│  Load Image → YOLOv8 Inference → JSON       │
└────────────────────┬────────────────────────┘
                     │  {defect_type, confidence, severity, bbox}
                     ▼
┌─────────────────────────────────────────────┐
│          DATABASE (SQLite / better-sqlite3) │
│  reports table ← UPDATE (defect + severity) │
└─────────────────────────────────────────────┘
```

All three services run independently as separate processes and communicate over localhost HTTP. This separation-of-concerns means any layer can be scaled or replaced without touching the others.

---

## 3. Layer 1 — Mobile App (React Native / Expo)

### Technology
| Concern | Library |
|---|---|
| Framework | React Native + Expo SDK |
| Navigation | `@react-navigation/native` + Stack Navigator |
| Camera | `expo-camera` |
| Image Compression | `expo-image-manipulator` |
| GPS / Location | `expo-location` |
| HTTP Client | `axios` |
| Map Picker | `react-native-maps` |

### Screen Architecture

```
App.js (Stack Navigator)
  ├── HomeScreen          — dashboard / entry point
  ├── CaptureScreen       — camera live view + photo capture
  ├── ReportScreen        — review photo, edit description, submit
  ├── MapPickerScreen     — manual pin-drop location override
  ├── ReportsListScreen   — paginated list of all submitted reports
  └── SubmissionResultScreen — success/failure feedback after submit
```

### Image Pipeline

1. User opens **CaptureScreen** → `expo-camera` provides a live camera preview.
2. User taps capture → raw photo saved to local cache.
3. **`expo-image-manipulator`** resizes image to **1080 px wide at 75% JPEG quality**, reducing the payload from ~4 MB to ~200–400 KB without a visible quality loss.
4. **`expo-location`** captures `latitude` and `longitude` (auto from GPS). Alternatively, the user can tap **"Pick on Map"** to open `MapPickerScreen` and drop a pin for cases where GPS is inaccurate or they want to report a previously seen defect.

### Network Layer (`src/services/api.js`)

A centralised **axios** instance with a 30-second timeout wraps all API calls:

```js
const api = axios.create({ baseURL: BASE_URL, timeout: 30000 });
```

Three exported functions:

| Function | Method | Endpoint |
|---|---|---|
| `submitReport()` | POST | `/api/report` |
| `fetchReports()` | GET | `/api/reports` |
| `fetchReport(id)` | GET | `/api/reports/:id` |

`submitReport()` builds a `multipart/form-data` payload, attaching the image as a binary blob using the React Native file URI format:
```js
formData.append('image', { uri: imageUri, name: 'report.jpg', type: 'image/jpeg' });
```

---

## 4. Layer 2 — Backend API (Node.js / Express)

### Technology
| Concern | Library |
|---|---|
| Server | Express 4 |
| File Upload | `multer` (disk storage) |
| Database ORM | `better-sqlite3` (synchronous, zero-overhead) |
| HTTP Client (to AI) | `axios` + `form-data` |
| File Naming | `uuid` (v4) |
| Environment | `dotenv` |

### Upload Handling (`reportRoutes.js`)

**Multer** is configured with:
- **Disk storage** → files land directly in `./uploads/` as `<uuid>.<ext>`, preventing filename collisions.
- **File filter** → only `image/jpeg`, `image/png`, `image/webp` are accepted.
- **Size limit** → 10 MB hard cap.

### Report Submission Flow — Non-blocking Design

This is the most critical design decision in the backend:

```
┌── SYNCHRONOUS PATH (returns 201 in < 50 ms) ──────────────────────┐
│  1. Validate image + GPS                                           │
│  2. Save image to /uploads/<uuid>.jpg                              │
│  3. INSERT into reports (defect_type=NULL, status='red')           │
│  4. Return 201 { report_id, image_url, ... }                       │
└────────────────────────────────────────────────────────────────────┘
         ↓ fire-and-forget (Promise, no await)
┌── ASYNC BACKGROUND PATH (runs ~1–5 s later) ──────────────────────┐
│  5. detectDefect(imagePath) → POST image to Python /detect         │
│  6. Receive { defect_type, confidence, severity, bbox }            │
│  7. UPDATE reports SET defect_type=?, ai_confidence=?, severity=?  │
└────────────────────────────────────────────────────────────────────┘
```

The user gets an **immediate 201 response** and the mobile app can proceed. The YOLOv8 inference (which can take 1–5 seconds) happens in the background via a detached Promise chain. When the user later does a pull-to-refresh on the reports list, the AI fields are already populated.

### AI Client (`src/services/aiService.js`)

```js
const form = new FormData();
form.append('file', fs.createReadStream(imagePath));
const response = await axios.post(`${AI_SERVICE_URL}/detect`, form, {
  headers: form.getHeaders(),
  timeout: 60000,   // 60 s — first call may download the model weights
});
```

A 60-second timeout is used because the **first call** to the AI service triggers an automatic model download from HuggingFace Hub (~6 MB). Subsequent calls return in < 2 seconds.

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/report` | — | Submit report (multipart) |
| `GET` | `/api/reports` | — | List reports (paginated, filterable by status) |
| `GET` | `/api/reports/:id` | — | Get single report |
| `PATCH` | `/api/reports/:id/status` | Admin | Update status (red → orange → green) |
| `GET` | `/health` | — | Liveness check |

---

## 5. Layer 3 — AI Detection Service (Python / FastAPI / YOLOv8)

### Technology
| Concern | Library |
|---|---|
| API Framework | FastAPI + Uvicorn |
| ML Inference | Ultralytics YOLOv8 |
| Image Processing | Pillow (PIL) |
| Model Source | `keremberke/yolov8n-road-damage-detection` (HuggingFace Hub) |
| Data Validation | Pydantic v2 |

### Model Details

The service uses a **YOLOv8n** (nano) model fine-tuned on the **RDD2022 (Road Damage Dataset 2022)** dataset, hosted on HuggingFace Hub. The model is trained on 4 defect classes mapped from the RDD2022 label convention:

| RDD2022 Code | Human Label | Description |
|---|---|---|
| D00 | `longitudinal_crack` | Cracks running along the road direction |
| D10 | `transverse_crack` | Cracks running across the road |
| D20 | `alligator_crack` | Interconnected "fatigue" cracking pattern |
| D40 | `pothole` | Severe surface depression |

The model is loaded **once at application startup** using FastAPI's `lifespan` context manager (not per-request), so inference overhead is purely the forward pass:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()   # warm up the model weight into memory
    yield
```

### Inference Pipeline (`detector.py`)

```python
def detect(image_bytes: bytes) -> dict:
    model  = load_model()
    image  = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    results = model.predict(source=image, conf=CONFIDENCE_THRESHOLD, verbose=False)
    # ... extract boxes, sort by confidence, return best detection
```

1. Raw bytes → **PIL Image** (RGB normalisation).
2. YOLOv8 **`predict()`** runs the model at `conf=0.35` (configurable via `CONFIDENCE_THRESHOLD` env var).
3. All bounding boxes above the threshold are collected, **sorted by confidence**, and the highest-confidence detection is returned as the primary result.
4. All detections are also returned as `all_detections[]` for future multi-defect reporting.

### Severity Classification

Confidence scores are translated into a **3-tier severity** rating per defect type:

```python
SEVERITY_THRESHOLDS = {
    "pothole":          {"low": 0.40, "medium": 0.60, "high": 0.80},
    "alligator_crack":  {"low": 0.35, "medium": 0.55, "high": 0.75},
    "longitudinal_crack": ...
    "transverse_crack": ...
}
```

This makes confidence meaningful to non-technical stakeholders (field crews, city administrators) without exposing raw floats.

### Fallback Strategy

If the primary model (HuggingFace) fails to load (no internet, rate-limit), the service **automatically falls back** to the generic `yolov8n.pt` (COCO-pretrained). This keeps the service alive for testing but produces COCO classes, not road-specific labels.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns `{status: "ok", model: "<path>"}` |
| `POST` | `/detect` | Accepts `multipart/form-data` with `file` field |

Interactive Swagger UI available at `http://localhost:8000/docs`.

### Pydantic Response Schema

```python
class DetectionResult(BaseModel):
    defect_type:    Optional[str]       # "pothole", "alligator_crack", etc.
    raw_class:      Optional[str]       # "D40", "D20", etc.
    confidence:     float               # 0.0 – 1.0
    severity:       Optional[str]       # "low" | "medium" | "high"
    bbox:           Optional[List[float]]  # [x1, y1, x2, y2]
    is_valid:       bool                # confidence >= threshold
    all_detections: List[SingleDetection]
```

---

## 6. Layer 4 — Database (SQLite / better-sqlite3)

### Why SQLite?

SQLite is chosen for the MVP because:
- **Zero setup** — no separate database process or credentials.
- **`better-sqlite3`** provides a **synchronous API** that works naturally with Express without callback hell.
- Sufficient for tens of thousands of reports before any performance concern.
- Easy to migrate to PostgreSQL later by swapping `better-sqlite3` for `pg` and adjusting SQL syntax.

### Schema

```sql
CREATE TABLE reports (
  report_id     INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER  REFERENCES users(id) ON DELETE SET NULL,
  image_url     TEXT     NOT NULL,
  latitude      REAL     NOT NULL,
  longitude     REAL     NOT NULL,
  timestamp     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description   TEXT,
  defect_type   TEXT,              -- populated by AI (async)
  ai_confidence REAL,              -- 0.0 – 1.0
  severity      TEXT CHECK(severity IN ('low','medium','high')),
  bbox          TEXT,              -- stored as JSON string "[x1,y1,x2,y2]"
  status        TEXT NOT NULL DEFAULT 'red'
                CHECK(status IN ('red','orange','green')),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Status Lifecycle

```
red ──────► orange ──────► green
 ▲              ▲               ▲
 │              │               │
Submitted    Assigned        Repaired
(AI pending) (crew working)  (closed)
```

AI fields (`defect_type`, `ai_confidence`, `severity`, `bbox`) start as `NULL` and are written in a separate `UPDATE` transaction once the async AI pipeline completes.

### Indexes

Three indexes are created at schema initialisation for the most common query patterns:

```sql
CREATE INDEX idx_reports_status    ON reports(status);
CREATE INDEX idx_reports_user_id   ON reports(user_id);
CREATE INDEX idx_reports_timestamp ON reports(timestamp);
```

---

## 7. End-to-End Data Flow

```
① User opens CaptureScreen on phone
②   expo-camera → captures JPEG photo
③   expo-image-manipulator → resize to 1080px, 75% quality
④   expo-location → { latitude, longitude }
⑤   (optional) MapPickerScreen → user drops pin manually
⑥   axios.post('/api/report', FormData)
        image (binary) + latitude + longitude + description
        ──────────────────────────────────────────────────►
                                                     ⑦ Multer saves image → /uploads/<uuid>.jpg
                                                     ⑧ INSERT INTO reports (status='red', AI=NULL)
                                                     ⑨ Return 201 { report_id, image_url, ... }
        ◄──────────────────────────────────────────────────
⑩  App shows SubmissionResultScreen (success)
        [BACKGROUND — async, no user waiting]
                                                    ⑪ detectDefect(imagePath)
                                                    ⑫ axios.post('http://localhost:8000/detect', form)
                                                              ──────────────────────────────────►
                                                                               ⑬ PIL decode image
                                                                               ⑭ YOLOv8 inference
                                                                               ⑮ Sort boxes by conf
                                                                               ⑯ Compute severity
                                                                               ◄──────────────────
                                                    ⑰ UPDATE reports SET defect_type, ai_confidence,
                                                           severity, bbox WHERE report_id = ?
⑱ User pull-to-refresh ReportsListScreen
⑲   GET /api/reports → sees defect_type & severity populated
```

---

## 8. Key Design Decisions

### 8.1 — Non-blocking AI Pipeline (Fire-and-Forget)

**Problem:** YOLOv8 inference takes 1–5 seconds. Keeping the HTTP request open during inference creates a poor user experience and risks mobile client timeouts.

**Solution:** The backend inserts the report and responds `201` immediately, then triggers AI detection via a detached `Promise` with no `await`. The user's connection is never held. This is sometimes called the "fire-and-forget" pattern.

**Tradeoff:** If the server crashes between insert and AI update, the row stays with `NULL` AI fields permanently. A robust production system would use a job queue (BullMQ, Celery) with retry logic.

---

### 8.2 — Domain-Specific YOLOv8 Model

**Problem:** Generic object detectors (COCO-trained) do not have road damage as a class.

**Solution:** Use `keremberke/yolov8n-road-damage-detection`, fine-tuned on the RDD2022 dataset with 26,000 annotated road damage images across 4 countries. This gives meaningful road-specific class labels out of the box without any custom training.

**Tradeoff:** The nano (`n`) variant is used for speed; accuracy could be improved by upgrading to `yolov8s` or `yolov8m` at the cost of higher RAM and latency.

---

### 8.3 — Confidence → Severity Mapping

**Problem:** Raw confidence floats (e.g. `0.7423`) are not actionable for field crews.

**Solution:** Per-defect severity thresholds translate confidence into `low / medium / high` ratings. Potholes require higher confidence to reach `high` severity (0.80) than cracks (0.75), because false positives on potholes are more operationally costly.

---

### 8.4 — Multipart Form-Data Transport

**Problem:** Sending images as base64 inside JSON bloats the payload by ~33% and adds encoding/decoding overhead.

**Solution:** Standard `multipart/form-data` is used end-to-end (mobile → backend → AI service), keeping binary data as binary. This is consistent with standard file upload conventions.

---

### 8.5 — SQLite for MVP

**Problem:** PostgreSQL/MySQL require separate infrastructure and credentials — overkill for a hackathon MVP.

**Solution:** SQLite with `better-sqlite3` delivers a synchronous API, zero-config setup, and file-based storage. The schema and query patterns are standard SQL, making a future migration to Postgres straightforward.

---

### 8.6 — Model Warm-Up at Startup

**Problem:** YOLOv8's first inference call after cold start is slow (model has to move from disk to memory and potentially download from HuggingFace).

**Solution:** FastAPI's `lifespan` callback calls `load_model()` during application startup, eagerly loading weights into memory. All subsequent `/detect` requests hit a warm model.

---

## 9. Technology Stack Summary

| Layer | Language | Framework | Key Libraries |
|---|---|---|---|
| Mobile | JavaScript | React Native / Expo | expo-camera, expo-location, expo-image-manipulator, axios, react-native-maps |
| Backend | JavaScript | Node.js / Express | multer, better-sqlite3, axios, uuid, form-data |
| AI Service | Python | FastAPI / Uvicorn | ultralytics (YOLOv8), Pillow, pydantic |
| Database | SQL | SQLite | — |
| Dev Tools | — | — | nodemon, dotenv |

---

## 10. Phase Roadmap

| Phase | Status | Scope |
|---|---|---|
| **Phase 1 — MVP Core** | ✅ Done | Mobile capture, GPS tagging, report submission, SQLite persistence |
| **Phase 2 — AI Pipeline** | ✅ Done | YOLOv8 road-damage detection, confidence scoring, severity rating, async pipeline |
| **Phase 3 — Admin Dashboard** | 🔜 Planned | Web UI for status management (red → orange → green), work order assignment, map view of all reports |
| **Phase 4 — Analytics** | 🔜 Planned | Heatmaps of high-defect zones, monthly trend reports, smart-city API integrations, push-notification alerts |

---

## Potential Production Upgrades

| Area | Current (MVP) | Production Recommendation |
|---|---|---|
| AI Queue | Fire-and-forget Promise | BullMQ / Celery with retry & dead-letter queue |
| Database | SQLite | PostgreSQL (with PostGIS for geospatial queries) |
| File Storage | Local `./uploads/` | AWS S3 / Cloudflare R2 |
| Auth | None | Firebase Auth / JWT |
| AI Model | YOLOv8n nano (~6 MB) | Fine-tuned YOLOv8s/m on RDD2022 + CRACK500 |
| Deployment | localhost | Docker Compose → Kubernetes |
| Monitoring | console.log | Prometheus + Grafana, Sentry |

---

*Document generated: 2026-02-23 | RoadWatch v2.0.0 MVP*
