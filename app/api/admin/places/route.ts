import { NextRequest, NextResponse } from 'next/server';
import { getAllPlaces, addPlace, removePlace, getAllPlacesWithStats } from '@/lib/db/places';

// ============================================
// Admin Middleware
// ============================================

/**
 * Verify if the request is from an admin user
 * For now, we check a simple header - in production, use proper auth
 */
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;
  
  // If no admin secret configured, allow all (development mode)
  if (!adminSecret) {
    return true;
  }
  
  return authHeader === `Bearer ${adminSecret}`;
}

// ============================================
// /api/admin/places
// ============================================

/**
 * GET /api/admin/places
 * List all places with stats
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }
    
    const places = getAllPlacesWithStats();
    return NextResponse.json({ places });
    
  } catch (error) {
    console.error('[API] GET /api/admin/places error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/places
 * Add a new place
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { place_id, name } = body;
    
    if (!place_id) {
      return NextResponse.json(
        { error: 'Falta place_id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    const id = addPlace(place_id, name);
    console.log(`[API] Admin: Place added: placeId=${place_id}, name=${name}`);
    
    return NextResponse.json(
      { success: true, id, code: 'PLACE_ADDED' },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[API] POST /api/admin/places error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/places
 * Remove a place
 */
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }
    
    const { place_id } = await request.json();
    
    if (!place_id) {
      return NextResponse.json(
        { error: 'Falta place_id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    const removed = removePlace(place_id);
    
    if (!removed) {
      return NextResponse.json(
        { error: 'Place no encontrado', code: 'PLACE_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    console.log(`[API] Admin: Place removed: placeId=${place_id}`);
    
    return NextResponse.json({ success: true, code: 'PLACE_REMOVED' });
    
  } catch (error) {
    console.error('[API] DELETE /api/admin/places error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}