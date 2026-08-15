const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Ensure the database file is placed in the backend folder
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new DatabaseSync(dbPath);

console.log(`[Database] Connected to SQLite database at ${dbPath}`);

// Initialize schemas
function initDb() {
  console.log('[Database] Running migrations...');

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL, -- 'civilian' | 'admin'
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      priority_score INTEGER NOT NULL,
      status TEXT NOT NULL, -- 'Reported' | 'AI Analysed' | 'Verified' | 'Assigned' | 'Dispatched' | 'In Progress' | 'Resolved' | 'Closed'
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT,
      assigned_worker TEXT,
      dispatch_notes TEXT,
      resolution_evidence_url TEXT,
      resolved_at TIMESTAMP,
      closed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      citizen_id TEXT NOT NULL,
      incident_id TEXT,
      image_url TEXT NOT NULL,
      description TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT,
      ai_problem TEXT,
      ai_category TEXT,
      ai_severity TEXT,
      ai_summary TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS incident_status_history (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      status TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Indexes for faster lookups
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_incidents_coords ON incidents(latitude, longitude);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_reports_incident ON reports(incident_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_incident ON incident_status_history(incident_id);');

  console.log('[Database] Migrations completed successfully.');
}

// Wrapper methods for query execution
const query = {
  all(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    } catch (error) {
      console.error(`[Database Error] query.all failed: ${sql}`, error);
      throw error;
    }
  },

  get(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      return stmt.get(...params);
    } catch (error) {
      console.error(`[Database Error] query.get failed: ${sql}`, error);
      throw error;
    }
  },

  run(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      return stmt.run(...params);
    } catch (error) {
      console.error(`[Database Error] query.run failed: ${sql}`, error);
      throw error;
    }
  },

  exec(sql) {
    try {
      return db.exec(sql);
    } catch (error) {
      console.error(`[Database Error] query.exec failed`, error);
      throw error;
    }
  }
};

module.exports = {
  initDb,
  query,
  dbPath
};
