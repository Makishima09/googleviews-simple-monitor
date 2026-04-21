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
    telegram_chat_id: ''
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
    window.location.reload();
  };

  const handleDeleteClient = async (id: number) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    window.location.reload();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
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
            <button onClick={() => handleDeleteClient(client.id)} className="text-red-600 hover:text-red-900">
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Nuevo Cliente</h2>
            <input
              type="text"
              placeholder="Nombre"
              className="w-full border p-2 rounded mb-4"
              value={newClient.name}
              onChange={e => setNewClient({...newClient, name: e.target.value})}
            />
            <input
              type="email"
              placeholder="Email (opcional)"
              className="w-full border p-2 rounded mb-4"
              value={newClient.email}
              onChange={e => setNewClient({...newClient, email: e.target.value})}
            />
            <input
              type="text"
              placeholder="Telegram Chat ID"
              className="w-full border p-2 rounded mb-4"
              value={newClient.telegram_chat_id}
              onChange={e => setNewClient({...newClient, telegram_chat_id: e.target.value})}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancelar</button>
              <button onClick={handleCreateClient} className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}