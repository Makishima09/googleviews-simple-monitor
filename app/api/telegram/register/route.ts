import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByChatId, getAllUsers } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, chat_id, admin_secret } = body;

    if (action === 'register') {
      if (!name || !chat_id) {
        return NextResponse.json({ error: 'Faltan name o chat_id' }, { status: 400 });
      }

      const existing = getUserByChatId(chat_id);
      if (existing) {
        return NextResponse.json({ 
          message: 'Ya estás registrado',
          user: existing
        });
      }

      const isAdmin = admin_secret === process.env.ADMIN_SECRET;
      const userId = createUser({ 
        name, 
        telegram_chat_id: chat_id,
        role: isAdmin ? 'admin' : 'viewer'
      });
      
      return NextResponse.json({ 
        message: '¡Registrado!',
        user_id: userId,
        role: isAdmin ? 'admin' : 'viewer'
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET() {
  const users = getAllUsers();
  return NextResponse.json({ users });
}