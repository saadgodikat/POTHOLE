const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { detectDefect } = require('../services/aiService');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// ── Multer storage config ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── POST /api/report ────────────────────────────────────────────────────────
/**
 * Submit a new road defect report.
 * Body (multipart/form-data):
 *   image       — image file (required)
 *   latitude    — float (required)
 *   longitude   — float (required)
 *   description — string (optional)
 *   user_id     — integer (optional)
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { latitude, longitude, description, user_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const db = getDb();

    // 1. Insert initial report (AI fields null until detection runs)
    const insertStmt = db.prepare(`
      INSERT INTO reports (user_id, image_url, latitude, longitude, description, status)
      VALUES (?, ?, ?, ?, ?, 'red')
    `);
    const result = insertStmt.run(
      user_id || null,
      imageUrl,
      parseFloat(latitude),
      parseFloat(longitude),
      description || null
    );
    const reportId = result.lastInsertRowid;

    // 2. Trigger AI detection asynchronously
    const imagePath = req.file.path;

    detectDefect(imagePath)
      .then((aiResult) => {
        const updateStmt = db.prepare(`
          UPDATE reports
          SET defect_type = ?, ai_confidence = ?, severity = ?,
              danger_level = ?, danger_priority = ?, bbox = ?
          WHERE report_id = ?
        `);
        updateStmt.run(
          aiResult.defect_type,
          aiResult.confidence,
          aiResult.severity || null,
          aiResult.danger_level || null,
          aiResult.danger_priority || null,
          aiResult.bbox,
          reportId
        );
        const dangerEmoji = { critical: '🔴', moderate: '🟡', minor: '🟢' };
        console.log(`[AI] Report ${reportId} → ${aiResult.defect_type} (${(aiResult.confidence * 100).toFixed(1)}%) danger=${dangerEmoji[aiResult.danger_level] || '⚪'} ${aiResult.danger_level || 'N/A'}`);
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

    let query = 'SELECT * FROM reports';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const reports = db.prepare(query).all(...params);
    const total = db.prepare(`SELECT COUNT(*) as count FROM reports${status ? ' WHERE status = ?' : ''}`).get(...(status ? [status] : []));

    return res.json({
      total: total.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      reports,
    });
  } catch (err) {
    console.error('[GET /reports]', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ── GET /api/reports/:id ─────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
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

    const db = getDb();
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
// Re-triggers AI detection for a report that is stuck on 'pending'
router.post('/:id/reanalyze', async (req, res) => {
  try {
    const db = getDb();
    const report = db.prepare('SELECT * FROM reports WHERE report_id = ?').get(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const imagePath = `.${report.image_url}`; // image_url is like /uploads/xxx.jpg
    if (!require('fs').existsSync(imagePath)) {
      return res.status(400).json({ error: `Image file not found at ${imagePath}` });
    }

    res.json({ message: `Re-analysis started for report ${req.params.id}`, report_id: report.report_id });

    // Fire-and-forget AI detection
    detectDefect(imagePath)
      .then((aiResult) => {
        const updateStmt = db.prepare(`
          UPDATE reports
          SET defect_type = ?, ai_confidence = ?, severity = ?,
              danger_level = ?, danger_priority = ?, bbox = ?
          WHERE report_id = ?
        `);
        updateStmt.run(
          aiResult.defect_type,
          aiResult.confidence,
          aiResult.severity || null,
          aiResult.danger_level || null,
          aiResult.danger_priority || null,
          aiResult.bbox,
          report.report_id
        );
        const dangerEmoji = { critical: '🔴', moderate: '🟡', minor: '🟢' };
        console.log(`[AI] Reanalysis ${report.report_id} → ${aiResult.defect_type} (${(aiResult.confidence * 100).toFixed(1)}%) danger=${dangerEmoji[aiResult.danger_level] || '⚪'} ${aiResult.danger_level || 'N/A'}`);
      })
      .catch((err) => {
        console.error(`[AI] Reanalysis failed for report ${report.report_id}:`, err.message);
      });
  } catch (err) {
    console.error('[POST /reports/:id/reanalyze]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
