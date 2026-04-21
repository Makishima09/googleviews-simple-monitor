import { NextRequest, NextResponse } from 'next/server';
import {
  createUser,
  getUserById,
  getAllUsers,
  getAllUsersWithBusinesses,
  updateUser,
  deleteUser,
  addUserBusiness,
  removeUserBusiness,
  getUserBusinesses,
  getUsersCountByRole,
  getUserPlacesCount
} from '@/lib/db/users';
import { getAllPlaces } from '@/lib/db/places';

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
// /api/admin/users
// ============================================

/**
 * GET /api/admin/users
 * List all users (with their businesses and stats)
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
    
    const includeBusinesses = request.nextUrl.searchParams.get('businesses') === 'true';
    
    if (includeBusinesses) {
      const users = getAllUsersWithBusinesses();
      return NextResponse.json({ users });
    }
    
    const users = getAllUsers();
    const stats = getUsersCountByRole();
    
    return NextResponse.json({ users, stats });
    
  } catch (error) {
    console.error('[API] GET /api/admin/users error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user (client) and optionally assign places
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
    const { name, telegram_chat_id, email, role, places } = body;
    
    // Validation
    if (!name || !telegram_chat_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, telegram_chat_id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // Create user
    const userId = createUser({
      name,
      telegram_chat_id,
      email,
      role: role || 'viewer'
    });
    
    // Assign places if provided
    const assignedPlaces: string[] = [];
    if (places && Array.isArray(places)) {
      for (const placeId of places) {
        addUserBusiness(userId, placeId, 'viewer');
        assignedPlaces.push(placeId);
      }
    }
    
    console.log(`[API] Admin: Created user: id=${userId}, name=${name}, places=${assignedPlaces.length}`);
    
    return NextResponse.json(
      { 
        success: true, 
        id: userId,
        assigned_places: assignedPlaces,
        code: 'USER_CREATED' 
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[API] POST /api/admin/users error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]
 * Update user and their places
 */
export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { user_id, name, email, role, places } = body;
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'Falta user_id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // Update user info
    const updated = updateUser(user_id, { name, email, role });
    
    // Update places if provided
    const assignedPlaces: string[] = [];
    if (places && Array.isArray(places)) {
      // Get current places
      const currentPlaces = getUserBusinesses(user_id).map(b => b.place_id);
      
      // Remove places not in new list
      for (const placeId of currentPlaces) {
        if (!places.includes(placeId)) {
          removeUserBusiness(user_id, placeId);
        }
      }
      
      // Add new places
      for (const placeId of places) {
        if (!currentPlaces.includes(placeId)) {
          addUserBusiness(user_id, placeId, 'viewer');
        }
        assignedPlaces.push(placeId);
      }
    }
    
    console.log(`[API] Admin: Updated user: id=${user_id}, places=${assignedPlaces.length}`);
    
    return NextResponse.json(
      { 
        success: true, 
        assigned_places: assignedPlaces,
        code: 'USER_UPDATED' 
      }
    );
    
  } catch (error) {
    console.error('[API] PUT /api/admin/users error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}