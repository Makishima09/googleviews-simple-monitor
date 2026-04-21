import { NextRequest, NextResponse } from 'next/server';

// Mock user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Mock user data
  const user = {
    id: parseInt(id),
    name: 'Cliente Ejemplo',
    email: 'cliente@ejemplo.com',
    telegram_chat_id: '999888777',
    role: 'viewer',
    places_count: 1,
    created_at: '2024-01-01T00:00:00Z',
    businesses: [
      {
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        name: 'Mi Negocio',
        role: 'viewer'
      }
    ]
  };

  return NextResponse.json(user);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json();
  const { name, email, role, places } = body;

  return NextResponse.json({
    success: true,
    message: 'Cliente actualizado correctamente'
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return NextResponse.json({
    success: true,
    message: 'Cliente eliminado correctamente'
  });
}