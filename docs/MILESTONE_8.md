# Milestone 8: Mejoras y Optimizaciones

## Objetivo

Mejoras opcionales para pulir la aplicación: testing, autenticación robusta, exportación de datos, y optimizaciones de rendimiento.

**Dependencias previas**: Milestone 7 completado (UI Panel Admin).

**Duración estimada**: 2–3 días.

---

## Entregables

1. Tests de integración
2. Autenticación JWT (opcional)
3. Exportación CSV/PDF
4. Métricas avanzadas
5. Optimizaciones de rendimiento
6. Documentación API

---

## 1. Testing

### Tests Unitarios

```bash
# Instalar jest
npm install -D jest @testing-library/react @testing-library/jest-dom
```

```typescript
// __tests__/api/admin.test.ts
import { GET } from '@/app/api/admin/dashboard/route';

describe('Admin Dashboard API', () => {
  it('should return stats for admin', async () => {
    const req = new Request('/api/admin/dashboard');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
```

### Tests de Integración

```typescript
// __tests__/sync.test.ts
describe('Sync Integration', () => {
  it('should detect new reviews', async () => {
    // Setup: add place
    // Execute: run sync
    // Assert: new reviews detected
  });
  
  it('should send notifications', async () => {
    // Setup: create user, add place
    // Execute: trigger notification
    // Assert: telegram called
  });
});
```

**Checklist:**
- [ ] Tests unitarios para funciones utilitarias
- [ ] Tests de API para endpoints críticos
- [ ] Tests de integración para sync
- [ ] Coverage > 70%

---

## 2. Autenticación JWT (Opcional)

### Install

```bash
npm install jsonwebtoken jose
```

### Utilidades

```typescript
// lib/auth.ts
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function createToken(userId: number, role: string): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ userId: number; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number; role: string };
  } catch {
    return null;
  }
}
```

### Middleware

```typescript
// lib/middleware.ts
import { verifyToken } from '@/lib/auth';

export async function requireAuth(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('No token');
  }
  
  const payload = await verifyToken(token);
  if (!payload) {
    throw new Error('Invalid token');
  }
  
  return payload;
}

export async function requireAdmin(request: Request) {
  const payload = await requireAuth(request);
  if (payload.role !== 'admin') {
    throw new Error('Admin required');
  }
  return payload;
}
```

**Checklist:**
- [ ] JWT_SECRET configurado
- [ ] Función createToken()
- [ ] Función verifyToken()
- [ ] Middleware requireAuth
- [ ] Middleware requireAdmin
- [ ] APIs protegidas

---

## 3. Exportación de Datos

### API de Export

```typescript
// app/api/admin/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getReviewsByPlace } from '@/lib/db/reviews';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('place_id');
  const format = searchParams.get('format') || 'csv';
  
  const reviews = placeId 
    ? getReviewsByPlace(placeId, 10000)
    : getAllReviews();
  
  if (format === 'csv') {
    const csv = convertToCSV(reviews);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=reviews.csv'
      }
    });
  }
  
  return NextResponse.json(reviews);
}

function convertToCSV(reviews: any[]): string {
  const headers = ['date', 'author', 'rating', 'text'];
  const rows = reviews.map(r => [
    r.date,
    r.author_name,
    r.rating,
    `"${(r.text || '').replace(/"/g, '""')}"`
  ].join(','));
  
  return [headers.join(','), ...rows].join('\n');
}
```

### Botón en UI

```typescript
// app/admin/places/page.tsx
<button 
  onClick={() => window.open('/api/admin/export?place_id=' + placeId)}
  className="text-green-600"
>
  Exportar CSV
</button>
```

**Checklist:**
- [ ] API /api/admin/export
- [ ] Soporte CSV
- [ ] Botón en UI
- [ ] Filtros de fecha

---

## 4. Métricas Avanzadas

### API de Métricas

```typescript
// app/api/admin/metrics/route.ts
export async function GET() {
  const metrics = {
    // Tendencia de ratings (últimos 30 días)
    rating_trend: getRatingTrend(30),
    
    // Distribución de ratings
    rating_distribution: getRatingDistribution(),
    
    // Reviews por día de semana
    day_of_week: getDayOfWeekDistribution(),
    
    // Longitud promedio de reviews
    avg_review_length: getAvgReviewLength(),
    
    // Negocios más activos
    most_active: getMostActivePlaces(10),
    
    // Usuarios más activos
    top_reviewers: getTopReviewers(10)
  };
  
  return NextResponse.json(metrics);
}
```

### UI de Métricas

```typescript
// app/admin/metrics/page.tsx
export default function Metrics() {
  // Gráficos con recharts o similar
  return (
    <div>
      <RatingTrendChart data={metrics.rating_trend} />
      <RatingDistribution data={metrics.rating_distribution} />
    </div>
  );
}
```

**Checklist:**
- [ ] API /api/admin/metrics
- [ ] Rating trend
- [ ] Rating distribution
- [ ] UI con gráficos

---

## 5. Optimizaciones

### Caché

```typescript
// lib/cache.ts
import { createHash } from 'crypto';

const cache = new Map<string, { data: any; expires: number }>();

export function getCached(key: string): any | null {
  const item = cache.get(key);
  if (item && item.expires > Date.now()) {
    return item.data;
  }
  cache.delete(key);
  return null;
}

export function setCache(key: string, data: any, ttlMs: number = 60000) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}
```

### Rate Limiting

```typescript
// lib/rate-limit.ts
const requests = new Map<string, number[]>();

export function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const window = requests.get(ip) || [];
  const valid = window.filter(t => t > now - windowMs);
  
  if (valid.length >= limit) {
    return false;
  }
  
  valid.push(now);
  requests.set(ip, valid);
  return true;
}
```

**Checklist:**
- [ ] Caché en memoria
- [ ] Rate limiting
- [ ] Optimización de queries

---

## 6. Documentación API

### OpenAPI/Swagger

```bash
npm install @scalar/next-api-route-doc
```

```typescript
// app/api/docs/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    openapi: '3.0.0',
    info: {
      title: 'Google Reviews Monitor API',
      version: '1.0.0'
    },
    paths: {
      '/api/admin/dashboard': {
        get: {
          summary: 'Get dashboard stats',
          responses: { 200: { description: 'OK' } }
        }
      }
    }
  });
}
```

**Checklist:**
- [ ] Documentación de endpoints
- [ ] Ejemplos de uso
- [ ] Códigos de error

---

## Checklist Final M8

- [ ] Tests de integración
- [ ] Autenticación JWT (opcional)
- [ ] Exportación CSV
- [ ] Métricas avanzadas
- [ ] Optimizaciones de rendimiento
- [ ] Documentación API

---

## Referencias

- Testing: Jest, Testing Library
- Auth: jose, jsonwebtoken
- Gráficos: recharts
- Milestone anterior: M7

---

## Roadmap (progreso)

| Milestone | Estado |
|-----------|--------|
| M1: Scheduler | ✅ Completado |
| M2: SQLite | ✅ Completado |
| M3: API | ✅ Completado |
| M4: Notificaciones | ✅ Completado |
| M5: Deduplicación | ✅ Completado |
| M6: Multi-negocio | ✅ Completado |
| M7: UI Admin | ✅ Completado |
| M8: Mejoras | 🔄 Este (pendiente testear) |
