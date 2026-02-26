// ─────────────────────────────────────────────────────────────────────────────
// API Service — centralized Axios instance for StreetIntel mobile app
// ─────────────────────────────────────────────────────────────────────────────
import axios from 'axios';

// Update this to your machine's local IP when testing on a physical device.
// e.g. 'http://192.168.1.100:3000'
export const BASE_URL = 'http://192.168.228.233:3000';
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

/**
 * Submit a road defect report.
 * @param {Object} params
 * @param {string} params.imageUri     - Local URI of the captured image
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} [params.description]
 * @param {number} [params.userId]
 * @param {number} [params.gpsAccuracy]  - GPS accuracy in metres             [Phase 1]
 * @param {string} [params.capturedAt]   - ISO 8601 timestamp of capture      [Phase 1]
 */
export async function submitReport({
  imageUri, latitude, longitude, description, userId,
  gpsAccuracy, capturedAt,
}) {
  const formData = new FormData();

  // React Native file attachment format
  formData.append('image', {
    uri:  imageUri,
    name: 'report.jpg',
    type: 'image/jpeg',
  });
  formData.append('latitude',  String(latitude));
  formData.append('longitude', String(longitude));
  if (description) formData.append('description',   description);
  if (userId)      formData.append('user_id',        String(userId));
  // Phase 1: GPS precision & client-side timestamp
  if (gpsAccuracy != null) formData.append('gps_accuracy', String(gpsAccuracy));
  if (capturedAt)          formData.append('captured_at',  capturedAt);

  const response = await api.post('/api/report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).catch((err) => {
    if (err.code === 'ECONNABORTED') throw new Error('Request timed out. Is the backend running?');
    if (err.response) throw new Error(`Server error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
    throw new Error(`Network error: ${err.message} — Check BASE_URL (${BASE_URL}) in api.js`);
  });
  return response.data;
}

/**
 * Fetch all reports (newest first).
 * @param {Object} [params]
 * @param {string} [params.status]   - Filter by status (red|orange|green)
 * @param {number} [params.limit]
 * @param {number} [params.offset]
 */
export async function fetchReports(params = {}) {
  const response = await api.get('/api/reports', { params });
  return response.data;
}

/**
 * Fetch a single report by ID.
 */
export async function fetchReport(reportId) {
  const response = await api.get(`/api/reports/${reportId}`);
  return response.data;
}

/**
 * Update report data (e.g. description).
 */
export async function updateReport(reportId, data) {
  const response = await api.patch(`/api/reports/${reportId}`, data);
  return response.data;
}

/**
 * Fetch geospatial heatmap data (Phase 3).
 * Returns a GeoJSON FeatureCollection of aggregated road-quality cells.
 * @param {Object} [params]
 * @param {number} [params.grid_size]    - Grid size in decimal degrees (default 0.005 ≈ 500m)
 * @param {number} [params.min_reports]  - Min reports per cell (default 1)
 * @param {string} [params.status]       - Filter by status
 * @param {string} [params.danger_level] - Filter by danger level
 */
export async function fetchHeatmap(params = {}) {
  const response = await api.get('/api/reports/heatmap', { params });
  return response.data;
}

export default api;

