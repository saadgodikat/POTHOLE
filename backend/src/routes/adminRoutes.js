const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');

/**
 * GET /api/admin/reports
 * Returns reports grouped by categories: emergency, moderate, and paused.
 */
router.get('/reports', (req, res) => {
  try {
    const db = getDb();
    
    // Emergency: danger_level = 'critical', excluding paused and completed
    const emergency = db.prepare("SELECT * FROM reports WHERE danger_level = 'critical' AND status NOT IN ('paused', 'green') ORDER BY created_at DESC").all();
    
    // Moderate: danger_level = 'moderate', excluding paused and completed
    const moderate = db.prepare("SELECT * FROM reports WHERE danger_level = 'moderate' AND status NOT IN ('paused', 'green') ORDER BY created_at DESC").all();
    
    // Paused: status = 'paused'
    const paused = db.prepare("SELECT * FROM reports WHERE status = 'paused' ORDER BY created_at DESC").all();

    // Completed: status = 'green'
    const completed = db.prepare("SELECT * FROM reports WHERE status = 'green' ORDER BY created_at DESC").all();
    
    res.json({
      emergency,
      moderate,
      paused,
      completed
    });
  } catch (err) {
    console.error('[GET /admin/reports]', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * PATCH /api/admin/reports/:id/assign
 * Assign a technician/team to a report.
 */
router.patch('/reports/:id/assign', (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;
    
    if (!assigned_to) {
      return res.status(400).json({ error: 'assigned_to is required' });
    }
    
    const db = getDb();
    const assigned_date = new Date().toISOString();
    
    const result = db.prepare(`
      UPDATE reports 
      SET assigned_to = ?, 
          assigned_date = ?, 
          status = 'orange' 
      WHERE report_id = ?
    `).run(assigned_to, assigned_date, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const updated = db.prepare('SELECT * FROM reports WHERE report_id = ?').get(id);
    res.json({ message: 'Work assigned successfully', report: updated });
  } catch (err) {
    console.error('[PATCH /admin/reports/:id/assign]', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * PATCH /api/admin/reports/:id/status
 * Update report status (including 'paused').
 */
router.patch('/reports/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['red', 'orange', 'green', 'paused'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }
    
    const db = getDb();
    const result = db.prepare('UPDATE reports SET status = ? WHERE report_id = ?').run(status, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const updated = db.prepare('SELECT * FROM reports WHERE report_id = ?').get(id);
    res.json({ message: 'Status updated successfully', report: updated });
  } catch (err) {
    console.error('[PATCH /admin/reports/:id/status]', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /api/admin/technicians
 * List all technicians.
 */
router.get('/technicians', (req, res) => {
  try {
    const db = getDb();
    const technicians = db.prepare('SELECT * FROM technicians ORDER BY name ASC').all();
    res.json(technicians);
  } catch (err) {
    console.error('[GET /admin/technicians]', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /api/admin/technicians/:name/history
 * Get work history for a specific technician.
 */
router.get('/technicians/:name/history', (req, res) => {
  try {
    const { name } = req.params;
    const db = getDb();
    const history = db.prepare('SELECT * FROM reports WHERE assigned_to = ? ORDER BY assigned_date DESC').all(name);
    res.json(history);
  } catch (err) {
    console.error('[GET /admin/technicians/:name/history]', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
