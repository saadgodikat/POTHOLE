const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.35');

/**
 * Send an image file to the Python AI detection service.
 * @param {string} imagePath - Absolute path to the uploaded image
 */
async function detectDefect(imagePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath));

  let response;
  try {
    response = await axios.post(`${AI_SERVICE_URL}/detect`, form, {
      headers: form.getHeaders(),
      timeout: 60000, // 60 s — first call downloads the model
    });
  } catch (err) {
    // Provide a clear error message for common failure modes
    if (err.code === 'ECONNREFUSED') {
      throw new Error(`AI service not reachable at ${AI_SERVICE_URL}. Is uvicorn running?`);
    }
    if (err.response) {
      const detail = err.response.data?.detail || err.response.statusText;
      throw new Error(`AI service error ${err.response.status}: ${detail}`);
    }
    throw new Error(`AI request failed: ${err.message}`);
  }

  const {
    defect_type, confidence, severity, bbox,
    danger_level, danger_label, danger_priority,
  } = response.data;

  return {
    defect_type:     defect_type     || null,
    confidence:      confidence      || 0,
    severity:        severity        || null,
    danger_level:    danger_level    || null,    // "critical" | "moderate" | "minor"
    danger_label:    danger_label    || null,    // human-readable danger description
    danger_priority: danger_priority || null,    // 1 (most dangerous) → 3 (least)
    bbox:            bbox ? JSON.stringify(bbox) : null,
    is_valid:        (confidence || 0) >= CONFIDENCE_THRESHOLD,
  };
}

module.exports = { detectDefect };
