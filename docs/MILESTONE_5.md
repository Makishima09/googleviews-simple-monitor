# Milestone 5: Deduplicación con Hashes

## Objetivo

Implementar sistema de deduplicación robusto usando hashes para detectar contenido duplicado o modificado, y detección de reseñas eliminadas.

**Dependencias previas**: Milestone 4 completado (notificaciones SQLite).

**Duración estimada**: 1–2 días.

---

## Entregables

1. Campo `content_hash` en tabla reviews
2. Función para calcular hash canónico
3. Comparación efectiva para detección de nuevas reseñas
4. Detección de reseñas modificadas
5. Soft delete para reseñas eliminadas
6. Revisión periódica completa

---

## Paso 1: Añadir Campo Hash

Modificar `lib/db/schema.ts`:

```typescript
// Añadir columna hash a reviews
db.exec(`
  ALTER TABLE reviews ADD COLUMN content_hash TEXT;
`);

// Crear índice si no existe
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_reviews_content_hash ON reviews(content_hash);
`);
```

---

## Paso 2: Función de Hash

Crear `lib/hashing.ts`:

```typescript
import crypto from 'crypto';

export function calculateContentHash(review: {
  author_name?: string | null;
  text?: string | null;
  rating?: number | null;
  date?: string | null;
}): string {
  // Normalizar datos para hash consistente
  const normalized = [
    review.author_name?.trim() || '',
    review.text?.trim() || '',
    String(review.rating || ''),
    review.date || ''
  ].join('|');

  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .substring(0, 16);
}

export function deriveReviewId(
  placeId: string,
  authorName: string,
  timestamp: number
): string {
  // Generar ID derivado como fallback
  const data = `${placeId}|${authorName}|${timestamp}`;
  return crypto
    .createHash('md5')
    .update(data)
    .digest('hex');
}
```

---

## Paso 3: Queries Mejoradas

Modificar `lib/db/reviews.ts`:

```typescript
import { calculateContentHash } from '@/lib/hashing';

export interface Review extends ReviewBase {
  content_hash?: string | null;
}

export function getReviewByHash(hash: string): Review | undefined {
  return db.prepare(
    'SELECT * FROM reviews WHERE content_hash = ?'
  ).get(hash) as Review | undefined;
}

export function getReviewByHashOrDerived(
  hash: string,
  derivedId: string
): Review | undefined {
  return db.prepare(`
    SELECT * FROM reviews 
    WHERE content_hash = ? OR review_id = ?
  `).get(hash, derivedId) as Review | undefined;
}

export function insertReviewWithHash(
  review: Omit<Review, 'id' | 'retrieved_at' | 'content_hash'>
): number {
  const hash = calculateContentHash(review);
  
  return db.prepare(`
    INSERT OR IGNORE INTO reviews 
    (place_id, review_id, author_name, rating, text, date, content_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    review.place_id,
    review.review_id,
    review.author_name,
    review.rating,
    review.text,
    review.date,
    hash
  ).lastInsertRowid as number;
}

export function updateReviewHash(id: number, hash: string): void {
  db.prepare(`
    UPDATE reviews SET content_hash = ? WHERE id = ?
  `).run(hash, id);
}

export function markReviewDeleted(id: number): void {
  db.prepare(`
    UPDATE reviews 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND deleted_at IS NULL
  `).run(id);
}

export function getActiveReviews(placeId: string): Review[] {
  return db.prepare(`
    SELECT * FROM reviews 
    WHERE place_id = ? AND deleted_at IS NULL
    ORDER BY date DESC
  `).all(placeId) as Review[];
}
```

---

## Paso 4: Sync con Deduplicación

Modificar `app/api/internal/sync/route.ts`:

```typescript
import { 
  getReviewByHashOrDerived, 
  insertReviewWithHash,
  updateReviewHash 
} from '@/lib/db/reviews';
import { calculateContentHash, deriveReviewId } from '@/lib/hashing';

async function syncPlace(placeId: string, apiKey: string) {
  const url = `...`;
  const data = await fetch(url).then(r => r.json());

  const existingReviews = getActiveReviews(placeId);
  const existingHashes = new Set(existingReviews.map(r => r.content_hash));
  const newReviews: any[] = [];
  const modifiedReviews: any[] = [];

  for (const review of data.result?.reviews || []) {
    const hash = calculateContentHash(review);
    const derivedId = deriveReviewId(placeId, review.author_name, review.time);
    
    const existing = getReviewByHashOrDerived(hash, derivedId);

    if (!existing) {
      // Nueva review
      insertReviewWithHash({
        place_id: placeId,
        review_id: review.review_id || derivedId,
        author_name: review.author_name,
        rating: review.rating,
        text: review.text,
        date: review.time
      });
      newReviews.push(review);
    } else if (existing.content_hash !== hash) {
      // Review modificada
      updateReviewHash(existing.id, hash);
      modifiedReviews.push(review);
    }
  }

  // Detectar eliminadas
  const currentHashes = new Set(
    data.result?.reviews?.map(r => calculateContentHash(r)) || []
  );
  const deletedReviews = existingReviews.filter(
    r => r.content_hash && !currentHashes.has(r.content_hash)
  );
  
  for (const review of deletedReviews) {
    markReviewDeleted(review.id);
  }

  return {
    newReviews: newReviews.length,
    modifiedReviews: modifiedReviews.length,
    deletedReviews: deletedReviews.length
  };
}
```

---

## Paso 5: Revisión Periódica

Crear `app/api/internal/review/route.ts` (opcional):

```typescript
import { NextResponse } from 'next/server';
import { getActiveReviews } from '@/lib/db/reviews';
import { calculateContentHash } from '@/lib/hashing';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { placeId } = await request.json();
  const allReviews = await getFullSync(placeId);
  
  // Verificar hashes y marcar inconsistencies
  let updated = 0;
  for (const review of allReviews) {
    const expectedHash = calculateContentHash(review);
    if (review.content_hash !== expectedHash) {
      await updateReviewHash(review.id, expectedHash);
      updated++;
    }
  }

  return NextResponse.json({ checked: allReviews.length, updated });
}
```

---

## Checklist de Verificación

- [ ] Campo `content_hash` añadido a tabla reviews
- [ ] Función `calculateContentHash()` funcionando
- [ ] `insertReviewWithHash()` detecta duplicados por hash
- [ ] Detección de reseñas modificadas (hash diferente)
- [ ] Soft delete para reseñas eliminadas
- [ ] Sync usa deduplicación efectiva
- [ ] Stats muestran new/modified/deleted
- [ ] Test: sync detecta nueva review correctamente
- [ ] Test: sync detecta review modificada
- [ ] Test: sync detecta review eliminada

---

## Notas Adicionales

- **Hash vs ID original**: Usar hash como identificador principal porque la API de Google no garantiza IDs estables
- **Comparación profunda**: El hash incluye autor, texto, rating y fecha
- **Revisión periódica**: Ejecutar full reviewdaily para detectar modificaciones
- **Siguiente milestone**: M6 - Multi-negocio + usuarios (pendiente)

---

## Referencias

- Schema: `lib/db/schema.ts`
- Queries: `lib/db/reviews.ts`
- Hashing: `lib/hashing.ts`
- Sync: `app/api/internal/sync/route.ts`
- Milestone anterior: Milestone 4
- Siguiente milestone: **Multi-negocio** (Milestone 6)

---

## Roadmap (progreso)

| Milestone | Estado |
|-----------|--------|
| M1: Scheduler | ✅ Completado |
| M2: SQLite | ✅ Completado |
| M3: API | ✅ Completado |
| M4: Notificaciones | ✅ Completado |
| M5: Deduplicación | ✅ Completado |
| M6: Multi-negocio | ⏳ Pendiente |