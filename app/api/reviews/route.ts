import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placeId = searchParams.get('placeId');
    
    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID es requerido' },
        { status: 400 }
      );
    }

    // La API Key puede venir del .env o del cliente (para flexibilidad)
    const apiKey = process.env.GOOGLE_API_KEY || searchParams.get('apiKey');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API Key no configurada. Agrégala en .env.local o envíala en la petición.' },
        { status: 400 }
      );
    }

    // Llamada real a Google Places API
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,reviews,rating,user_ratings_total&key=${apiKey}&language=es`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: `Google API Error: ${data.status} - ${data.error_message || 'Error desconocido'}` },
        { status: 400 }
      );
    }

    // Formatear las reseñas con un ID único
    const reviews = (data.result?.reviews || []).map((review: any) => ({
      author_name: review.author_name,
      rating: review.rating,
      text: review.text || '',
      time: review.time,
      review_id: `${review.author_name}_${review.time}` // ID único basado en autor y timestamp
    }));

    return NextResponse.json({
      success: true,
      reviews,
      businessName: data.result?.name,
      totalReviews: data.result?.user_ratings_total,
      averageRating: data.result?.rating
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: `Error al obtener reseñas: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
}

