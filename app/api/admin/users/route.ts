import { NextRequest, NextResponse } from 'next/server';

// Mock users/clients data
export async function GET(request: NextRequest) {
  const users = {
    users: [
      {
        id: 1,
        name: 'Admin Principal',
        email: 'admin@ejemplo.com',
        telegram_chat_id: '123456789',
        role: 'admin',
        places_count: 3,
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        name: 'Cliente Juan Pérez',
        email: 'juan@cliente.com',
        telegram_chat_id: '987654321',
        role: 'viewer',
        places_count: 1,
        created_at: '2024-02-20T14:30:00Z'
      },
      {
        id: 3,
        name: 'Cliente María García',
        email: 'maria@cliente.com',
        telegram_chat_id: '456789123',
        role: 'viewer',
        places_count: 2,
        created_at: '2024-03-05T09:15:00Z'
      }
    ]
  };

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, telegram_chat_id } = body;

    // Mock new user
    const newUser = {
      id: Math.floor(Math.random() * 1000),
      name,
      email,
      telegram_chat_id,
      role: 'viewer',
      places_count: 0,
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `Cliente '${name}' creado correctamente`
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear cliente' },
      { status: 500 }
    );
  }
}