# Milestone 3: API Pública de Reviews

## Objetivo

Crear API pública para exponer las reseñas almacenadas en SQLite, con filtros por fecha, rating y búsqueda. Reemplaza el endpoint actual que Consulta Google directamente.

**Dependencias previas**: Milestone 2 completado (SQLite schema y migraciones).

**Duración estimada**: 1–2 días.

---

## Entregables

1. Endpoint público: `GET /api/reviews` (lee de SQLite)
2. Filtros: place_id, desde/hasta fecha, rating mínimo
3. Paginación
4. Endpoint para un solo place: `GET /api/places`
5. Migración de endpoint antiguo

---

## Paso 1: Endpoint de Places

Crear `app/api/places/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPlaces, getPlaceByPlaceId } from '@/lib/db/reviews';

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get('place_id');

  if (placeId) {
    const place = getPlaceByPlaceId(placeId);
    if (!place) {
      return NextResponse.json({ error: 'Place no encontrado' }, { status: 404 });
    }
    return NextResponse.json(place);
  }

  const places = getPlaces();
  return NextResponse.json({ places });
}
```

---

## Paso 2: Endpoint de Reviews

Crear `app/api/reviews/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getReviewsByPlace, getReviews } from '@/lib/db/reviews';

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get('place_id');
  const desde = request.nextUrl.searchParams.get('desde');
  const hasta = request.nextUrl.searchParams.get('hasta');
  const rating = request.nextUrl.searchParams.get('rating');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);

  let reviews;
  let total;

  if (placeId) {
    const result = getReviewsByPlace(placeId, limit, offset, {
      desde,
      hasta,
      rating: rating ? parseInt(rating, 10) : undefined
    });
    reviews = result.reviews;
    total = result.total;
  } else {
    const result = getReviews(limit, offset, { desde, hasta, rating });
    reviews = result.reviews;
    total = result.total;
  }

  return NextResponse.json({
    reviews,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + reviews.length < total
    }
  });
}
```

---

## Paso 3: Actualizar Queries

Modificar `lib/db/reviews.ts` para soportar filtros y paginación:

```typescript
export interface ReviewFilters {
  desde?: string;
  hasta?: string;
  rating?: number;
}

export function getReviewsByPlace(
  placeId: string, 
  limit = 50, 
  offset = 0,
  filters?: ReviewFilters
): { reviews: Review[]; total: number } {
  let where = 'place_id = ?';
  const params: any[] = [placeId];

  if (filters?.desde) {
    where += ' AND date >= ?';
    params.push(filters.desde);
  }
  if (filters?.hasta) {
    where += ' AND date <= ?';
    params.push(filters.hasta);
  }
  if (filters?.rating) {
    where += ' AND rating >= ?';
    params.push(filters.rating);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM reviews WHERE ${where}`);
  const { total } = countStmt.get(...params) as { total: number };

  const stmt = db.prepare(`
    SELECT * FROM reviews 
    WHERE ${where}
    ORDER BY date DESC 
    LIMIT ? OFFSET ?
  `);
  params.push(limit, offset);
  const reviews = stmt.all(...params) as Review[];

  return { reviews, total };
}

export function getReviews(
  limit = 50,
  offset = 0,
  filters?: ReviewFilters
): { reviews: Review[]; total: number } {
  let where = '1=1';
  const params: any[] = [];

  if (filters?.desde) {
    where += ' AND date >= ?';
    params.push(filters.desde);
  }
  if (filters?.hasta) {
    where += ' AND date <= ?';
    params.push(filters.hasta);
  }
  if (filters?.rating) {
    where += ' AND rating >= ?';
    params.push(filters.rating);
  }

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM reviews WHERE ${where}`);
  const { total } = countStmt.get(...params) as { total: number };

  const stmt = db.prepare(`
    SELECT * FROM reviews 
    WHERE ${where}
    ORDER BY date DESC 
    LIMIT ? OFFSET ?
  `);
  params.push(limit, offset);
  const reviews = stmt.all(...params) as Review[];

  return { reviews, total };
}

export function getPlaceByPlaceId(placeId: string): Place | undefined {
  return db.prepare('SELECT * FROM places WHERE place_id = ?').get(placeId) as Place | undefined;
}
```

---

## Paso 4: Endpoint de Estadísticas

Crear `app/api/stats/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/schema';

export async function GET() {
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM places) as places,
      (SELECT COUNT(*) FROM reviews) as reviews,
      (SELECT AVG(rating) FROM reviews WHERE rating IS NOT NULL) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE rating = 5) as five_stars,
      (SELECT COUNT(*) FROM reviews WHERE rating = 1) as one_star
  `).get();

  const recentSync = db.prepare(`
    SELECT * FROM sync_log 
    ORDER BY finished_at DESC 
    LIMIT 1
  `).get();

  return NextResponse.json({ stats, recentSync });
}
```

---

## Paso 5: Probar Endpoints

```bash
# Obtener todos los places
curl "http://localhost:3000/api/places"

# Obtener reviews con filtros
curl "http://localhost:3000/api/reviews?place_id=ChIJRcGimC7BlolrI3PqhQ3YpEk&rating=4&desde=2024-01-01"

# Obtener estadísticas
curl "http://localhost:3000/api/stats"
```

---

## Checklist de Verificación

- [x] Endpoint `/api/places` creado y funcionando
- [x] Endpoint `/api/reviews` lee de SQLite
- [x] Filtros: place_id, desde, hasta, rating
- [x] Paginación implementada (limit, offset)
- [x] `/api/stats` devuelve métricas
- [x] Queries actualizados con filtros
- [x] Test: todos los endpoints responden JSON válido
- [x] El endpoint antiguo (/api/reviews con Google API) queda como fallback
- [ ] Documentación actualizada

---

## Notas Adicionales

- **Fallback**: Mantener el endpoint antiguo que Consulta Google si SQLite no tiene datos aún.
- **Caché**: Considerar añadir cache con `stale-while-revalidate` si el volumen aumenta.
- **Siguiente milestone**: Sistema de notificaciones (Telegram), Milestone 4.

---

## Referencias

- Queries: `lib/db/reviews.ts`
- Endpoint sync: `app/api/internal/sync/route.ts`
- Milestone anterior: Milestone 2
- Siguiente milestone: **Sistema de Notificaciones** (Milestone 4)

---

## Roadmap (progreso)

| Milestone | Estado |
|-----------|--------|
| Milestone 1: Scheduler + Logging | ✅ Completado |
| Milestone 2: SQLite Schema | ✅ Completado |
| Milestone 3: API Pública | ✅ Completado |
| Milestone 4: Notificaciones | ⏳ Pendiente |
| Milestone 5: Deduplicación con hashes | ⏳ Pendiente |