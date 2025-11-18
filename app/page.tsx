'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, Clock, Search, Settings, AlertCircle, Star, Trash2 } from 'lucide-react';

interface Review {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  review_id: string;
}

interface Log {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface NewReviewDetected extends Review {
  detectedAt: string;
  isInitial?: boolean; // true si es una reseña cargada al inicio, false si es nueva detectada después
}

export default function GoogleReviewsMonitor() {
  const [placeId, setPlaceId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [checkInterval, setCheckInterval] = useState(30);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewsDetected, setNewReviewsDetected] = useState<NewReviewDetected[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  
  // Ref para mantener el valor actualizado de reviews en el closure de setInterval
  const reviewsRef = useRef<Review[]>([]);

  // Cargar configuración desde localStorage al iniciar
  useEffect(() => {
    const savedConfig = localStorage.getItem('reviewMonitorConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setPlaceId(config.placeId || '');
      setApiKey(config.apiKey || '');
      setBotToken(config.botToken || '');
      setChatId(config.chatId || '');
      // Migrar de 'interval' antiguo a 'checkInterval' nuevo
      setCheckInterval(config.checkInterval || config.interval || 30);
    }
    
    // Cargar historial de reseñas nuevas detectadas
    const savedNewReviews = localStorage.getItem('newReviewsDetected');
    if (savedNewReviews) {
      setNewReviewsDetected(JSON.parse(savedNewReviews));
    }
  }, []);

  // Guardar configuración en localStorage cuando cambie
  useEffect(() => {
    const config = { placeId, apiKey, botToken, chatId, checkInterval };
    localStorage.setItem('reviewMonitorConfig', JSON.stringify(config));
  }, [placeId, apiKey, botToken, chatId, checkInterval]);

  // Guardar historial de reseñas nuevas detectadas
  useEffect(() => {
    localStorage.setItem('newReviewsDetected', JSON.stringify(newReviewsDetected));
  }, [newReviewsDetected]);

  // Mantener reviewsRef sincronizado con reviews
  useEffect(() => {
    reviewsRef.current = reviews;
  }, [reviews]);

  const addLog = (message: string, type: Log['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('es-ES');
    setLogs(prev => [{timestamp, message, type}, ...prev].slice(0, 10));
  };

  const sendTelegramMessage = async (text: string) => {
    try {
      const response = await fetch('/api/telegram', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          botToken,
          chatId,
          text
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        addLog('✅ Notificación enviada a Telegram', 'success');
        return true;
      } else {
        addLog(`❌ Error Telegram: ${data.error}`, 'error');
        return false;
      }
    } catch (error) {
      addLog(`❌ Error al enviar: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      return false;
    }
  };

  const fetchReviews = async (): Promise<Review[]> => {
    try {
      addLog('🔍 Consultando reseñas en Google...', 'info');
      
      // Pasar API key como parámetro (se usará si no hay una en .env)
      const response = await fetch(`/api/reviews?placeId=${encodeURIComponent(placeId)}&apiKey=${encodeURIComponent(apiKey)}`);
      const data = await response.json();
      
      if (data.error) {
        addLog(`❌ Error: ${data.error}`, 'error');
        return [];
      }
      
      if (data.reviews && data.reviews.length > 0) {
        addLog(`✓ ${data.reviews.length} reseñas obtenidas`, 'success');
        return data.reviews;
      }
      
      return [];
    } catch (error) {
      addLog(`❌ Error al obtener reseñas: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      return [];
    }
  };

  const checkNewReviews = async () => {
    const currentReviews = await fetchReviews();
    
    if (currentReviews.length === 0) {
      addLog('⚠️ No se obtuvieron reseñas', 'warning');
      return;
    }

    // Usar reviewsRef.current en lugar de reviews para obtener el valor actualizado
    const knownReviews = reviewsRef.current;
    
    const newReviews = currentReviews.filter(
      current => !knownReviews.some(old => old.review_id === current.review_id)
    );

    // SIEMPRE actualizar el estado de reviews, incluso si no hay nuevas
    setReviews(currentReviews);

    if (newReviews.length > 0) {
      addLog(`🆕 ${newReviews.length} nueva(s) reseña(s) detectada(s)`, 'success');
      
      // Agregar al historial de reseñas nuevas detectadas
      const newDetections: NewReviewDetected[] = newReviews.map(review => ({
        ...review,
        detectedAt: new Date().toISOString(),
        isInitial: false
      }));
      setNewReviewsDetected(prev => [...newDetections, ...prev]);
      
      for (const review of newReviews) {
        const stars = '⭐'.repeat(review.rating);
        const message = `
🔔 <b>¡Nueva Reseña Recibida!</b>

${stars} (${review.rating}/5)
👤 <b>${review.author_name}</b>

💬 "${review.text}"

📅 ${new Date(review.time * 1000).toLocaleString('es-ES')}
        `.trim();
        
        await sendTelegramMessage(message);
      }
    } else {
      addLog('✓ Sin reseñas nuevas', 'info');
    }
  };

  const startMonitoring = async () => {
    if (!placeId || !apiKey || !botToken || !chatId) {
      addLog('❌ Completa todos los campos de configuración', 'error');
      return;
    }

    setIsMonitoring(true);
    addLog('🚀 Monitor iniciado', 'success');
    
    // Mensaje inicial
    await sendTelegramMessage('🤖 <b>Monitor de Reseñas Activado</b>\n\nTe notificaré cuando lleguen nuevas reseñas.');
    
    // Primera revisión - obtener reseñas existentes
    const initialReviews = await fetchReviews();
    setReviews(initialReviews);
    
    // Agregar las reseñas iniciales al historial visual (sin enviar notificación)
    // Solo si el historial está vacío (primera vez que se inicia el monitor)
    if (initialReviews.length > 0 && newReviewsDetected.length === 0) {
      addLog(`📋 ${initialReviews.length} reseña(s) existente(s) cargada(s)`, 'info');
      
      const initialDetections: NewReviewDetected[] = initialReviews.map(review => ({
        ...review,
        detectedAt: new Date().toISOString(),
        isInitial: true
      }));
      
      setNewReviewsDetected(initialDetections);
    } else if (newReviewsDetected.length > 0) {
      addLog(`📋 Historial con ${newReviewsDetected.length} reseña(s) restaurado`, 'info');
    }
    
    // Configurar revisiones periódicas
    const intervalId = window.setInterval(checkNewReviews, checkInterval * 60 * 1000);
    
    // Guardar el ID del intervalo para poder detenerlo después
    if (typeof window !== 'undefined') {
      (window as any).monitorIntervalId = intervalId;
    }
  };

  const stopMonitoring = () => {
    if (typeof window !== 'undefined' && (window as any).monitorIntervalId) {
      window.clearInterval((window as any).monitorIntervalId);
      (window as any).monitorIntervalId = null;
    }
    setIsMonitoring(false);
    addLog('⏹️ Monitor detenido', 'warning');
  };

  const testNotification = async () => {
    if (!botToken || !chatId) {
      addLog('❌ Configura Bot Token y Chat ID primero', 'error');
      return;
    }
    
    const testMessage = `
🧪 <b>Mensaje de Prueba</b>

Este es un mensaje de prueba del monitor de reseñas.

Si recibes esto, ¡todo está configurado correctamente! ✅
    `.trim();
    
    await sendTelegramMessage(testMessage);
  };

  const clearNewReviewsHistory = () => {
    setNewReviewsDetected([]);
    addLog('🗑️ Historial de reseñas nuevas limpiado', 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-500 p-3 rounded-xl">
              <Bell className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Monitor de Reseñas</h1>
              <p className="text-gray-600">Google Maps + Telegram Bot</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isMonitoring ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="font-semibold">
              {isMonitoring ? 'Monitoreando activamente' : 'Inactivo'}
            </span>
          </div>
        </div>

        {/* Configuración */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="text-blue-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-800">Configuración</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Google Place ID
              </label>
              <input
                type="text"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtén el Place ID en: <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Place ID Finder</a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Google API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Crea una en: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console</a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Telegram Bot Token
              </label>
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtén tu token hablando con <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@BotFather</a> en Telegram
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Telegram Chat ID
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="123456789"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtén tu Chat ID con <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@userinfobot</a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Intervalo de revisión (minutos)
              </label>
              <input
                type="number"
                value={checkInterval}
                onChange={(e) => setCheckInterval(Math.max(1, parseInt(e.target.value) || 30))}
                min="1"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={testNotification}
              className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
            >
              <Search size={20} />
              Probar Notificación
            </button>
            
            {!isMonitoring ? (
              <button
                onClick={startMonitoring}
                className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Bell size={20} />
                Iniciar Monitor
              </button>
            ) : (
              <button
                onClick={stopMonitoring}
                className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                ⏹️ Detener Monitor
              </button>
            )}
          </div>
        </div>

        {/* Historial de Reseñas */}
        {newReviewsDetected.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Bell className="text-green-500" size={24} />
                <h2 className="text-2xl font-bold text-gray-800">
                  Historial de Reseñas ({newReviewsDetected.length})
                </h2>
              </div>
              <button
                onClick={clearNewReviewsHistory}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                title="Limpiar historial"
              >
                <Trash2 size={18} />
                Limpiar
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {newReviewsDetected.map((review, index) => (
                <div 
                  key={index}
                  className={`rounded-xl p-6 hover:shadow-md transition-shadow ${
                    review.isInitial 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200' 
                      : 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={20}
                            className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-gray-700">
                        {review.rating}/5
                      </span>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      review.isInitial
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-green-200 text-green-800'
                    }`}>
                      {review.isInitial ? 'EXISTENTE' : 'NUEVA'}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="font-bold text-gray-800 text-lg mb-1">
                      👤 {review.author_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      📅 Publicada: {new Date(review.time * 1000).toLocaleString('es-ES')}
                    </p>
                    <p className={`text-xs font-semibold mt-1 ${
                      review.isInitial ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {review.isInitial ? '📋 Cargada' : '🔔 Detectada'}: {new Date(review.detectedAt).toLocaleString('es-ES')}
                    </p>
                  </div>

                  {review.text && (
                    <div className={`bg-white rounded-lg p-4 border ${
                      review.isInitial ? 'border-blue-100' : 'border-green-100'
                    }`}>
                      <p className="text-gray-700 italic">
                        "{review.text}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registro de actividad */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-blue-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-800">Registro de Actividad</h2>
          </div>

          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <AlertCircle className="mx-auto mb-3" size={48} />
                <p>No hay actividad aún. Inicia el monitor para comenzar.</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    log.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
                    log.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
                    log.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                    'bg-blue-50 border-l-4 border-blue-500'
                  }`}
                >
                  <span className="text-xs font-mono text-gray-500 min-w-[80px]">
                    {log.timestamp}
                  </span>
                  <span className="text-sm text-gray-700">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Nota importante */}
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mt-6">
          <div className="flex gap-3">
            <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-green-900 mb-2">✅ Sistema de Producción</h3>
              <p className="text-sm text-green-800">
                Este sistema está listo para <strong>uso en producción real</strong>:
              </p>
              <ul className="text-sm text-green-800 mt-2 space-y-1 ml-4">
                <li>• Las llamadas a Google API se hacen desde el servidor (seguras)</li>
                <li>• La configuración se guarda en tu navegador (localStorage)</li>
                <li>• Las notificaciones de Telegram funcionan en tiempo real</li>
                <li>• Para desplegar 24/7, sube esta aplicación a Vercel o Railway</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

