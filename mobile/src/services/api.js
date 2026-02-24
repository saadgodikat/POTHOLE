// ─────────────────────────────────────────────────────────────────────────────
// API Service — centralized Axios instance for RoadWatch mobile app
// ─────────────────────────────────────────────────────────────────────────────
import axios from 'axios';

// Update this to your machine's local IP when testing on a physical device.
// e.g. 'http://192.168.1.100:3000'
const BASE_URL = 'http://10.86.6.233:3000';
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

/**
 * Submit a road defect report.
 * @param {Object} params
 * @param {string} params.imageUri    - Local URI of the captured image
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} [params.description]
 * @param {number} [params.userId]
 */
export async function submitReport({ imageUri, latitude, longitude, description, userId }) {
  const formData = new FormData();

  // React Native file attachment format
  formData.append('image', {
    uri: imageUri,
    name: 'report.jpg',
    type: 'image/jpeg',
  });
  formData.append('latitude', String(latitude));
  formData.append('longitude', String(longitude));
  if (description) formData.append('description', description);
  if (userId)      formData.append('user_id', String(userId));

  const response = await api.post('/api/report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).catch((err) => {
    // Provide descriptive network errors
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

export default api;
