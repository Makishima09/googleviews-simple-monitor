'use client';

import { useEffect, useState, useCallback } from 'react';

// Types
interface DashboardStats {
  total_places: number;
  total_reviews: number;
  avg_rating: number | null;
  five_stars: number;
  one_star: number;
  users: {
    total: number;
    admins: number;
    viewers: number;
  };
  notifications: {
    sent: number;
    pending: number;
    failed: number;
  };
  last_sync: string | null;
  places: Array<{
    place_id: string;
    name: string | null;
    total_reviews: number;
    avg_rating: number | null;
    last_sync: string | null;
  }>;
  recent_activity: Array<{
    place_id: string;
    place_name: string;
    review_id: string;
    author_name: string | null;
    rating: number | null;
    date: string;
    action: 'new' | 'modified' | 'deleted';
  }>;
}

interface LoadingState {
  stats: boolean;
  activity: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    stats: true,
    activity: false,
  });

  const fetchDashboard = useCallback(async () => {
    setLoading({ stats: true, activity: true });
    setError(null);

    try {
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) {
        throw new Error(`Error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando dashboard');
    } finally {
      setLoading({ stats: false, activity: false });
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Nunca';
    try {
      return new Date(dateStr).toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getActionLabel = (action: string): { text: string; color: string } => {
    switch (action) {
      case 'new':
        return { text: 'Nueva', color: 'text-green-600 bg-green-100' };
      case 'modified':
        return { text: 'Modificada', color: 'text-yellow-600 bg-yellow-100' };
      case 'deleted':
        return { text: 'Eliminada', color: 'text-red-600 bg-red-100' };
      default:
        return { text: action, color: 'text-gray-600 bg-gray-100' };
    }
  };

  if (loading.stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-4">Error cargando datos</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchDashboard}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={fetchDashboard}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Places */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-gray-900">
            {stats?.total_places ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">Negocios monitorizados</div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-gray-900">
            {stats?.total_reviews ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">Reseñas totales</div>
        </div>

        {/* Average Rating */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-gray-900">
            {stats?.avg_rating !== null ? `⭐ ${stats.avg_rating.toFixed(1)}` : '—'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Valoración media</div>
        </div>

        {/* Users */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-gray-900">
            {stats?.users.total ?? 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Usuarios ({stats?.users.admins ?? 0} admin, {stats?.users.viewers ?? 0} viewer)
          </div>
        </div>
      </div>

      {/* Ratings Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Ratings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">⭐ {stats?.five_stars ?? 0}</div>
              <div className="text-sm text-gray-500">5 estrellas</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">⭐ {stats?.one_star ?? 0}</div>
              <div className="text-sm text-gray-500">1 estrella</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notificaciones</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats?.notifications.sent ?? 0}</div>
              <div className="text-sm text-gray-500">Enviadas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats?.notifications.pending ?? 0}</div>
              <div className="text-sm text-gray-500">Pendientes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats?.notifications.failed ?? 0}</div>
              <div className="text-sm text-gray-500">Fallidas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Places & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Places List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Negocios</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {stats?.places && stats.places.length > 0 ? (
              stats.places.map((place) => (
                <div key={place.place_id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {place.name || place.place_id}
                      </div>
                      <div className="text-sm text-gray-500">{place.place_id}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {place.avg_rating !== null ? `⭐ ${place.avg_rating}` : '—'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {place.total_reviews} reseñas
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Última sincronización: {formatDate(place.last_sync)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No hay negocios configurados
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {stats?.recent_activity && stats.recent_activity.length > 0 ? (
              stats.recent_activity.map((item, index) => {
                const actionInfo = getActionLabel(item.action);
                return (
                  <div key={`${item.review_id}-${index}`} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.author_name || 'Anónimo'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.place_name || item.place_id}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${actionInfo.color}`}>
                          {actionInfo.text}
                        </span>
                        {item.rating && (
                          <div className="text-sm text-gray-500 mt-1">
                            ⭐ {item.rating}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {formatDate(item.date)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                No hay actividad reciente
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}