import { NextRequest, NextResponse } from 'next/server';
import { waitForDb } from '@/lib/db';
import { getPlaces, getPlaceByPlaceId } from '@/lib/db/reviews';

/**
 * GET /api/places
 * - Sin params: devuelve todos los places
 * - ?place_id=: devuelve un place específico
 */
export async function GET(request: NextRequest) {
  try {
    await waitForDb();
    
    const placeId = request.nextUrl.searchParams.get('place_id');

    if (placeId) {
      console.log(`[API] GET /api/places?place_id=${placeId}`);
      const place = getPlaceByPlaceId(placeId);

      if (!place) {
        console.log(`[API] Place not found: ${placeId}`);
        return NextResponse.json(
          { error: 'Place no encontrado', place_id: placeId },
          { status: 404 }
        );
      }

      return NextResponse.json({ place });
    }

    console.log('[API] GET /api/places (all places)');
    const places = getPlaces();
    console.log(`[API] Returning ${places.length} places`);

    return NextResponse.json({ places });
  } catch (error) {
    console.error('[API] Error in GET /api/places:', error);
    return NextResponse.json(
      { error: `Error interno: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
}