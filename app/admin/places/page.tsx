'use client';

import { useEffect, useState, useCallback } from 'react';

// Types
interface PlaceStats {
  place_id: string;
  name: string | null;
  total_reviews: number;
  avg_rating: number | null;
  five_stars: number;
  one_star: number;
  last_sync: string | null;
}

interface AddPlaceModal {
  place_id: string;
  name: string;
}

export default function AdminPlaces() {
  const [places, setPlaces] = useState<PlaceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddPlaceModal>({ place_id: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/places');
      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }
      const data = await res.json();
      setPlaces(data.places || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando negocios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const handleAddPlace = async () => {
    if (!formData.place_id.trim()) {
      setSubmitError('El Place ID es obligatorio');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/admin/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: formData.place_id.trim(),
          name: formData.name.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error añadiendo negocio');
      }

      setShowModal(false);
      setFormData({ place_id: '', name: '' });
      fetchPlaces();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error añadiendo negocio');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    if (!confirm(`¿Eliminar "${placeId}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(placeId);
    try {
      const res = await fetch('/api/admin/places', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error eliminando negocio');
      }

      fetchPlaces();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error eliminando negocio');
    } finally {
      setDeletingId(null);
    }
  };

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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Negocios</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <span className="mr-2">+</span>
          Añadir Negocio
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchPlaces}
            className="mt-2 text-sm text-red-700 underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : places.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">🏪</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay negocios</h3>
          <p className="text-gray-500 mb-4">
            Añade tu primer negocio para comenzar a monitorizar reseñas.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Añadir Negocio
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Negocio
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reseñas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Media
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    5⭐ / 1⭐
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Sync
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {places.map((place) => (
                  <tr key={place.place_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {place.name || '—'}
                      </div>
                      <div className="text-sm text-gray-500">{place.place_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {place.total_reviews}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {place.avg_rating !== null ? (
                        <span className={place.avg_rating >= 4 ? 'text-green-600' : place.avg_rating >= 3 ? 'text-yellow-600' : 'text-red-600'}>
                          ⭐ {place.avg_rating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-green-600">{place.five_stars}</span>
                      <span className="text-gray-300 mx-1">/</span>
                      <span className="text-red-600">{place.one_star}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(place.last_sync)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDeletePlace(place.place_id)}
                        disabled={deletingId === place.place_id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === place.place_id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Place Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Añadir Negocio</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData({ place_id: '', name: '' });
                  setSubmitError(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="place_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Place ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="place_id"
                  type="text"
                  value={formData.place_id}
                  onChange={(e) => setFormData({ ...formData, place_id: e.target.value })}
                  placeholder="Ej: ChIJD3XuBNXyQoYRLPXdK2Ph2_g"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre (opcional)
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Restaurante El Mar"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData({ place_id: '', name: '' });
                  setSubmitError(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPlace}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}