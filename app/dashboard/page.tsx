'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Business {
  place_id: string;
  name: string;
  role: string;
  stats: {
    total: number;
    avg_rating: number;
    recent: number;
  };
}

export default function ClientDashboard() {
  const [chatId, setChatId] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!chatId) return;
    setLoading(true);
    localStorage.setItem('telegram_chat_id', chatId);
    
    // Obtener usuario
    const userRes = await fetch(`/api/users?chat_id=${chatId}`);
    if (!userRes.ok) {
      alert('Usuario no encontrado');
      setLoading(false);
      return;
    }
    const user = await userRes.json();
    
    // Obtener negocios
    const bizRes = await fetch(`/api/users/${user.id}/businesses`);
    const bizData = await bizRes.json();
    setBusinesses(bizData);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('telegram_chat_id');
    setBusinesses([]);
  };

  if (businesses.length > 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Mis Negocios</h1>
            <button onClick={logout} className="text-red-600">Cerrar sesión</button>
          </div>
          <div className="grid gap-4">
            {businesses.map((biz) => (
              <div key={biz.place_id} className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold">{biz.name}</h2>
                <div className="mt-2 text-gray-600">
                  <p>Total reseñas: {biz.stats.total}</p>
                  <p>Media: ⭐ {biz.stats.avg_rating?.toFixed(1)}</p>
                  <p>Recientes: {biz.stats.recent}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Iniciar Sesión</h1>
        <input
          type="text"
          placeholder="Tu Telegram Chat ID"
          className="w-full border p-3 rounded mb-4"
          value={chatId}
          onChange={e => setChatId(e.target.value)}
        />
        <button 
          onClick={handleLogin} 
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Cargando...' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}