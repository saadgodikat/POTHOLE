const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('../db');
const { detectDefect } = require('../services/aiService');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// ── Multer storage config ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ── Phase 2: Quality Score Engine ────────────────────────────────────────────
/**
 * Compute a road quality score (0–10) where:
 *   10 = perfect road, 0 = critically damaged
 *
 * Formula:
 *   score = 10
 *         + danger_penalty × ai_confidence   (danger weighted by certainty)
 *         + size_penalty                     (relative bbox size)
 *         + gps_accuracy_penalty             (poor GPS = slight deduction)
 *   clamped to [0, 10]
 *
 * @param {object} aiResult  - result from detectDefect()
 * @param {number} gpsAccuracy - GPS accuracy in metres (null = unknown)
 * @returns {number} quality score 0.0–10.0 (2 decimal places)
 */
function computeQualityScore(aiResult, gpsAccuracy = null) {
  // ── 1. Danger penalty (base) ─────────────────────────────────────────
  const DANGER_PENALTY = { critical: -6.0, moderate: -3.5, minor: -1.5 };
  const dangerPenalty = DANGER_PENALTY[aiResult.danger_level] ?? 0;

  // Confidence multiplier — uncertain detections penalise less
  // Minimum penalty multiplier of 0.2 ensures even low-confidence hits impact the score
  const confidence      = Math.max(0.2, aiResult.confidence ?? 0);
  const weightedDanger  = dangerPenalty * confidence;

  // ── 2. Size penalty (bbox area relative to assumed 640×640 image) ────
  let sizePenalty = 0;
  if (aiResult.bbox && Array.isArray(aiResult.bbox) && aiResult.bbox.length === 4) {
    const [x1, y1, x2, y2] = aiResult.bbox;
    const bboxArea  = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const imgArea   = 640 * 640; 
    const areaRatio = bboxArea / imgArea;

    if (areaRatio > 0.08)       sizePenalty = -1.5; 
    else if (areaRatio > 0.03)  sizePenalty = -0.8; 
    else if (areaRatio > 0)     sizePenalty = -0.3; 
  }

  // ── 3. GPS accuracy penalty ───────────────────────────────────────────
  let gpsPenalty = 0;
  if (gpsAccuracy !== null && gpsAccuracy !== undefined) {
    if (gpsAccuracy > 25)      gpsPenalty = -0.5;
    else if (gpsAccuracy > 10) gpsPenalty = -0.2;
  }

  const raw = 10 + weightedDanger + sizePenalty + gpsPenalty;
  
  // Final safeguard: if a defect type exists, score must be below 9.5
  let score = Math.min(10, Math.max(0, raw));
  if (aiResult.defect_type && score > 9.5) {
    score = 9.45;
  }

  return Math.round(score * 100) / 100;
}

// ── POST /api/report ─────────────────────────────────────────────────────────
/**
 * Submit a new road defect report.
 * Body (multipart/form-data):
 *   image        — image file (required)
 *   latitude     — float (required)
 *   longitude    — float (required)
 *   description  — string (optional)
 *   user_id      — integer (optional)
 *   captured_at  — ISO 8601 datetime (optional, client-device time)   [Phase 1]
 *   gps_accuracy — float in metres (optional)                         [Phase 1]
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { latitude, longitude, description, user_id, captured_at, gps_accuracy } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const imageUrl   = `/uploads/${req.file.filename}`;
    const gpsAcc     = gps_accuracy ? parseFloat(gps_accuracy) : null;
    const capturedAt = captured_at  || null;
    const db         = getDb();

    // 1. Insert initial report (AI fields null until detection runs)
    const insertStmt = db.prepare(`
      INSERT INTO reports
        (user_id, image_url, latitude, longitude, captured_at, gps_accuracy, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'red')
    `);
    const result = insertStmt.run(
      user_id || null,
      imageUrl,
      parseFloat(latitude),
      parseFloat(longitude),
      capturedAt,
      gpsAcc,
      description || null,
    );
    const reportId = result.lastInsertRowid;

    // 2. Trigger AI detection asynchronously
    const imagePath = req.file.path;
    detectDefect(imagePath)
      .then((aiResult) => {
        // ── Phase 2: Compute quality score ───────────────────────────
        const qualityScore = aiResult.defect_type
          ? computeQualityScore(aiResult, gpsAcc)
          : 10.0; // No defect detected → perfect score

        const updateStmt = db.prepare(`
          UPDATE reports
          SET defect_type    = ?,
              ai_confidence  = ?,
              severity       = ?,
              danger_level   = ?,
              danger_priority= ?,
              bbox           = ?,
              quality_score  = ?
          WHERE report_id = ?
        `);
        updateStmt.run(
          aiResult.defect_type,
          aiResult.confidence,
          aiResult.severity      || null,
          aiResult.danger_level  || null,
          aiResult.danger_priority || null,
          aiResult.bbox ? JSON.stringify(aiResult.bbox) : null,
          qualityScore,
          reportId,
        );

        const dangerEmoji = { critical: '🔴', moderate: '🟡', minor: '🟢' };
        console.log(
          `[AI] Report ${reportId} → ${aiResult.defect_type} ` +
          `(${(aiResult.confidence * 100).toFixed(1)}%) ` +
          `danger=${dangerEmoji[aiResult.danger_level] || '⚪'} ${aiResult.danger_level || 'N/A'} ` +
          `quality_score=${qualityScore}/10`
        );
      })
      .catch((err) => {
        console.error(`[AI] Detection failed for report ${reportId}:`, err.message);
      });

    // 3. Respond immediately without waiting for AI
    const report = db.prepare('SELECT * FROM reports WHERE report_id = ?').get(reportId);
    return res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (err) {
    console.error('[POST /report]', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ── GET /api/reports ─────────────────────────────────────────────────────────
/**
 * Fetch all reports, newest first.
 * Query params:
 *   status  — filter by status (red|orange|green)
 *   limit   — max records (default 50)
 *   offset  — pagination offset (default 0)
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { status, limit = 50, offset = 0 } = req.query;

    let query  = 'SELECT * FROM reports';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const reports = db.prepare(query).all(...params);
    const total   = db
      .prepare(`SELECT COUNT(*) as count FROM reports${status ? ' WHERE status = ?' : ''}`)
      .get(...(status ? [status] : []));

    return res.json({ total: total.count, limit: parseInt(limit), offset: parseInt(offset), reports });
  } catch (err) {
    console.error('[GET /reports]', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ── GET /api/reports/heatmap ─────────────────────────────────────────────────
// Phase 3: Geospatial heatmap endpoint
/**
 * Returns a GeoJSON FeatureCollection of aggregated road-quality grid cells.
 *
 * Query params:
 *   grid_size       — decimal degrees per grid cell (default 0.005 ≈ ~500m)
 *   min_reports     — min reports per cell to include (default 1)
 *   status          — filter source reports by status (optional)
 *   danger_level    — filter source reports by danger_level (optional)
 *
 * Each feature's properties include:
 *   count           — number of reports in cell
 *   avg_quality     — average quality score (0–10)
 *   min_quality     — worst score in cell
 *   dominant_danger — most common danger level
 *   heat_intensity  — 0.0–1.0  (1 = worst road, 0 = perfect)
 *   lat, lng        — centroid of cell
 */
router.get('/heatmap', (req, res) => {
  try {
    const db         = getDb();
    const gridSize   = parseFloat(req.query.grid_size   ?? '0.005');
    const minReports = parseInt(req.query.min_reports   ?? '1');
    const statusFilter      = req.query.status       || null;
    const dangerFilter      = req.query.danger_level || null;

    // Build WHERE clause
    const conditions = ['quality_score IS NOT NULL'];
    const params     = [];
    if (statusFilter) { conditions.push('status = ?');       params.push(statusFilter); }
    if (dangerFilter) { conditions.push('danger_level = ?'); params.push(dangerFilter); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = db.prepare(`
      SELECT
        latitude,
        longitude,
        quality_score,
        danger_level,
        danger_priority
      FROM reports
      ${where}
    `).all(...params);

    // ── Grid-based aggregation (no PostGIS needed for SQLite) ─────────
    const cells = {};

    for (const row of rows) {
      // Snap lat/lng to grid cell
      const cellLat = Math.floor(row.latitude  / gridSize) * gridSize + gridSize / 2;
      const cellLng = Math.floor(row.longitude / gridSize) * gridSize + gridSize / 2;
      const key     = `${cellLat.toFixed(6)}_${cellLng.toFixed(6)}`;

      if (!cells[key]) {
        cells[key] = {
          lat:            cellLat,
          lng:            cellLng,
          scores:         [],
          dangerCounts:   { critical: 0, moderate: 0, minor: 0, none: 0 },
        };
      }
      cells[key].scores.push(row.quality_score);
      const dl = row.danger_level || 'none';
      cells[key].dangerCounts[dl] = (cells[key].dangerCounts[dl] || 0) + 1;
    }

    // ── Build GeoJSON FeatureCollection ──────────────────────────────
    const features = [];

    for (const cell of Object.values(cells)) {
      if (cell.scores.length < minReports) continue;

      const count       = cell.scores.length;
      const avgQuality  = parseFloat((cell.scores.reduce((a, b) => a + b, 0) / count).toFixed(2));
      const minQuality  = parseFloat(Math.min(...cell.scores).toFixed(2));

      // Dominant danger = highest priority (critical > moderate > minor > none)
      const PRIO = { critical: 1, moderate: 2, minor: 3, none: 4 };
      const dominantDanger = Object.entries(cell.dangerCounts)
        .filter(([, v]) => v > 0)
        .sort(([a], [b]) => (PRIO[a] ?? 4) - (PRIO[b] ?? 4))[0]?.[0] ?? 'none';

      // heat_intensity: 1 = worst road (score 0), 0 = perfect (score 10)
      const heatIntensity = parseFloat(Math.min(1, Math.max(0, (10 - avgQuality) / 10)).toFixed(3));

      features.push({
        type: 'Feature',
        geometry: {
          type:        'Point',
          coordinates: [parseFloat(cell.lng.toFixed(6)), parseFloat(cell.lat.toFixed(6))],
        },
        properties: {
          count,
          avg_quality:     avgQuality,
          min_quality:     minQuality,
          dominant_danger: dominantDanger,
          heat_intensity:  heatIntensity,
          lat:             parseFloat(cell.lat.toFixed(6)),
          lng:             parseFloat(cell.lng.toFixed(6)),
        },
      });
    }

    // Sort by heat_intensity descending (hottest spots first)
    features.sort((a, b) => b.properties.heat_intensity - a.properties.heat_intensity);

    return res.json({
      type:     'FeatureCollection',
      metadata: {
        total_reports_used:  rows.length,
        total_cells:         features.length,
        grid_size_degrees:   gridSize,
        grid_size_approx_m:  Math.round(gridSize * 111320),
        generated_at:        new Date().toISOString(),
      },
      features,
    });
  } catch (err) {
    console.error('[GET /reports/heatmap]', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ── GET /api/reports/:id ─────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const db     = getDb();
    const report = db.prepare('SELECT * FROM reports WHERE report_id = ?').get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    return res.json(report);
  } catch (err) {
    console.error('[GET /reports/:id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PATCH /api/reports/:id/status ────────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['red', 'orange', 'green'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const db     = getDb();
    const result = db.prepare('UPDATE reports SET status = ? WHERE report_id = ?').run(status, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Report not found' });

    const updated = db.prepare('SELECT * FROM reports WHERE report_id = ?').get(req.params.id);
    return res.json({ message: 'Status updated', report: updated });
  } catch (err) {
    console.error('[PATCH /reports/:id/status]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/reports/:id/reanalyze ─────────────────────────────────────────
router.post('/:id/reanalyze', async (req, res) => {
  try {
    const db     = getDb();
    const report = db.prepare('SELECT * FROM reports WHERE report_id = ?').get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const imagePath = `.${report.image_url}`;
    if (!require('fs').existsSync(imagePath)) {
      return res.status(400).json({ error: `Image file not found at ${imagePath}` });
    }

    res.json({ message: `Re-analysis started for report ${req.params.id}`, report_id: report.report_id });

    detectDefect(imagePath)
      .then((aiResult) => {
        const qualityScore = aiResult.defect_type
          ? computeQualityScore(aiResult, report.gps_accuracy)
          : 10.0;

        const updateStmt = db.prepare(`
          UPDATE reports
          SET defect_type     = ?,
              ai_confidence   = ?,
              severity        = ?,
              danger_level    = ?,
              danger_priority = ?,
              bbox            = ?,
              quality_score   = ?
          WHERE report_id = ?
        `);
        updateStmt.run(
          aiResult.defect_type,
          aiResult.confidence,
          aiResult.severity      || null,
          aiResult.danger_level  || null,
          aiResult.danger_priority || null,
          aiResult.bbox ? JSON.stringify(aiResult.bbox) : null,
          qualityScore,
          report.report_id,
        );

        const dangerEmoji = { critical: '🔴', moderate: '🟡', minor: '🟢' };
        console.log(
          `[AI] Reanalysis ${report.report_id} → ${aiResult.defect_type} ` +
          `(${(aiResult.confidence * 100).toFixed(1)}%) ` +
          `danger=${dangerEmoji[aiResult.danger_level] || '⚪'} ${aiResult.danger_level || 'N/A'} ` +
          `quality_score=${qualityScore}/10`
        );
      })
      .catch((err) => {
        console.error(`[AI] Reanalysis failed for report ${report.report_id}:`, err.message);
      });
  } catch (err) {
    console.error('[POST /reports/:id/reanalyze]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/reports/:id
 * Update report description.
 */
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  if (description === undefined) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    const db = getDb();
    const result = db.prepare('UPDATE reports SET description = ? WHERE report_id = ?')
      .run(description, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true, message: 'Report updated successfully' });
  } catch (err) {
    console.error('[DB ERROR]', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

module.exports = router;
