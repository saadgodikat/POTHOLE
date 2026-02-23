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
  report_id     INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER  REFERENCES users(id) ON DELETE SET NULL,
  image_url     TEXT     NOT NULL,
  latitude      REAL     NOT NULL,
  longitude     REAL     NOT NULL,
  timestamp     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description   TEXT,
  defect_type   TEXT,                          -- populated by AI service
  ai_confidence REAL,                          -- 0.0 – 1.0
  severity      TEXT CHECK(severity IN ('low','medium','high')), -- legacy severity rating
  danger_level  TEXT CHECK(danger_level IN ('critical','moderate','minor')), -- AI danger level
  danger_priority INTEGER,                     -- 1 (critical) → 3 (minor)
  bbox          TEXT,                          -- JSON array [x1,y1,x2,y2] optional
  status        TEXT NOT NULL DEFAULT 'red'
                CHECK(status IN ('red', 'orange', 'green')),
  -- red    = work to be assigned
  -- orange = work assigned
  -- green  = work completed
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_status    ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_user_id   ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_timestamp  ON reports(timestamp);
