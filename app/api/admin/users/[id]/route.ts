import { NextRequest, NextResponse } from 'next/server';
import {
  getUserById,
  updateUser,
  deleteUser,
  getUserBusinesses,
  addUserBusiness,
  removeUserBusiness
} from '@/lib/db/users';

// ============================================
// Admin Middleware
// ============================================

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;
  
  if (!adminSecret) {
    return true;
  }
  
  return authHeader === `Bearer ${adminSecret}`;
}

// ============================================
// /api/admin/users/[id]
// ============================================

/**
 * GET /api/admin/users/[id]
 * Get user details with businesses
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }
    
    const { id } = await params;
    const user = getUserById(parseInt(id));
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const businesses = getUserBusinesses(user.id);
    
    return NextResponse.json({ user, businesses });
    
  } catch (error) {
    console.error('[API] GET /api/admin/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]
 * Update user and optionally their places
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }
    
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
    const { name, email, role, places, notify_new, notify_modified, notify_deleted } = body;
    
    // Update user info
    updateUser(userId, { name, email, role });
    
    // Update places if provided
    const assignedPlaces: string[] = [];
    if (places && Array.isArray(places)) {
      // Get current places
      const currentPlaces = getUserBusinesses(userId).map(b => b.place_id);
      
      // Remove places not in new list
      for (const placeId of currentPlaces) {
        if (!places.includes(placeId)) {
          removeUserBusiness(userId, placeId);
        }
      }
      
      // Add new places
      for (const placeId of places) {
        if (!currentPlaces.includes(placeId)) {
          addUserBusiness(
            userId,
            placeId,
            'viewer',
            { notify_new, notify_modified, notify_deleted }
          );
        }
        assignedPlaces.push(placeId);
      }
    }
    
    const user = getUserById(userId);
    const businesses = getUserBusinesses(userId);
    
    console.log(`[API] Admin: Updated user: id=${userId}, places=${assignedPlaces.length}`);
    
    return NextResponse.json({
      success: true,
      user,
      businesses,
      assigned_places: assignedPlaces,
      code: 'USER_UPDATED'
    });
    
  } catch (error) {
    console.error('[API] PUT /api/admin/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }
    
    const { id } = await params;
    const deleted = deleteUser(parseInt(id));
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    console.log(`[API] Admin: User deleted: id=${id}`);
    
    return NextResponse.json({ success: true, code: 'USER_DELETED' });
    
  } catch (error) {
    console.error('[API] DELETE /api/admin/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}