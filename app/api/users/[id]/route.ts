import { NextRequest, NextResponse } from 'next/server';
import {
  getUserById,
  updateUser,
  deleteUser,
  getUserBusinesses,
  addUserBusiness,
  removeUserBusiness,
  updateUserBusiness
} from '@/lib/db/users';

// ============================================
// /api/users/[id]
// ============================================

/**
 * GET /api/users/[id]
 * Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = getUserById(parseInt(id));
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
    
  } catch (error) {
    console.error('[API] GET /api/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id]
 * Update user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    
    // Verify user exists
    const existing = getUserById(userId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { name, email, role } = body;
    
    const updated = updateUser(userId, { name, email, role });
    
    if (!updated) {
      return NextResponse.json(
        { error: 'No se realizaron cambios', code: 'NO_CHANGES' },
        { status: 400 }
      );
    }
    
    const user = getUserById(userId);
    console.log(`[API] User updated: id=${userId}`);
    
    return NextResponse.json({ success: true, user, code: 'USER_UPDATED' });
    
  } catch (error) {
    console.error('[API] PUT /api/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Delete user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteUser(parseInt(id));
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    console.log(`[API] User deleted: id=${id}`);
    
    return NextResponse.json({ success: true, code: 'USER_DELETED' });
    
  } catch (error) {
    console.error('[API] DELETE /api/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}