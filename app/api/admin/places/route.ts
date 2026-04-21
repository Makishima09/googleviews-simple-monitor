import { NextRequest, NextResponse } from 'next/server';

// Mock places data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const places = {
    places: [
      {
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        name: 'Mi Negocio de Ejemplo',
        address: 'Calle Principal 123, Ciudad',
        total_reviews: 35,
        avg_rating: 4.5,
        five_stars: 22,
        one_star: 3,
        last_sync: new Date().toISOString()
      },
      {
        place_id: 'ChIJEXAMPLExxxxxxxxx',
        name: 'Restaurante La Plaza',
        address: 'Plaza Central 456, Ciudad',
        total_reviews: 12,
        avg_rating: 3.8,
        five_stars: 6,
        one_star: 2,
        last_sync: new Date(Date.now() - 3600000).toISOString()
      },
      {
        place_id: 'ChIJTESTEXAMPLE111',
        name: 'Tienda Electrónica',
        address: 'Avenida Tech 789, Ciudad',
        total_reviews: 89,
        avg_rating: 4.2,
        five_stars: 45,
        one_star: 8,
        last_sync: new Date(Date.now() - 7200000).toISOString()
      }
    ]
  };

  return NextResponse.json(places);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { place_id, name } = body;

    // Mock response
    return NextResponse.json({
      success: true,
      place_id,
      name,
      message: `Negocio '${name}' añadido correctamente`
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al añadir negocio' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { place_id } = body;

    return NextResponse.json({
      success: true,
      place_id,
      message: 'Negocio eliminado correctamente'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar negocio' },
      { status: 500 }
    );
  }
}