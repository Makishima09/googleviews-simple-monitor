import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'reviews.db');

// Ensure data directory exists
import fs from 'fs';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Auto-initialize schema when module is loaded
initSchema();

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT NOT NULL,
      review_id TEXT UNIQUE NOT NULL,
      author_name TEXT,
      rating INTEGER,
      text TEXT,
      date TEXT,
      retrieved_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (place_id) REFERENCES places(place_id)
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT NOT NULL,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT,
      new_reviews INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running',
      error TEXT,
      FOREIGN KEY (place_id) REFERENCES places(place_id)
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(date);
    CREATE INDEX IF NOT EXISTS idx_sync_log_place_id ON sync_log(place_id);

    -- Tabla de notificaciones
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id TEXT NOT NULL,
      place_id TEXT NOT NULL,
      channel TEXT DEFAULT 'telegram',
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      next_attempt_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sent_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_next_attempt ON notifications(next_attempt_at);
  `);

  console.log('[DB] Schema initialized');
}