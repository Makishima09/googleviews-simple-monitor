import { db } from './schema';

const MIGRATIONS_TABLE = 'migrations';

export function initMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Define migrations - currently just placeholder since main schema is in initSchema
const migrations: Record<string, string> = {
  '001_initial': `
    -- Initial schema handled by initSchema()
  `
};

export function runMigrations() {
  initMigrations();

  // Get list of applied migrations
  const applied = db.prepare(`SELECT name FROM ${MIGRATIONS_TABLE}`).all() as { name: string }[];
  const appliedNames = new Set(applied.map(m => m.name));

  let migrationCount = 0;
  for (const [name, sql] of Object.entries(migrations)) {
    if (!appliedNames.has(name)) {
      console.log(`[MIGRATIONS] Running: ${name}`);
      if (sql.trim() && !sql.includes('handled by')) {
        db.exec(sql);
      }
      db.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`).run(name);
      migrationCount++;
    }
  }

  if (migrationCount > 0) {
    console.log(`[MIGRATIONS] Completed ${migrationCount} migrations`);
  } else {
    console.log('[MIGRATIONS] All migrations already applied');
  }
}