import { NextRequest, NextResponse } from 'next/server';
import {
  getUserById,
  getUserBusinesses,
  addUserBusiness,
  removeUserBusiness,
  updateUserBusiness
} from '@/lib/db/users';

// ============================================
// /api/users/[id]/businesses
// ============================================

/**
 * GET /api/users/[id]/businesses
 * Get user's businesses
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    
    // Verify user exists
    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const businesses = getUserBusinesses(userId);
    return NextResponse.json({ businesses });
    
  } catch (error) {
    console.error('[API] GET /api/users/[id]/businesses error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/[id]/businesses
 * Add a business to user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    
    // Verify user exists
    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { place_id, role, notify_new, notify_modified, notify_deleted, notify_rating } = body;
    
    if (!place_id) {
      return NextResponse.json(
        { error: 'Falta place_id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    const businessId = addUserBusiness(
      userId,
      place_id,
      role || 'viewer',
      { notify_new, notify_modified, notify_deleted, notify_rating }
    );
    
    console.log(`[API] Business added to user: userId=${userId}, placeId=${place_id}`);
    
    return NextResponse.json(
      { success: true, id: businessId, code: 'BUSINESS_ADDED' },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[API] POST /api/users/[id]/businesses error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]/businesses
 * Remove a business from user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    
    const placeId = request.nextUrl.searchParams.get('place_id');
    if (!placeId) {
      return NextResponse.json(
        { error: 'Falta place_id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    const removed = removeUserBusiness(userId, placeId);
    
    if (!removed) {
      return NextResponse.json(
        { error: 'Relación no encontrada', code: 'RELATION_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    console.log(`[API] Business removed from user: userId=${userId}, placeId=${placeId}`);
    
    return NextResponse.json({ success: true, code: 'BUSINESS_REMOVED' });
    
  } catch (error) {
    console.error('[API] DELETE /api/users/[id]/businesses error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}