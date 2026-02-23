# 🚦 RoadWatch — AI Road Inspection System (MVP)

An AI-powered road defect reporting platform. Users capture road images on their phone, GPS is auto-tagged, and a YOLOv8 model detects potholes, cracks, and surface defects in real time.

## Architecture

```
Mobile App (React Native / Expo)
       │  POST /api/report (multipart image + GPS)
       ▼
Node.js Backend (Express)
       │  POST /detect (image file)
       ▼
Python AI Service (FastAPI + YOLOv8)
       │  defect_type + confidence
       ▼
SQLite Database (reports table)
```

## Project Structure

```
hack/
├── mobile/          React Native Expo app
├── backend/         Node.js + Express REST API
├── ai-service/      Python FastAPI + YOLOv8
├── database/        SQL schema & seed data
└── README.md
```

---

## Quick Start

Run all three services simultaneously (open 3 terminals):

### 1. AI Detection Service (Python)

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
✅ Runs on: http://localhost:8000  
📖 API docs: http://localhost:8000/docs

---

### 2. Backend API (Node.js)

```bash
cd backend
npm install
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux
npm run dev
```
✅ Runs on: http://localhost:3000  
📖 Health check: http://localhost:3000/health

---

### 3. Mobile App (React Native)

```bash
cd mobile
npm install
npx expo start
```
📱 Scan the QR code with **Expo Go** (Android/iOS)

> **Physical device**: open `mobile/src/services/api.js` and change `BASE_URL` from `localhost` to your machine's local IP address (e.g. `http://192.168.1.100:3000`). Find your IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux).

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/report` | Submit report (image + GPS) |
| `GET` | `/api/reports` | List all reports |
| `GET` | `/api/reports/:id` | Get single report |
| `PATCH` | `/api/reports/:id/status` | Update status (admin) |
| `GET` | `/health` | Backend health check |
| `POST` | `/detect` *(AI svc)* | Detect defect in image |
| `GET` | `/health` *(AI svc)* | AI service health check |

---

## Integration Flow

```
1. User captures photo in app
         ↓
2. expo-image-manipulator compresses image (1080px wide, 75% quality)
         ↓
3. expo-location captures GPS coordinates
         ↓
4. App POSTs multipart form to backend /api/report
         ↓
5. Backend saves image to /uploads/, inserts row in DB (status=red)
         ↓
6. Backend responds 201 immediately (non-blocking)
         ↓  [async in background]
7. Backend sends image to Python /detect
         ↓
8. YOLOv8 runs inference, returns {defect_type, confidence, bbox}
         ↓
9. Backend updates report row: defect_type, ai_confidence
         ↓
10. User pulls-to-refresh Reports tab → sees AI result
```

---

## Report Status Lifecycle

| Status | Color | Meaning |
|--------|-------|---------|
| `red` | 🔴 | Submitted — work not yet assigned |
| `orange` | 🟠 | Work assigned to crew |
| `green` | 🟢 | Repair completed |

Status transitions are managed via `PATCH /api/reports/:id/status` (admin dashboard — Phase 3).

---

## Example Request / Response

### Submit Report
```bash
curl -X POST http://localhost:3000/api/report \
  -F "image=@pothole.jpg" \
  -F "latitude=28.6139" \
  -F "longitude=77.2090" \
  -F "description=Large pothole near main junction"
```

```json
{
  "message": "Report submitted successfully",
  "report": {
    "report_id": 1,
    "image_url": "/uploads/a3f8bc12.jpg",
    "latitude": 28.6139,
    "longitude": 77.209,
    "description": "Large pothole near main junction",
    "defect_type": null,
    "ai_confidence": null,
    "status": "red",
    "created_at": "2026-02-21T15:00:00.000Z"
  }
}
```

### AI Detection Result (after async processing)
```json
{
  "report_id": 1,
  "defect_type": "pothole",
  "ai_confidence": 0.8712,
  "bbox": [120.5, 88.3, 430.2, 310.1],
  "status": "red"
}
```

---

## Upgrading the AI Model

The MVP uses YOLOv8n (COCO-pretrained) as a detection baseline.  
To improve road-defect accuracy:
1. Fine-tune YOLOv8 on [RDD2022](https://github.com/sekilab/RoadDamageDetector) or [CRACK500](https://github.com/fyangneil/pavement-crack-detection)
2. Export weights as `road_defect.pt`
3. Set `MODEL_PATH=./models/road_defect.pt` in `ai-service/.env`
4. Update `ROAD_DEFECT_MAPPING` in `ai-service/detector.py`

---

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ MVP | Mobile capture, GPS tagging, report submission, SQL storage |
| **Phase 2** | ✅ MVP | AI defect detection (YOLOv8), confidence scoring, async pipeline |
| Phase 3 | 🔜 | Admin dashboard, status management, work assignment |
| Phase 4 | 🔜 | Heatmaps, analytics, smart city integrations |
