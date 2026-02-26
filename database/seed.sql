-- ============================================================
-- AI Road Inspection System — Seed Data (Dev Only)
-- ============================================================

INSERT INTO users (name, email, role) VALUES
  ('Alice Inspector', 'alice@roadwatch.io', 'admin'),
  ('Bob Reporter',    'bob@roadwatch.io',   'user'),
  ('Charlie Field',   'charlie@roadwatch.io','user');

-- Seed reports now include: captured_at, gps_accuracy, quality_score
-- quality_score: 0–10  (10 = perfect road, 0 = critical damage)
INSERT INTO reports
  (user_id, image_url, latitude, longitude, captured_at, gps_accuracy,
   description, defect_type, ai_confidence, danger_level, danger_priority,
   severity, quality_score, status)
VALUES
  (2, '/uploads/sample1.jpg', 28.6139, 77.2090,
   '2026-02-25T08:00:00Z', 5.2,
   'Deep pothole near main junction', 'pothole', 0.91, 'critical', 1,
   'high',  2.1, 'red'),

  (3, '/uploads/sample2.jpg', 28.5355, 77.3910,
   '2026-02-25T09:30:00Z', 11.8,
   'Wide crack along road edge', 'pothole', 0.78, 'moderate', 2,
   'medium', 4.8, 'orange'),

  (2, '/uploads/sample3.jpg', 28.7041, 77.1025,
   '2026-02-25T11:00:00Z', 8.0,
   'Surface erosion after rain', 'pothole', 0.65, 'minor', 3,
   'low',   7.5, 'green'),

  (3, '/uploads/sample4.jpg', 28.6250, 77.2200,
   '2026-02-26T07:00:00Z', 6.1,
   'Large pothole causing traffic snarl', 'pothole', 0.96, 'critical', 1,
   'high',  1.4, 'red'),

  (2, '/uploads/sample5.jpg', 28.6180, 77.2100,
   '2026-02-26T07:45:00Z', 18.3,
   'Pothole cluster near roundabout', 'pothole', 0.55, 'moderate', 2,
   'medium', 5.6, 'red');
