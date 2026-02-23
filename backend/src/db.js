const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/road_inspection.db';
const SCHEMA_PATH = path.join(__dirname, '../../database/schema.sql');

// Ensure the data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

/**
 * Initialize and return the SQLite database connection.
 * Auto-runs the schema on first launch.
 */
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run schema on first init
    if (fs.existsSync(SCHEMA_PATH)) {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      db.exec(schema);
      console.log('[DB] Schema initialized from schema.sql');
    } else {
      console.warn('[DB] schema.sql not found — running without auto-init');
    }

    // ── Auto-migrations (add new columns to existing DBs) ──────────────────
    // SQLite's CREATE TABLE IF NOT EXISTS won't add new columns to old DBs.
    // We use ALTER TABLE to safely add any missing columns.
    const existingCols = db.prepare('PRAGMA table_info(reports)').all().map((r) => r.name);
    const addIfMissing = (col, type) => {
      if (!existingCols.includes(col)) {
        db.prepare(`ALTER TABLE reports ADD COLUMN ${col} ${type}`).run();
        console.log(`[DB] Migration: added column '${col}' to reports`);
      }
    };
    // Core AI result columns
    addIfMissing('description',     'TEXT');
    addIfMissing('ai_confidence',   'REAL');
    addIfMissing('severity',        'TEXT');
    addIfMissing('bbox',            'TEXT');
    addIfMissing('created_at',      'DATETIME DEFAULT CURRENT_TIMESTAMP');
    // Danger classification columns (v3.0.0+)
    addIfMissing('danger_level',    'TEXT');
    addIfMissing('danger_priority', 'INTEGER');
  }
  return db;
}

module.exports = { getDb };
