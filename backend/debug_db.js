const Database = require('better-sqlite3');
const db = new Database('./data/road_inspection.db');
try {
  const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reports'").get().sql;
  console.log('--- SCHEMA START ---');
  console.log(sql);
  console.log('--- SCHEMA END ---');
  
  // Try to update an existing record to 'paused'
  const firstReport = db.prepare("SELECT report_id FROM reports LIMIT 1").get();
  if (firstReport) {
    try {
      db.prepare("UPDATE reports SET status = 'paused' WHERE report_id = ?").run(firstReport.report_id);
      console.log('TEST_UPDATE: SUCCESS');
    } catch (e) {
      console.log('TEST_UPDATE: FAIL - ' + e.message);
    }
  } else {
    console.log('TEST_UPDATE: NO_REPORTS');
  }
} catch (e) {
  console.log('ERROR: ' + e.message);
}
