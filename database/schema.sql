-- ============================================================
-- AI Road Inspection System — Database Schema
-- ============================================================

PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────
-- Table: users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,
  email     TEXT    NOT NULL UNIQUE,
  role      TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Table: reports
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  report_id       INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER  REFERENCES users(id) ON DELETE SET NULL,
  image_url       TEXT     NOT NULL,
  latitude        REAL     NOT NULL,
  longitude       REAL     NOT NULL,
  timestamp       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- ── Phase 1: GPS precision & client-side timestamp ──────
  captured_at     DATETIME,                    -- client-device timestamp (ISO 8601)
  gps_accuracy    REAL,                        -- GPS accuracy in metres (lower = better)
  -- ────────────────────────────────────────────────────────
  description     TEXT,
  defect_type     TEXT,                        -- populated by AI service
  ai_confidence   REAL,                        -- 0.0 – 1.0
  severity        TEXT CHECK(severity IN ('low','medium','high')), -- legacy severity rating
  danger_level    TEXT CHECK(danger_level IN ('critical','moderate','minor')),
  danger_priority INTEGER,                     -- 1 (critical) → 3 (minor)
  bbox            TEXT,                        -- JSON array [x1,y1,x2,y2]
  -- ── Phase 2: Quality score ───────────────────────────────
  quality_score   REAL,                        -- 0.0 – 10.0  (10 = perfect road, 0 = critical damage)
  -- ────────────────────────────────────────────────────────
  status          TEXT NOT NULL DEFAULT 'red'
                  CHECK(status IN ('red', 'orange', 'green', 'paused')),
  -- red    = work to be assigned
  -- orange = work assigned
  -- green  = work completed
  -- paused  = work stopped/paused
  assigned_to     TEXT,
  assigned_date   DATETIME,
  completion_image TEXT,
  completion_notes TEXT,
  completed_at     DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_status        ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_user_id       ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_timestamp     ON reports(timestamp);
CREATE INDEX IF NOT EXISTS idx_reports_lat_lng       ON reports(latitude, longitude);  -- Phase 3: heatmap spatial queries
CREATE INDEX IF NOT EXISTS idx_reports_quality_score ON reports(quality_score);        -- Phase 3: quality-based filtering

-- ─────────────────────────────────────────────
-- Table: technicians
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS technicians (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  specialty   TEXT,
  phone       TEXT,
  passcode    TEXT    NOT NULL DEFAULT '1234',
  status      TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
