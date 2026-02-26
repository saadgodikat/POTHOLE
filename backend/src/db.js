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
 * Runs missing-column migrations BEFORE executing schema.sql so that
 * any CREATE INDEX statements in the schema never reference unknown columns.
 */
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // ── Step 1: Add any missing columns FIRST ──────────────────────────────
    // We do this before running schema.sql because the schema may contain
    // CREATE INDEX statements that reference columns which only exist after
    // an ALTER TABLE migration (e.g. quality_score, gps_accuracy, etc.).
    const existingCols = () =>
      db.prepare('PRAGMA table_info(reports)').all().map((r) => r.name);

    // Only run column migrations if the table already exists (i.e. not a
    // brand-new database — schema.sql will create everything from scratch).
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reports'")
      .get();

    if (tableExists) {
      const cols = existingCols();
      const addIfMissing = (col, type) => {
        if (!cols.includes(col)) {
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
      // Phase 1: GPS precision & client-side timestamp
      addIfMissing('captured_at',     'DATETIME');
      addIfMissing('gps_accuracy',    'REAL');
      // Phase 2: Quality score
      addIfMissing('quality_score',   'REAL');
      // Admin Side: Assignment & Status
      addIfMissing('assigned_to',     'TEXT');
      addIfMissing('assigned_date',   'DATETIME');
    }

    // ── Step 2: Run schema.sql (safe now — all columns exist) ────────────
    if (fs.existsSync(SCHEMA_PATH)) {
      try {
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        db.exec(schema);
        console.log('[DB] Schema initialized from schema.sql');
      } catch (err) {
        // Schema errors on existing DBs are usually harmless constraint
        // conflicts — log and continue rather than crashing the server.
        console.warn('[DB] Schema exec warning (non-fatal):', err.message);
      }
    } else {
      console.warn('[DB] schema.sql not found — running without auto-init');
    }
  }
  return db;
}

module.exports = { getDb };

