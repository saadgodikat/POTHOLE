# 🤖 AI Server — Full Breakdown
> **Project:** RoadWatch — Pothole Detection System  
> **AI Service Location:** `ai-service/`  
> **Backend Service Location:** `backend/`

---

## 📌 What Is the AI Server?

The AI server is a **Python microservice** that runs separately from the main Node.js backend. Its entire job is to:

1. Accept an image (road photo)
2. Run it through a **YOLOv8 deep learning model**
3. Return whether a pothole was detected, where it is, how confident the model is, and how dangerous it is

It is **not** a database server, not a file server — it's a pure **AI inference engine** exposed over HTTP.

---

## 🏗️ System Architecture (Big Picture)

```
┌──────────────────────────────────────────────────────────────┐
│                     MOBILE APP (React Native)                │
│           User takes photo + drops pin on map                │
└───────────────────────┬──────────────────────────────────────┘
                        │ POST /api/report  (multipart/form-data)
                        │ Fields: image, latitude, longitude, description
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              BACKEND SERVER (Node.js + Express)              │
│                      Port: 3000                              │
│                                                              │
│  1. Saves image to ./uploads/                                │
│  2. Inserts report row into SQLite DB (status = 'red')       │
│  3. Responds to mobile immediately (201 Created)             │
│  4. In background → calls AI Service asynchronously          │
└───────────────────────┬──────────────────────────────────────┘
                        │ POST /detect  (multipart/form-data)
                        │ Field: file (the image)
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              AI SERVICE (Python + FastAPI)                   │
│                      Port: 8000                              │
│                                                              │
│  1. Receives image bytes                                     │
│  2. Runs YOLOv8 inference                                    │
│  3. Classifies danger level (critical / moderate / minor)    │
│  4. Returns JSON result with confidence, bbox, danger        │
└───────────────────────┬──────────────────────────────────────┘
                        │ JSON result
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              BACKEND SERVER (Node.js)                        │
│  Updates the SQLite DB row with AI result fields             │
└──────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                SQLite Database                               │
│  File: backend/data/road_inspection.db                       │
│  Table: reports                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 File-by-File Component Breakdown

### AI Service (`ai-service/`)

| File | Role |
|------|------|
| `main.py` | FastAPI app entry point. Defines all HTTP endpoints, handles file upload validation |
| `detector.py` | Core AI logic — loads YOLO model, runs inference, classifies danger level |
| `train.py` | Optional fine-tuning script — train model on custom pothole dataset from Kaggle |
| `requirements.txt` | Python dependencies |
| `.env.example` | Environment variable template |
| `models/` | Folder where your fine-tuned model (`pothole_finetuned.pt`) is saved |
| `yolov8n.pt` | Fallback COCO pretrained weights |

### Backend (`backend/src/`)

| File | Role |
|------|------|
| `server.js` | Express app bootstrap — middleware, routes, error handling, uploads folder setup |
| `routes/reportRoutes.js` | All `/api/report` and `/api/reports` route handlers |
| `services/aiService.js` | Calls the Python AI service over HTTP using Axios |
| `db.js` | SQLite database connection + auto-migration of schema columns |

---

## 🔬 What Is YOLO and Why Is It Used?

**YOLO** = *You Only Look Once*. It is a real-time object detection algorithm.

| Property | Detail |
|----------|--------|
| What it does | Detects objects in images and returns bounding boxes + confidence scores |
| Why YOLOv8? | It is fast, accurate, and works well on edge/CPU deployments |
| Model used | `Harisanth/Pothole-Finetuned-YOLOv8` (from HuggingFace Hub) — pre-trained specifically on potholes |
| Fallback | `yolov8n.pt` (generic COCO model) if all else fails |
| Library | `ultralytics` Python package |

The model outputs for each detection:
- **Bounding box** (`xyxy` format: x1, y1, x2, y2)
- **Confidence score** (0.0 → 1.0)
- **Class label** (e.g., `pothole`, `D40`)

---

## 📦 Python Dependencies (What They Do)

Defined in `ai-service/requirements.txt`:

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework to expose AI logic as HTTP endpoints |
| `uvicorn` | ASGI server that runs the FastAPI app |
| `ultralytics` | Provides the `YOLO` class — runs YOLOv8 inference |
| `pillow` | Opens and converts image bytes → PIL Image object |
| `python-multipart` | Required by FastAPI to handle file uploads (`multipart/form-data`) |
| `python-dotenv` | Loads `.env` file into `os.getenv()` |
| `pydantic` | Validates and serializes request/response data schemas |
| `huggingface_hub` | Downloads model weights from HuggingFace Hub at startup |
| `kaggle` | Downloads training datasets from Kaggle (used in `train.py`) |
| `requests` | HTTP requests (general utility) |

---

## 🔄 Full Lifecycle of a Report (Step by Step)

### Step 1 — User Submits Report (Mobile App)
User takes a road photo and taps "Submit". The app sends:
```
POST http://<backend>:3000/api/report
Content-Type: multipart/form-data

image      = <road_photo.jpg>
latitude   = 17.3850
longitude  = 78.4867
description = "Big pothole near flyover"
user_id    = 1  (optional)
```

---

### Step 2 — Backend Saves Image & Creates DB Record
**File:** `backend/src/routes/reportRoutes.js`

1. `multer` saves the image to `./uploads/<uuid>.jpg`
2. A new row is inserted into SQLite `reports` table with `status = 'red'` (not yet analyzed)
3. AI fields (`defect_type`, `ai_confidence`, etc.) are `NULL` at this point
4. **Backend immediately responds `201 Created`** — the app doesn't wait for AI

```json
{
  "message": "Report submitted successfully",
  "report": {
    "report_id": 42,
    "image_url": "/uploads/abc123.jpg",
    "latitude": 17.385,
    "longitude": 78.4867,
    "status": "red",
    "defect_type": null,
    "ai_confidence": null,
    ...
  }
}
```

---

### Step 3 — Backend Calls AI Service (Async, Background)
**File:** `backend/src/services/aiService.js`

While the mobile app already got its response, the backend fires an async HTTP request to the Python AI service:

```
POST http://localhost:8000/detect
Content-Type: multipart/form-data

file = <road_photo.jpg>   ← the same image from ./uploads/
```

This is a **fire-and-forget** call — the backend doesn't block on it. Timeout: 60 seconds (first call may download the model).

---

### Step 4 — AI Service Receives Image
**File:** `ai-service/main.py`

The `/detect` endpoint:
1. Validates file type (must be JPEG, PNG, or WebP)
2. Reads image bytes from the upload
3. Calls `detect(image_bytes)` from `detector.py`
4. Checks `is_valid` flag (confidence ≥ threshold of 0.30)
5. Returns full JSON result

---

### Step 5 — YOLO Inference Runs
**File:** `ai-service/detector.py`

The `detect()` function:

```
image bytes
    │
    ▼
PIL.Image.open() → convert to RGB
    │
    ▼
YOLO model.predict(source=image, conf=0.30)
    │
    ▼
For each detection box:
  - Get confidence score
  - Get class label (e.g., "pothole")
  - Map class to internal name (via CLASS_MAP)
  - Get bounding box [x1, y1, x2, y2]
  - Classify danger level (critical / moderate / minor)
    │
    ▼
Sort all detections by danger priority (critical first)
    │
    ▼
Return: best detection + all_detections list
```

---

### Step 6 — Danger Level Classification
**File:** `ai-service/detector.py` → `_classify_danger()`

Each detection is scored using **two factors**:

| Factor | Weight | Description |
|--------|--------|-------------|
| Confidence | 70% | How certain the model is |
| Bounding Box Area Ratio | 30% | How large the pothole is relative to the full image |

Combined into a `danger_score = (confidence × 0.7) + (size_ratio × 0.3)`

| Danger Level | Trigger Condition | Color | Priority |
|---|---|---|---|
| 🔴 **Critical** | `confidence ≥ 0.75` OR `danger_score ≥ 0.70` | Red | 1 (Most Dangerous) |
| 🟡 **Moderate** | `confidence ≥ 0.50` OR `danger_score ≥ 0.40` | Yellow | 2 |
| 🟢 **Minor** | Everything else | Green | 3 |

---

### Step 7 — Model Returns to Backend
Example JSON response from AI service:

```json
{
  "defect_type":     "pothole",
  "raw_class":       "Pothole",
  "confidence":      0.8712,
  "danger_level":    "critical",
  "danger_label":    "Critical — Immediate Danger",
  "danger_priority": 1,
  "severity":        "high",
  "bbox":            [120.5, 340.2, 480.1, 600.8],
  "is_valid":        true,
  "all_detections": [
    { "defect_type": "pothole", "confidence": 0.8712, "danger_level": "critical", ... },
    { "defect_type": "pothole", "confidence": 0.5231, "danger_level": "moderate", ... }
  ]
}
```

---

### Step 8 — Backend Updates the Database
**File:** `backend/src/routes/reportRoutes.js`

The backend's AI callback runs the following SQLite UPDATE:
```sql
UPDATE reports
SET defect_type     = 'pothole',
    ai_confidence   = 0.8712,
    severity        = 'high',
    danger_level    = 'critical',
    danger_priority = 1,
    bbox            = '[120.5, 340.2, 480.1, 600.8]'
WHERE report_id = 42;
```

The report now has full AI data. ✅

---

## 🛎️ All API Endpoints

### AI Service (Python / FastAPI) — Port 8000

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Returns service status, model name, class names |
| `GET` | `/model-info` | Returns model path, confidence threshold, danger levels |
| `POST` | `/detect` | **Main endpoint** — accepts image file, returns detection result |

#### `POST /detect` — Request
```
Content-Type: multipart/form-data
Body field: file = <image file>  (JPEG / PNG / WebP only)
```

#### `POST /detect` — Response Schema
```json
{
  "defect_type":     "pothole" | null,
  "raw_class":       "Pothole" | null,
  "confidence":      0.0 - 1.0,
  "danger_level":    "critical" | "moderate" | "minor" | null,
  "danger_label":    "Critical — Immediate Danger" | ... | null,
  "danger_priority": 1 | 2 | 3 | null,
  "severity":        "high" | "medium" | "low" | null,
  "bbox":            [x1, y1, x2, y2] | null,
  "is_valid":        true | false,
  "all_detections":  [ ...array of SingleDetection objects... ]
}
```

---

### Backend Server (Node.js / Express) — Port 3000

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Backend health check |
| `POST` | `/api/report` | Submit a new pothole report with image |
| `GET` | `/api/reports` | Get all reports (with pagination + status filter) |
| `GET` | `/api/reports/:id` | Get a single report by ID |
| `PATCH` | `/api/reports/:id/status` | Update workflow status (red → orange → green) |
| `POST` | `/api/reports/:id/reanalyze` | Re-trigger AI for a stuck report |
| `GET` | `/uploads/:filename` | Serve uploaded images statically |

#### `POST /api/report` — Request
```
Content-Type: multipart/form-data
Fields:
  image       = <file>         (required)
  latitude    = 17.3850        (required)
  longitude   = 78.4867        (required)
  description = "..."          (optional)
  user_id     = 1              (optional)
```

#### `GET /api/reports` — Query Params
```
?status=red         → filter by workflow status
?limit=50           → max records (default: 50)
?offset=0           → pagination offset
```

---

## 🧠 Model Loading Priority

When the AI service starts, `detector.py` tries to load a model in this order:

```
Priority 1: models/pothole_finetuned.pt     ← Your own trained model (best!)
            (created by running train.py)

Priority 2: MODEL_PATH env variable          ← Explicit override path

Priority 3: HuggingFace Hub download         ← Harisanth/Pothole-Finetuned-YOLOv8
            (Harisanth/Pothole-Finetuned-YOLOv8/best.pt)

Priority 4: yolov8n.pt (COCO fallback)      ← Generic model, not pothole-specific
            ⚠️ Last resort only
```

> The model is **loaded ONCE at startup** and kept in memory. All requests re-use the same loaded model — this is why the first request may take 30–60 seconds (model download), but subsequent requests are fast.

---

## 🗄️ Database Schema

**Engine:** SQLite (file: `backend/data/road_inspection.db`)  
**Library:** `better-sqlite3` (synchronous, fast)

### `reports` Table

| Column | Type | Description |
|--------|------|-------------|
| `report_id` | INTEGER PRIMARY KEY | Auto-increment ID |
| `user_id` | INTEGER | Optional user reference |
| `image_url` | TEXT | Path like `/uploads/uuid.jpg` |
| `latitude` | REAL | GPS latitude |
| `longitude` | REAL | GPS longitude |
| `description` | TEXT | Optional user description |
| `status` | TEXT | Workflow: `red` → `orange` → `green` |
| `defect_type` | TEXT | `pothole`, `longitudinal_crack`, etc. (set by AI) |
| `ai_confidence` | REAL | 0.0–1.0 confidence score (set by AI) |
| `severity` | TEXT | `low` / `medium` / `high` (legacy, set by AI) |
| `danger_level` | TEXT | `critical` / `moderate` / `minor` (set by AI) |
| `danger_priority` | INTEGER | 1, 2, or 3 (set by AI) |
| `bbox` | TEXT | JSON string `"[x1,y1,x2,y2]"` (set by AI) |
| `created_at` | DATETIME | Timestamp of submission |

### Report Status Lifecycle
```
'red'     → Report submitted, AI not yet done (or AI found nothing)
'orange'  → AI has analyzed, defect confirmed (awaiting road crew)
'green'   → Pothole fixed / resolved
```

---

## ⚙️ Environment Variables

### AI Service (`ai-service/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `HF_REPO` | `Harisanth/Pothole-Finetuned-YOLOv8` | HuggingFace model repo |
| `HF_FILENAME` | `best.pt` | Model filename in the repo |
| `MODEL_PATH` | *(empty)* | Override path to a local model |
| `CONFIDENCE_THRESHOLD` | `0.30` | Minimum confidence to count a detection |
| `TRAIN_EPOCHS` | `50` | Training epochs for `train.py` |
| `TRAIN_BATCH` | `8` | Batch size for training |
| `TRAIN_IMG_SIZE` | `640` | Image size during training |
| `KAGGLE_USERNAME` | — | Your Kaggle username (for dataset download) |
| `KAGGLE_KEY` | — | Your Kaggle API key |

### Backend (`backend/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Server port |
| `AI_SERVICE_URL` | `http://localhost:8000` | URL of the Python AI service |
| `CONFIDENCE_THRESHOLD` | `0.35` | Minimum confidence for a valid detection |
| `UPLOAD_DIR` | `./uploads` | Where to save uploaded images |
| `DB_PATH` | `./data/road_inspection.db` | SQLite database file path |

---

## 🔗 How Backend Talks to AI Service

**File:** `backend/src/services/aiService.js`

Uses `axios` + `form-data` to POST the image as a multipart upload:

```javascript
const form = new FormData();
form.append('file', fs.createReadStream(imagePath));

const response = await axios.post('http://localhost:8000/detect', form, {
  headers: form.getHeaders(),
  timeout: 60000,   // 60 seconds — first request downloads the model
});
```

The result is then unpacked and stored in the database.

---

## 🏷️ Class Mapping (What the Model Can Detect)

Defined in `detector.py → CLASS_MAP`:

| Raw Model Label | Mapped Defect Type |
|---|---|
| `pothole` | `pothole` |
| `Pothole` | `pothole` |
| `D00` | `longitudinal_crack` |
| `D10` | `transverse_crack` |
| `D20` | `alligator_crack` |
| `D40` | `pothole` |

> `D00`–`D40` labels come from the **RDD2022** road damage dataset convention. The mapping ensures backward compatibility if you switch to an RDD2022-trained model.

---

## 🧪 Testing the AI Service

You can test it directly without the mobile app:

```bash
# Health check
curl http://localhost:8000/health

# Check model info
curl http://localhost:8000/model-info

# Detect potholes in an image
curl -X POST http://localhost:8000/detect \
     -F "file=@path/to/road_photo.jpg"
```

Or run the built-in test script:
```bash
cd ai-service
python test_detector.py
```

---

## 🚀 How to Start Both Services

### Start the AI Service
```bash
cd ai-service
pip install -r requirements.txt       # first time only
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Start the Backend
```bash
cd backend
npm install                            # first time only
npm run dev
```

> **Important:** The AI service **must** be running before the backend — otherwise reports will be saved but AI analysis will fail with `ECONNREFUSED`.

---

## 🔁 Re-Analysis Feature

If a report gets stuck (AI was down when the report was submitted), you can trigger re-analysis:

```
POST /api/reports/:id/reanalyze
```

This finds the image on disk and sends it to the AI service again. The backend responds immediately, and the update happens in the background.

---

## 📊 Summary Diagram — Data Flow for One Report

```
User taps Submit
      │
      ▼
Mobile App sends image + GPS to Backend (POST /api/report)
      │
      ├──► Backend saves image to disk
      ├──► Backend inserts DB row (status='red', AI fields=null)
      ├──► Backend responds 201 to mobile ✅ (user sees confirmation)
      │
      └──► [ASYNC] Backend calls AI Service (POST /detect)
                │
                ▼
           AI Service loads YOLOv8 model (already in memory)
                │
                ▼
           Runs inference → gets bounding boxes + confidence scores
                │
                ▼
           Classifies danger: critical / moderate / minor
                │
                ▼
           Returns JSON to Backend
                │
                ▼
           Backend updates DB row with AI results
                │
                ▼
           Report is now fully analyzed ✅
```
