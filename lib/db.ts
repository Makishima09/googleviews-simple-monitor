import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'reviews.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Database instance
let db: SqlJsDatabase | null = null;
let initPromise: Promise<SqlJsDatabase> | null = null;

// Initialize and return db promise
async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log('[DB] Initializing sql.js...');
    const SQL = await initSqlJs();
    
    // Load existing or create new
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('[DB] Loaded existing database from', DB_PATH);
    } else {
      db = new SQL.Database();
      console.log('[DB] Created new database at', DB_PATH);
    }

    // Create schema
    createTables();
    console.log('[DB] Schema created');
    
    // Save initially
    saveDatabase();
    
    return db;
  })();

  return initPromise;
}

// Create tables
function createTables() {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT NOT NULL,
      review_id TEXT UNIQUE NOT NULL,
      author_name TEXT,
      rating INTEGER,
      text TEXT,
      date TEXT,
      content_hash TEXT,
      deleted_at TEXT,
      retrieved_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (place_id) REFERENCES places(place_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT NOT NULL,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT,
      new_reviews INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running',
      error TEXT,
      FOREIGN KEY (place_id) REFERENCES places(place_id)
    )
  `);

  // Indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_content_hash ON reviews(content_hash)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sync_log_place_id ON sync_log(place_id)`);

  db.run(`
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      telegram_chat_id TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'viewer' CHECK(role IN ('admin', 'viewer')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      place_id TEXT NOT NULL,
      role TEXT DEFAULT 'viewer' CHECK(role IN ('admin', 'viewer')),
      notify_new INTEGER DEFAULT 1,
      notify_modified INTEGER DEFAULT 1,
      notify_deleted INTEGER DEFAULT 0,
      notify_rating INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, place_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Save database to file
export function saveDatabase() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// Run SQL (INSERT, UPDATE, DELETE)
export function run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const lastId = stmt.get()[0] as number || 0;
  stmt.free();
  const changes = db.getRowsModified();
  saveDatabase();
  return { lastInsertRowid: lastId, changes };
}

// Get all rows
export function all<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

// Get one row
export function get<T = any>(sql: string, params: any[] = []): T | undefined {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let result: T | undefined;
  if (stmt.step()) {
    result = stmt.getAsObject() as T;
  }
  stmt.free();
  return result;
}

// Wait for DB and return it
export async function waitForDb(): Promise<SqlJsDatabase> {
  return initDb();
}

// Export initialization
export const initDatabase = initDb;

// Export for default
export default { run, all, get, initDatabase, saveDatabase };