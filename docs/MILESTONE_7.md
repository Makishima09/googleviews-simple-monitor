# Milestone 7: UI del Panel Admin

## Objetivo

Implementar la interfaz de usuario del Panel Admin para gestionar negocios, usuarios y visualizar estadísticas.

**Dependencias previas**: Milestone 6 completado (API de usuarios y admin).

**Duración estimada**: 2–3 días.

---

## Entregables

1. Página principal del dashboard
2. Vista de lista de negocios
3. Vista de gestión de usuarios/clientes
4. Vista de estadísticas detalladas
5. Página de configuración
6. Registro de usuarios vía Telegram

---

## Estructura de Componentes

```
app/
├── admin/
│   ├── page.tsx              # Dashboard principal
│   ├── places/
│   │   └── page.tsx          # Lista de negocios
│   ├── users/
│   │   └── page.tsx          # Gestión de clientes
│   ├── settings/
│   │   └── page.tsx          # Configuración global
│   └── layout.tsx            # Layout del admin
├── dashboard/
│   └── page.tsx              # Dashboard del cliente
├── register/
│   └── page.tsx              # Registro de nuevo usuario
└── api/
    └── telegram/
        └── register/
            └── route.ts      # Registro vía Telegram
```

---

## Paso 1: Layout del Admin

```typescript
// app/admin/layout.tsx
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.className} min-h-screen bg-gray-100`}>
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">📊 Panel Admin</h1>
              <div className="ml-10 flex space-x-4">
                <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                  Dashboard
                </Link>
                <Link href="/admin/places" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                  Negocios
                </Link>
                <Link href="/admin/users" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                  Clientes
                </Link>
                <Link href="/admin/settings" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

---

## Paso 2: Dashboard Principal

```typescript
// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';

interface DashboardStats {
  total_places: number;
  total_reviews: number;
  avg_rating: number;
  recent_activity: Array<{
    place_id: string;
    place_name: string;
    new_reviews: number;
    timestamp: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold">{stats?.total_places}</div>
          <div className="text-gray-500">Negocios</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold">{stats?.total_reviews}</div>
          <div className="text-gray-500">Reseñas Totales</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold">⭐ {stats?.avg_rating?.toFixed(1)}</div>
          <div className="text-gray-500">Media</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-green-600">
            {stats?.recent_activity?.length}
          </div>
          <div className="text-gray-500">Actividad Reciente</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            {stats?.recent_activity?.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b">
                <div>
                  <div className="font-medium">{item.place_name}</div>
                  <div className="text-sm text-gray-500">{item.place_id}</div>
                </div>
                <div className="text-right">
                  <div className="text-green-600 font-medium">+{item.new_reviews} nuevas</div>
                  <div className="text-sm text-gray-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Paso 3: Página de Negocios

```typescript
// app/admin/places/page.tsx
'use client';

import { useEffect, useState } from 'react';

interface Place {
  place_id: string;
  name: string;
  total_reviews: number;
  avg_rating: number;
  last_sync: string;
}

export default function AdminPlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newPlace, setNewPlace] = useState({ place_id: '', name: '' });

  useEffect(() => {
    fetch('/api/admin/places')
      .then(res => res.json())
      .then(data => setPlaces(data.places || []));
  }, []);

  const handleAddPlace = async () => {
    await fetch('/api/admin/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPlace)
    });
    setShowModal(false);
    // Recargar...
  };

  const handleDeletePlace = async (placeId: string) => {
    if (!confirm('¿Eliminar este negocio?')) return;
    await fetch('/api/admin/places', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_id: placeId })
    });
    // Recargar...
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Negocios</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Añadir Negocio
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Negocio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Reseñas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Media
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
               Último Sync
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {places.map((place) => (
              <tr key={place.place_id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{place.name}</div>
                  <div className="text-sm text-gray-500">{place.place_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{place.total_reviews}</td>
                <td className="px-6 py-4 whitespace-nowrap">⭐ {place.avg_rating?.toFixed(1)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {place.last_sync ? new Date(place.last_sync).toLocaleString() : 'Nunca'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleDeletePlace(place.place_id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Añadir Negocio</h2>
            <input
              type="text"
              placeholder="Place ID"
              className="w-full border p-2 rounded mb-4"
              value={newPlace.place_id}
              onChange={e => setNewPlace({ ...newPlace, place_id: e.target.value })}
            />
            <input
              type="text"
              placeholder="Nombre"
              className="w-full border p-2 rounded mb-4"
              value={newPlace.name}
              onChange={e => setNewPlace({ ...newPlace, name: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">
                Cancelar
              </button>
              <button onClick={handleAddPlace} className="px-4 py-2 bg-blue-600 text-white rounded">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Paso 4: Página de Clientes

```typescript
// app/admin/users/page.tsx
'use client';

import { useEffect, useState } from 'react';

interface Client {
  id: number;
  name: string;
  email: string | null;
  telegram_chat_id: string;
  places_count: number;
  created_at: string;
}

export default function AdminUsers() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    telegram_chat_id: '',
    places: [] as string[]
  });

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => setClients(data.users || []));
  }, []);

  const handleCreateClient = async () => {
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient)
    });
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nuevo Cliente
        </button>
      </div>

      <div className="grid gap-4">
        {clients.map((client) => (
          <div key={client.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div>
              <div className="font-medium">{client.name}</div>
              <div className="text-sm text-gray-500">
                {client.email || 'Sin email'} • {client.places_count} negocios
              </div>
            </div>
            <div className="flex gap-2">
              <button className="text-blue-600 hover:text-blue-900">Editar</button>
              <button className="text-red-600 hover:text-red-900">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Paso 5: Registro vía Telegram

```typescript
// app/api/telegram/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByChatId } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, name, chat_id, place_ids, admin_secret } = body;

  // Verificar admin secret para crear admin
  const isAdminRequest = admin_secret === process.env.ADMIN_SECRET;
  const role = isAdminRequest ? 'admin' : 'viewer';

  if (action === 'register') {
    if (!name || !chat_id) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const existing = getUserByChatId(chat_id);
    if (existing) {
      return NextResponse.json({ 
        message: `Ya estás registrado${existing.role === 'admin' ? ' como admin' : ''}`,
        user: existing
      });
    }

    const userId = createUser(name, chat_id);
    
    return NextResponse.json({ 
      message: '¡Registrado correctamente!',
      user_id: userId,
      role
    });
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
```

---

## Paso 6: Dashboard del Cliente

```typescript
// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';

interface ClientDashboard {
  user: { name: string; role: string };
  places: Array<{
    place_id: string;
    name: string;
    stats: { total: number; avg_rating: number; recent: number };
  }>;
}

export default function ClientDashboard() {
  const [data, setData] = useState<ClientDashboard | null>(null);
  const [chatId, setChatId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('telegram_chat_id');
    if (stored) {
      setChatId(stored);
      fetch(`/api/users?chat_id=${stored}`)
        .then(res => res.json())
        .then(userData => {
          fetch(`/api/users/${userData.id}/businesses`)
            .then(r => r.json())
            .then(placesData => setData({ user: userData, places: placesData }));
        });
    }
  }, []);

  const handleLogin = () => {
    localStorage.setItem('telegram_chat_id', chatId);
    window.location.reload();
  };

  if (!chatId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ingresa tu Chat ID</h1>
          <input
            type="text"
            placeholder="Tu Telegram Chat ID"
            className="border p-2 rounded mb-4 block"
            value={chatId}
            onChange={e => setChatId(e.target.value)}
          />
          <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Mis Negocios</h1>
      {/* Lista de negocios del cliente... */}
    </div>
  );
}
```

---

## Checklist de Verificación

- [ ] Layout del admin con navegación
- [ ] Dashboard principal con stats
- [ ] Página de negocios (lista + añadir + eliminar)
- [ ] Página de clientes (lista + crear)
- [ ] Página de settings
- [ ] Dashboard del cliente (sus negocios)
- [ ] Login con Chat ID
- [ ] Registro vía Telegram bot
- [ ] Responsive design
- [ ] Manejo de errores

---

## Referencias

- API Admin: `app/api/admin/`
- API Users: `app/api/users/`
- UI Components: `app/admin/`
- Milestone anterior: M6
- Siguiente: M8 (mejoras opcionales)

---

## Roadmap (progreso)

| Milestone | Estado |
|-----------|--------|
| M1: Scheduler | ✅ Completado |
| M2: SQLite | ✅ Completado |
| M3: API | ✅ Completado |
| M4: Notificaciones | ✅ Completado |
| M5: Deduplicación | ✅ Completado |
| M6: Multi-negocio + Admin API | ✅ Completado |
| M7: UI Panel Admin | 🔄 En progreso |
| M8: Mejoras | ⏳ Pendiente |