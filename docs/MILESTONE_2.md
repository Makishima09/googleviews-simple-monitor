# Milestone 2: SQLite Schema y Migraciones

## Objetivo

Integrar SQLite para almacenar las reseñas de Google de forma persiste, con schema definido y migraciones automáticas.

**Dependencias previas**: Milestone 1 completado (endpoint `/api/internal/sync` funcionando).

**Duración estimada**: 1–2 días.

---

## Entregables

1. Schema de base de datos SQLite
2. Sistema de migraciones automático
3. Integración con endpoint de sync para guardar reviews
4. Queries para obtener reviews históricas
5. seed data inicial (opcional)

---

## Paso 1: Dependencias

Instalar `better-sqlite3` (SQLite3 nativo para Node.js):

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

---

## Paso 2: Schema de Base de Datos

Crear archivo `lib/db/schema.ts`:

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || './data/reviews.db';

export const db = new Database(DB_PATH);

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
  `);
}
```

---

## Paso 3: Migraciones

Crear archivo `lib/db/migrate.ts`:

```typescript
import { db } from './schema';
import fs from 'fs';
import path from 'path';

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

const migrations: Record<string, string> = {
  '001_initial': `
    -- Initial schema (handled by initSchema)
  `
};

export function runMigrations() {
  initMigrations();
  
  const applied = db.prepare(`SELECT name FROM ${MIGRATIONS_TABLE}`).all() as { name: string }[];
  const appliedNames = new Set(applied.map(m => m.name));

  for (const [name, sql] of Object.entries(migrations)) {
    if (!appliedNames.has(name)) {
      console.log(`[MIGRATIONS] Running: ${name}`);
      db.exec(sql);
      db.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`).run(name);
    }
  }
  
  console.log('[MIGRATIONS] Completed');
}
```

---

## Paso 4: Queries para Reviews

Crear archivo `lib/db/reviews.ts`:

```typescript
import { db } from './schema';

export interface Review {
  id: number;
  place_id: string;
  review_id: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  date: string | null;
  retrieved_at: string;
}

export interface Place {
  id: number;
  place_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export function getPlaces(): Place[] {
  return db.prepare('SELECT * FROM places ORDER BY name').all() as Place[];
}

export function getReviewsByPlace(placeId: string, limit = 50): Review[] {
  return db.prepare(`
    SELECT * FROM reviews 
    WHERE place_id = ? 
    ORDER BY date DESC 
    LIMIT ?
  `).all(placeId, limit) as Review[];
}

export function getReviewByExternalId(externalId: string): Review | undefined {
  return db.prepare('SELECT * FROM reviews WHERE review_id = ?').get(externalId) as Review | undefined;
}

export function insertReview(review: Omit<Review, 'id' | 'retrieved_at'>): number {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO reviews (place_id, review_id, author_name, rating, text, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    review.place_id,
    review.review_id,
    review.author_name,
    review.rating,
    review.text,
    review.date
  ).lastInsertRowid as number;
}

export function insertPlace(placeId: string, name?: string): number {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO places (place_id, name)
    VALUES (?, ?)
  `);
  return stmt.run(placeId, name).lastInsertRowid as number;
}

export function startSyncLog(placeId: string): number {
  const stmt = db.prepare(`
    INSERT INTO sync_log (place_id, status)
    VALUES (?, 'running')
  `);
  return stmt.run(placeId).lastInsertRowid as number;
}

export function finishSyncLog(
  id: number, 
  newReviews: number, 
  status: 'success' | 'error', 
  error?: string
): void {
  db.prepare(`
    UPDATE sync_log 
    SET finished_at = CURRENT_TIMESTAMP, new_reviews = ?, status = ?, error = ?
    WHERE id = ?
  `).run(newReviews, status, error || null, id);
}
```

---

## Paso 5: Integrar con Sync Endpoint

Modificar `app/api/internal/sync/route.ts` para usar la base de datos:

```typescript
import { initSchema, initMigrations, runMigrations } from '@/lib/db/schema';
import { initMigrations } from '@/lib/db/migrate';
import { 
  insertReview, 
  insertPlace, 
  startSyncLog, 
  finishSyncLog,
  getReviewByExternalId 
} from '@/lib/db/reviews';

// Inicializar DB al inicio
initSchema();
runMigrations();

// Modificar función syncPlace para guardar en DB
async function syncPlace(placeId: string, apiKey: string) {
  const logId = startSyncLog(placeId);
  
  try {
    const url = `...`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') {
      finishSyncLog(logId, 0, 'error', `Google API error: ${data.status}`);
      return { success: false, placeId, error: data.status };
    }

    const place = data.result;
    insertPlace(placeId, place.name);

    let newCount = 0;
    for (const review of place.reviews || []) {
      const exists = getReviewByExternalId(review.review_id);
      if (!exists) {
        insertReview({
          place_id: placeId,
          review_id: review.review_id,
          author_name: review.author_name,
          rating: review.rating,
          text: review.text,
          date: review.time
        });
        newCount++;
      }
    }

    finishSyncLog(logId, newCount, 'success');
    return { success: true, placeId, newReviews: newCount };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    finishSyncLog(logId, 0, 'error', msg);
    return { success: false, placeId, error: msg };
  }
}
```

---

## Paso 6: Directorio de Datos

Asegurar que el directorio `data/` existe y está en `.gitignore`:

```bash
mkdir -p data
```

Verificar que `.gitignore` contiene:
```
data/
*.db
*.db-journal
```

---

## Checklist de Verificación

- [ ] `better-sqlite3` instalado y funcionando
- [ ] Schema creado con tablas: places, reviews, sync_log
- [ ] Índices creados para queries eficientes
- [ ] Migraciones inicializadas
- [ ] Queries implementados: getPlaces, getReviewsByPlace, insertReview, etc.
- [ ] Sync endpoint guarda reviews en SQLite
- [ ] Sync endpoint registra logs de sincronización
- [ ] Directorio `data/` en `.gitignore`
- [ ] Test: ejecutar sync y verificar datos en SQLite
- [ ] Test: obtener reviews desde endpoint

---

## Notas Adicionales

- **SQLite en Producción**: Considerar usar Vercel Postgres o similar si el volumen es alto.
- **Migraciones Versionadas**: Mantener un historial de migraciones aplicadas.
- **Backups**: SQLite es un archivo; configurar backups regulares.
- **Next Milestone**: Añadir endpoint público para mostrar reviews con filtro por fecha.

---

## Referencias

- Schema actual: `lib/db/schema.ts`
- Queries: `lib/db/reviews.ts`
- Endpoint sync: `app/api/internal/sync/route.ts`
- Milestone anterior: Milestone 1
- Siguiente milestone: **API Pública de Reviews** (Milestone 3)