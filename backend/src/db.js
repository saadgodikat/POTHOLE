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
      addIfMissing('completion_image', 'TEXT');
      addIfMissing('completion_notes', 'TEXT');
      addIfMissing('completed_at',     'DATETIME');

      // Update technicians table if it already exists
      const techCols = () => db.prepare('PRAGMA table_info(technicians)').all().map((r) => r.name);
      const techTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='technicians'").get();
      if (techTableExists) {
        const tCols = techCols();
        if (!tCols.includes('passcode')) {
          db.prepare("ALTER TABLE technicians ADD COLUMN passcode TEXT DEFAULT '1234'").run();
          console.log("[DB] Migration: added column 'passcode' to technicians");
        }
      }
    }

    // ── Step 1.5: Ensure technicians table exists ──────────────────────
    db.prepare(`
        CREATE TABLE IF NOT EXISTS technicians (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          name        TEXT    NOT NULL UNIQUE,
          specialty   TEXT,
          phone       TEXT,
          passcode    TEXT    NOT NULL DEFAULT '1234',
          status      TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Seed technicians if empty
      const techCount = db.prepare('SELECT COUNT(*) as count FROM technicians').get().count;
      if (techCount === 0) {
        console.log('[DB] Seeding default technicians...');
        const seedTechs = [
          ['Rajesh Kumar', 'Pothole Specialist', '+91 98765 43210', '1234'],
          ['Amit Patel', 'Surface Damage Expert', '+91 98234 56789', '1234'],
          ['Suresh Raina', 'Emergency Response', '+91 91234 56780', '1234'],
          ['Vikram Singh', 'Road Maintenance', '+91 88776 65544', '1234']
        ];
        const insert = db.prepare('INSERT INTO technicians (name, specialty, phone, passcode) VALUES (?, ?, ?, ?)');
        seedTechs.forEach(tech => insert.run(...tech));
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

