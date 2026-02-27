const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = './data/road_inspection.db';
const db = new Database(DB_PATH);

try {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reports'").get().sql;
  
  if (!schema.includes("'paused'")) {
    console.log('[MIGRATION] Status constraint is missing "paused". Starting migration...');
    
    // 1. Get all columns from reports_old to build the INSERT statement
    const columns = db.prepare('PRAGMA table_info(reports)').all().map(c => c.name);
    const colList = columns.join(', ');

    db.transaction(() => {
      // 2. Rename old table
      db.prepare('ALTER TABLE reports RENAME TO reports_old').run();
      
      // 3. Create new table (use the definition from schema.sql but without IF NOT EXISTS)
      // I'll use a simplified version of the CREATE TABLE to ensure it matches the old columns
      // but with the NEW constraint.
      const newTableSql = schema.replace(
        /CHECK\(status IN \('red', 'orange', 'green'\)\)/,
        "CHECK(status IN ('red', 'orange', 'green', 'paused'))"
      );
      
      db.prepare(newTableSql).run();
      
      // 4. Copy data
      db.prepare(`INSERT INTO reports (${colList}) SELECT ${colList} FROM reports_old`).run();
      
      // 5. Drop old table
      db.prepare('DROP TABLE reports_old').run();
    })();
    
    console.log('[MIGRATION] Successfully updated reports table schema.');
  } else {
    console.log('[MIGRATION] Status constraint already includes "paused". No action needed.');
  }
} catch (e) {
  console.error('[MIGRATION] Failed:', e.message);
  process.exit(1);
}
