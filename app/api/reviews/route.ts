import { NextRequest, NextResponse } from 'next/server';
import { getReviews, getReviewsByPlaceFiltered } from '@/lib/db/reviews';

interface ReviewFilters {
  desde?: string;
  hasta?: string;
  rating?: number;
}

/**
 * GET /api/reviews
 * Lee de SQLite con filtros y paginación
 * Fallback a Google API si no hay datos en la base de datos
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placeId = searchParams.get('place_id');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const ratingParam = searchParams.get('rating');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const source = searchParams.get('source'); // 'sqlite' | 'google' - forzar fuente

    // Parse rating filter
    const rating = ratingParam ? parseInt(ratingParam, 10) : undefined;

    const filters: ReviewFilters = {};
    if (desde) filters.desde = desde;
    if (hasta) filters.hasta = hasta;
    if (rating) filters.rating = rating;

    console.log(`[API] GET /api/reviews: place_id=${placeId}, limit=${limit}, offset=${offset}, desde=${desde}, hasta=${hasta}, rating=${ratingParam}`);

    // Intentar leer de SQLite primero (si no se fuerza Google)
    if (placeId && source !== 'google') {
      console.log(`[API] Fetching from SQLite for place: ${placeId}`);
      const result = getReviewsByPlaceFiltered(placeId, limit, offset, filters);

      if (result.reviews.length > 0) {
        console.log(`[API] Returning ${result.reviews.length} reviews from SQLite`);
        return NextResponse.json({
          source: 'sqlite',
          reviews: result.reviews,
          pagination: {
            total: result.total,
            limit,
            offset,
            hasMore: offset + result.reviews.length < result.total
          }
        });
      }

      // No hay datos en SQLite, intentar fallback a Google API
      if (result.total === 0 && !desde && !hasta && !rating) {
        console.log(`[API] No data in SQLite, falling back to Google API`);
        return fetchFromGoogleAPI(placeId, searchParams);
      }

      // Hay filtros pero no hay resultados
      console.log(`[API] No reviews match filters from SQLite`);
      return NextResponse.json({
        source: 'sqlite',
        reviews: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        }
      });
    }

    // Sin place_id, obtener todas las reviews
    if (source !== 'google') {
      console.log(`[API] Fetching all reviews from SQLite`);
      const result = getReviews(limit, offset, filters);

      return NextResponse.json({
        source: 'sqlite',
        reviews: result.reviews,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + result.reviews.length < result.total
        }
      });
    }

    // Force Google API
    if (placeId) {
      return fetchFromGoogleAPI(placeId, searchParams);
    }

    return NextResponse.json(
      { error: 'Place ID es requerido para obtener de Google API' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[API] Error in GET /api/reviews:', error);
    return NextResponse.json(
      { error: `Error interno: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
}

/**
 * Fallback to Google Places API when SQLite has no data
 */
async function fetchFromGoogleAPI(placeId: string, searchParams: URLSearchParams): Promise<NextResponse> {
  const apiKey = process.env.GOOGLE_API_KEY || searchParams.get('apiKey');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google API Key no configurada. Agregala en .env.local.' },
      { status: 400 }
    );
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,reviews,rating,user_ratings_total&key=${apiKey}&language=es`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: `Google API Error: ${data.status} - ${data.error_message || 'Error desconocido'}` },
        { status: 400 }
      );
    }

    const reviews = (data.result?.reviews || []).map((review: any) => ({
      place_id: placeId,
      review_id: `${review.author_name}_${review.time}`,
      author_name: review.author_name,
      rating: review.rating,
      text: review.text || '',
      date: review.time ? new Date(review.time * 1000).toISOString().split('T')[0] : null
    }));

    console.log(`[API] Returning ${reviews.length} reviews from Google API`);

    return NextResponse.json({
      source: 'google',
      reviews,
      businessName: data.result?.name,
      totalReviews: data.result?.user_ratings_total,
      averageRating: data.result?.rating,
      pagination: {
        total: reviews.length,
        limit: reviews.length,
        offset: 0,
        hasMore: false
      }
    });

  } catch (error) {
    console.error('[API] Error fetching from Google API:', error);
    return NextResponse.json(
      { error: `Error al obtener reseñas de Google: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
}

