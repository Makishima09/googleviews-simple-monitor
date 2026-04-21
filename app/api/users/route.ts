import { NextRequest, NextResponse } from 'next/server';
import {
  createUser,
  getUserById,
  getUserByChatId,
  getAllUsers,
  updateUser,
  deleteUser,
  getUserBusinesses,
  addUserBusiness,
  removeUserBusiness
} from '@/lib/db/users';

/**
 * GET /api/users
 * List all users or get user by chat_id
 */
export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get('chat_id');
  const userId = request.nextUrl.searchParams.get('id');
  
  try {
    // Get by chat_id (for Telegram bot)
    if (chatId) {
      const user = getUserByChatId(chatId);
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }
      return NextResponse.json(user);
    }
    
    // Get by ID
    if (userId) {
      const user = getUserById(parseInt(userId));
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }
      return NextResponse.json(user);
    }
    
    // List all users
    const users = getAllUsers();
    return NextResponse.json({ users });
    
  } catch (error) {
    console.error('[API] GET /api/users error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, telegram_chat_id, email, role } = body;
    
    // Validation
    if (!name || !telegram_chat_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, telegram_chat_id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existing = getUserByChatId(telegram_chat_id);
    if (existing) {
      return NextResponse.json(
        { error: 'El usuario ya existe', code: 'USER_EXISTS', user: existing },
        { status: 409 }
      );
    }
    
    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await import('@/lib/db/users').then(m => m.getUserByEmail(email));
      if (existingEmail) {
        return NextResponse.json(
          { error: 'El email ya está en uso', code: 'EMAIL_EXISTS' },
          { status: 409 }
        );
      }
    }
    
    // Create user
    const id = createUser({ name, telegram_chat_id, email, role });
    const user = getUserById(id);
    
    console.log(`[API] User created: id=${id}, name=${name}`);
    
    return NextResponse.json(
      { success: true, user, code: 'USER_CREATED' },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[API] POST /api/users error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
