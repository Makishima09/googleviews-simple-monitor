# Milestone 6: Multi-negocio + Usuarios + Panel Admin

## Objetivo

Implementar sistema multi-negocio con gestión de usuarios, permisos, panel admin profesional y dashboards por lugar. Transforma el proyecto en herramienta pro para agencias/freelancers que gestionan reseñas de múltiples clientes.

**Dependencias previas**: Milestone 5 completado (deduplicación con hashes).

**Duración estimada**: 3–4 días.

---

## Entregables

1. Tablas: users, user_businesses
2. Sistema de roles (admin/viewer)
3. Chat Telegram por usuario
4. Panel Admin profesional:
   - Dashboard general con todos los negocios
   - Gestión centralizada de lugares
   - Gestión de usuarios clientes
   - Métricas globales
5. API para gestionar lugares
6. API para gestionar usuarios
7. Dashboard por negocio
8. Sync envía notificaciones al usuario correcto

---

## Arquitectura

```
┌─────────────┐     ┌──────────────────┐
│   Users    │────▶│  user_businesses  │
└─────────────┘     └──────────────────┘
       │                      │
       │              ┌───────▼───────┐
       │              │    places     │
       │              │  (actual)     │
       │              └───────────────┘
       │
       ▼
┌─────────────┐
│ notifications│
│ (por user) │
└─────────────┘
```

---

## Paso 1: Schema de Usuarios

```typescript
// lib/db/schema.ts - Añadir tablas

// Tabla de usuarios
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    telegram_chat_id TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'viewer',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Tabla de relación usuario-negocio
db.exec(`
  CREATE TABLE IF NOT EXISTS user_businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    place_id TEXT NOT NULL,
    role TEXT DEFAULT 'viewer',
    notify_new INTEGER DEFAULT 1,
    notify_modified INTEGER DEFAULT 1,
    notify_deleted INTEGER DEFAULT 0,
    notify_rating INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, place_id)
  );
`);
```

---

## Step 2: User Queries

```typescript
// lib/db/users.ts

export interface User {
  id: number;
  name: string;
  email: string | null;
  telegram_chat_id: string;
  role: 'admin' | 'viewer';
  created_at: string;
}

export interface UserBusiness {
  user_id: number;
  place_id: string;
  role: 'admin' | 'viewer';
  notify_new: boolean;
  notify_modified: boolean;
  notify_deleted: boolean;
  notify_rating: number | null;
}

// Create user
export function createUser(name: string, chatId: string, email?: string): number {
  return db.prepare(`
    INSERT INTO users (name, telegram_chat_id, email)
    VALUES (?, ?, ?)
  `).run(name, chatId, email || null).lastInsertRowid as number;
}

// Get user by chat ID
export function getUserByChatId(chatId: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE telegram_chat_id = ?')
    .get(chatId) as User | undefined;
}

// Get businesses for user
export function getUserBusinesses(userId: number): UserBusiness[] {
  return db.prepare(`
    SELECT * FROM user_businesses WHERE user_id = ?
  `).all(userId) as UserBusiness[];
}

// Add business to user
export function addUserBusiness(
  userId: number,
  placeId: string,
  role: string = 'viewer'
): void {
  db.prepare(`
    INSERT OR IGNORE INTO user_businesses (user_id, place_id, role)
    VALUES (?, ?, ?)
  `).run(userId, placeId, role);
}

// Remove business from user
export function removeUserBusiness(userId: number, placeId: string): void {
  db.prepare(`
    DELETE FROM user_businesses WHERE user_id = ? AND place_id = ?
  `).run(userId, placeId);
}

// Get users for place (para notificaciones)
export function getUsersForPlace(placeId: string): User[] {
  return db.prepare(`
    SELECT u.* FROM users u
    JOIN user_businesses ub ON u.id = ub.user_id
    WHERE ub.place_id = ? AND ub.notify_new = 1
  `).all(placeId) as User[];
}

// Get all admins
export function getAdmins(): User[] {
  return db.prepare(`
    SELECT * FROM users WHERE role = 'admin'
  `).all() as User[];
}
```

---

## Step 3: API de Usuarios

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByChatId, getUserBusinesses, addUserBusiness, removeUserBusiness } from '@/lib/db/users';

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get('chat_id');
  
  if (chatId) {
    const user = getUserByChatId(chatId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json(user);
  }
  
  return NextResponse.json({ users: getAllUsers() });
}

export async function POST(request: NextRequest) {
  const { name, chat_id, email, role } = await request.json();
  
  if (!name || !chat_id) {
    return NextResponse.json({ error: 'Faltan name o chat_id' }, { status: 400 });
  }
  
  const id = createUser(name, chat_id, email);
  return NextResponse.json({ id, success: true });
}

// app/api/users/[id]/businesses/route.ts
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const businesses = getUserBusinesses(parseInt(params.id));
  return NextResponse.json(businesses);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { place_id, role } = await request.json();
  addUserBusiness(parseInt(params.id), place_id, role);
  return NextResponse.json({ success: true });
}
```

---

## Step 4: Notifications por Usuario

```typescript
// lib/notifications/worker.ts - Modificar

import { getUsersForPlace } from '@/lib/db/users';

async function notifyNewReview(
  placeId: string,
  review: any,
  message: string
) {
  const users = getUsersForPlace(placeId);
  
  for (const user of users) {
    const chatId = user.telegram_chat_id;
    const personalizedMessage = `${message}\n\n📍 *Tu negocio*`;
    
    await sendTelegramNotification(chatId, personalizedMessage);
    
    // Registrar notificación
    createNotification(
      review.review_id,
      placeId,
      { text: personalizedMessage, chat_id: chatId }
    );
  }
}
```

---

## Step 5: Registro de Usuario vía Telegram

```typescript
// app/api/telegram/register/route.ts

import { createUser, getUserByChatId } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, name, chat_id, start } = body;

  if (action === 'register' && name && chat_id) {
    const existing = getUserByChatId(chat_id);
    if (existing) {
      return NextResponse.json({ 
        message: `Ya estás registrado como ${existing.name}` 
      });
    }
    
    createUser(name, chat_id);
    return NextResponse.json({ 
      message: '¡Registrado! Ahora usa /agregar para añadir negocios.' 
    });
  }

  if (action === 'start') {
    return NextResponse.json({ 
      message: '¡Hola! Usa /registrar Nombre para comenzar.' 
    });
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
```

---

## Step 6: Dashboard por Negocio

```typescript
// app/api/dashboard/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUserBusinesses, getReviewsByPlace } from '@/lib/db/reviews';

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get('chat_id');
  
  if (!chatId) {
    return NextResponse.json({ error: 'chat_id requerido' }, { status: 400 });
  }
  
  const user = getUserByChatId(chatId);
  if (!user) {
    return NextResponse.json({ error: 'Usuario no registrado' }, { status: 404 });
  }
  
  const businesses = getUserBusinesses(user.id);
  const dashboards = [];
  
  for (const biz of businesses) {
    const reviews = getReviewsByPlace(biz.place_id, 50);
    const stats = calculateStats(reviews);
    
    dashboards.push({
      place_id: biz.place_id,
      role: biz.role,
      stats
    });
  }
  
  return NextResponse.json({ user: user.name, dashboards });
}
```

---

## Checklist de Verificación

### Base de Datos
- [ ] Tabla users creada
- [ ] Tabla user_businesses creada
- [ ] Migraciones aplicadas

### Usuarios
- [ ] Chat Telegram por usuario
- [ ] API POST /api/users (crear)
- [ ] API GET /api/users (listar)
- [ ] API PUT /api/users/:id (editar)

### Negocios
- [ ] API POST /api/admin/places (añadir lugar)
- [ ] API DELETE /api/admin/places/:id (eliminar lugar)
- [ ] Asignar lugar a usuario
- [ ] Quitar lugar de usuario

### Panel Admin
- [ ] Dashboard global (todos los negocios)
- [ ] Stats centralizados
- [ ] Gestión de usuarios clientes
- [ ] Exportación CSV

### Notificaciones
- [ ] Notificaciones van al usuario correcto
- [ ] Admin recibe alertas globales

### Tests
- [ ] Crear usuario → verificado
- [ ] Nuevo review → notificación a usuario específico
- [ ] Dashboard admin → todos los negocios
- [ ] Dashboard cliente → solo sus negocios

---

## Panel Admin Profesional

El panel admin convierte la herramienta en un producto comercializable para gestión de reseñas de múltiples clientes.

### Características del Admin:

| Feature | Descripción |
|---------|-------------|
| **Dashboard Global** | Vista completa de todos los negocios |
| **Stats Centralizados** | Media ratings, reviews totales, tendencias |
| **Añadir Negocio** | Place ID + config de alertas + asignar cliente |
| **Gestión de Clientes** | CRUD de usuarios con roles |
| **Configuración Global** | Settings para todos los negocios |
| **Alertas Globales** | Notificaciones si algo falla |
| **Exportación** | CSV/PDF de reviews de todos los negocios |

### Estructura de Roles:

| Rol | Permisos |
|-----|----------|
| **Admin** | Todos los negocios, gestionar usuarios, settings globales, ver stats de todos |
| **Viewer (Cliente)** | Solo sus negocios asignados, solo ver |

### Flujo Admin:

```
1. Admin se registra → rol "admin" por defecto
2. Admin añade lugares → Place ID + config
3. Admin crea usuarios clientes → les asigna lugares
4. Cliente recibe notificaciones de SU negocio
5. Admin ve TODO desde su dashboard
```

### API Admin:

```typescript
// app/api/admin/dashboard/route.ts - Dashboard global admin
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (user?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  
  // Stats globales
  const allPlaces = getAllPlaces();
  const allStats = allPlaces.map(p => getStatsForPlace(p.place_id));
  
  return NextResponse.json({
    total_places: allPlaces.length,
    total_reviews: sum(allStats.reviews),
    avg_rating: weightedAvg(allStats.ratings),
    places: allStats,
    recent_activity: getRecentActivity()
  });
}

// app/api/admin/places/route.ts - Gestionar lugares
export async function POST(request: NextRequest) {
  const { place_id, name, alert_threshold, notify_admins } = await request.json();
  addPlace(place_id, name, alert_threshold, notify_admins);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { place_id } = await request.json();
  removePlace(place_id);
  return NextResponse.json({ success: true });
}

// app/api/admin/users/route.ts - Gestionar clientes
export async function GET(request: NextRequest) {
  return NextResponse.json({ users: getAllUsers() });
}

export async function POST(request: NextRequest) {
  const { name, email, telegram_chat_id, places } = await request.json();
  const userId = createUser(name, telegram_chat_id, email);
  
  for (const placeId of places) {
    addUserBusiness(userId, placeId, 'viewer');
  }
  
  return NextResponse.json({ id: userId, success: true });
}

export async function PUT(request: NextRequest) {
  const { user_id, places, active } = await request.json();
  updateUserPlaces(userId, places);
  updateUserStatus(userId, active);
  return NextResponse.json({ success: true });
}
```

### UI del Panel Admin:

```
┌─────────────────────────────────────────────────────────────┐
│  📊 PANEL ADMIN - Gestión de Reseñas                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 12       │ │ 847      │ │ 4.3 ★    │ │ 3        │       │
│  │ Negocios  │ │ Reseñas  │ │ Media    │ │ Alerts   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│  NEGOCIOS                    [+ Añadir]                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🍕 Pizzería Roma    │ ⭐ 4.5 │ 120 reviews │ [Ver] │   │
│  │ 🏢 Oficina Central  │ ⭐ 4.2 │ 45 reviews  │ [Ver] │   │
│  │ 🏥 Clínica Salud    │ ⭐ 4.8 │ 89 reviews  │ [Ver] │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  CLIENTES                    [+ Nuevo Cliente]             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Juan Pérez     │ 3 negocios   │ [Editar] [Eliminar] │   │
│  │ María García   │ 1 negocio    │ [Editar] [Eliminar] │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  [Exportar CSV]  [Settings]  [Logs]                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Resumen de Cambios

| Componente | Actual | Nuevo |
|------------|--------|-------|
| Notifications | Un solo chat | Chat por usuario |
| Places | Global | Vinculado a usuario |
| Dashboard | General | Por usuario |
| Usuarios | ❌ | ✅ Tabla users + roles |

---

## Siguiente: Roadmap Final

| Milestone | Estado |
|-----------|--------|
| M1: Scheduler | ✅ Completado |
| M2: SQLite | ✅ Completado |
| M3: API | ✅ Completado |
| M4: Notificaciones | ✅ Completado |
| M5: Deduplicación | ✅ Completado |
| M6: Multi-negocio + Admin | 🔄 Este |
| M7: UI Dashboard | ⏳ Pendiente |
| M8+: Expansión | ⏳ Pendiente |

---

## Valor del Producto Final

Con M6 completado, el proyecto se convierte en:

| Aspecto | Valor |
|---------|-------|
| **Tipo** | SaaS / Herramienta profesional |
| **Target** | Agencies, freelancers, negocios múltiples |
| **Modelo** | Freemium (admin gratis, clientes limitados) |
| **Competidores** | Herramientas comerciales de $29-99/mes |
| **Diferenciador** | Open source, self-hosted, Telegram notifications |

---

## Referencias

- Schema: `lib/db/schema.ts`
- Users: `lib/db/users.ts`
- Sync: `app/api/internal/sync/route.ts`
- Milestone anterior: Milestone 5