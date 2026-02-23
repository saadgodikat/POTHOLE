-- ============================================================
-- AI Road Inspection System — Seed Data (Dev Only)
-- ============================================================

INSERT INTO users (name, email, role) VALUES
  ('Alice Inspector', 'alice@roadwatch.io', 'admin'),
  ('Bob Reporter',    'bob@roadwatch.io',   'user'),
  ('Charlie Field',   'charlie@roadwatch.io','user');

INSERT INTO reports (user_id, image_url, latitude, longitude, description, defect_type, ai_confidence, status) VALUES
  (2, '/uploads/sample1.jpg', 28.6139, 77.2090, 'Deep pothole near main junction', 'pothole',  0.91, 'red'),
  (3, '/uploads/sample2.jpg', 28.5355, 77.3910, 'Wide crack along road edge',      'crack',     0.78, 'orange'),
  (2, '/uploads/sample3.jpg', 28.7041, 77.1025, 'Surface erosion after rain',       'erosion',  0.65, 'green');
