# Road Inspection Backend

Node.js + Express REST API for the AI Road Inspection System.

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

## API Endpoints

### POST `/api/report`
Submit a road defect report.

**Request** (multipart/form-data):
| Field | Type | Required | Description |
|---|---|---|---|
| image | file | ✅ | Road image (JPEG/PNG/WebP, max 10MB) |
| latitude | float | ✅ | GPS latitude |
| longitude | float | ✅ | GPS longitude |
| description | string | ❌ | Optional notes |
| user_id | integer | ❌ | Submitting user ID |

**Response** `201`:
```json
{
  "message": "Report submitted successfully",
  "report": {
    "report_id": 1,
    "image_url": "/uploads/abc123.jpg",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "status": "red",
    "defect_type": null,
    "ai_confidence": null,
    "timestamp": "2026-02-21T15:00:00.000Z"
  }
}
```
> AI detection runs asynchronously. Poll `GET /api/reports/:id` for updated results.

---

### GET `/api/reports`
Get all reports (newest first).

**Query params**: `status`, `limit` (default 50), `offset` (default 0)

**Response** `200`:
```json
{
  "total": 12,
  "limit": 50,
  "offset": 0,
  "reports": [ { ...report }, ... ]
}
```

---

### GET `/api/reports/:id`
Get a single report by ID.

---

### PATCH `/api/reports/:id/status`
Update report status (admin use).

**Body**: `{ "status": "orange" }` — values: `red | orange | green`

---

### GET `/health`
Service health check.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| PORT | 3000 | Server port |
| AI_SERVICE_URL | http://localhost:8000 | Python AI service URL |
| DB_PATH | ./data/road_inspection.db | SQLite database file |
| UPLOAD_DIR | ./uploads | Image storage directory |
| CONFIDENCE_THRESHOLD | 0.5 | Min confidence to mark as valid defect |
