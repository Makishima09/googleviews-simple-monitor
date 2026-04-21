'use client';

import { useEffect, useState } from 'react';

interface Settings {
  config: {
    telegram_bot_token: string;
    telegram_enabled: boolean;
    alert_chat_id: string;
    sync_interval_minutes: number;
    sync_enabled: boolean;
    failure_threshold: number;
    notify_new_reviews: boolean;
    notify_modified_reviews: boolean;
    notify_deleted_reviews: boolean;
    notify_all_ratings: boolean;
    notify_rating_threshold: number;
    db_path: string;
    db_auto_backup: boolean;
    db_backup_interval_days: number;
    admin_secret_set: boolean;
    api_rate_limit: number;
    cors_enabled: boolean;
  };
  stats: {
    database_size_bytes: number;
    last_backup: string;
    total_queries_today: number;
    api_calls_today: number;
  };
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.config)
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Configuración guardada correctamente');
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          {message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">
            {formatBytes(settings?.stats.database_size_bytes || 0)}
          </div>
          <div className="text-sm text-gray-500">Tamaño BD</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">
            {settings?.stats.total_queries_today || 0}
          </div>
          <div className="text-sm text-gray-500">Consultas hoy</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">
            {settings?.stats.api_calls_today || 0}
          </div>
          <div className="text-sm text-gray-500">Llamadas API hoy</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">
            {settings?.config.sync_interval_minutes || 30} min
          </div>
          <div className="text-sm text-gray-500">Intervalo sync</div>
        </div>
      </div>

      {/* Telegram Config */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">📱 Configuración de Telegram</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Telegram habilitado</div>
              <div className="text-sm text-gray-500">Recibir notificaciones</div>
            </div>
            <input
              type="checkbox"
              checked={settings?.config.telegram_enabled}
              onChange={e => setSettings({
                ...settings!,
                config: { ...settings!.config, telegram_enabled: e.target.checked }
              })}
              className="w-5 h-5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bot Token</label>
            <input
              type="text"
              value={settings?.config.telegram_bot_token || ''}
              onChange={e => setSettings({
                ...settings!,
                config: { ...settings!.config, telegram_bot_token: e.target.value }
              })}
              className="w-full border rounded px-3 py-2"
              placeholder="123456:ABCdef..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chat ID para alertas</label>
            <input
              type="text"
              value={settings?.config.alert_chat_id || ''}
              onChange={e => setSettings({
                ...settings!,
                config: { ...settings!.config, alert_chat_id: e.target.value }
              })}
              className="w-full border rounded px-3 py-2"
              placeholder="123456789"
            />
          </div>
        </div>
      </div>

      {/* Sync Config */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">🔄 Sincronización</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Sync automático</div>
              <div className="text-sm text-gray-500">Ejecutar automáticamente</div>
            </div>
            <input
              type="checkbox"
              checked={settings?.config.sync_enabled}
              onChange={e => setSettings({
                ...settings!,
                config: { ...settings!.config, sync_enabled: e.target.checked }
              })}
              className="w-5 h-5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Intervalo (minutos)</label>
            <select
              value={settings?.config.sync_interval_minutes}
              onChange={e => setSettings({
                ...settings!,
                config: { ...settings!.config, sync_interval_minutes: parseInt(e.target.value) }
              })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
              <option value="120">2 horas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Umbral de fallos</label>
            <input
              type="number"
              value={settings?.config.failure_threshold}
              onChange={e => setSettings({
                ...settings!,
                config: { ...settings!.config, failure_threshold: parseInt(e.target.value) }
              })}
              className="w-full border rounded px-3 py-2"
              min="1"
              max="10"
            />
          </div>
        </div>
      </div>

      {/* Notifications Config */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">🔔 Notificaciones</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">Nuevas reseñas</div>
            <input
              type="checkbox"
              checked={settings?.config.notify_new_reviews}
              onChange={e => setSettings({
                ...settings!,
                config: { ...settings!.config, notify_new_reviews: e.target.checked }
              })}
              className="w-5 h-5"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="font-medium">Reseñas modificadas</div>
            <input
              type="checkbox"
              checked={settings?.config.notify_modified_reviews}
              onChange={e => setSettings({
                ...settings!,
                config: { ...settings!.config, notify_modified_reviews: e.target.checked }
              })}
              className="w-5 h-5"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="font-medium">Reseñas eliminadas</div>
            <input
              type="checkbox"
              checked={settings?.config.notify_deleted_reviews}
              onChange={e => setSettings({
                ...settings!,
                config: { ...settings!.config, notify_deleted_reviews: e.target.checked }
              })}
              className="w-5 h-5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}