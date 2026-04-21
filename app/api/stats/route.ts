import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db/reviews';

/**
 * GET /api/stats
 * Devuelve estadísticas de la base de datos:
 * - total places
 * - total reviews
 * - avg rating
 * - 5 stars count
 * - 1 star count
 * - último sync
 */
export async function GET() {
  try {
    console.log('[API] GET /api/stats');
    const stats = getStats();

    console.log(`[API] Stats: places=${stats.totalPlaces}, reviews=${stats.totalReviews}, avgRating=${stats.avgRating?.toFixed(2)}`);

    return NextResponse.json({
      totalPlaces: stats.totalPlaces,
      totalReviews: stats.totalReviews,
      avgRating: stats.avgRating ? parseFloat(stats.avgRating.toFixed(2)) : null,
      fiveStars: stats.fiveStars,
      oneStar: stats.oneStar,
      lastSync: stats.lastSync ? {
        place_id: stats.lastSync.place_id,
        finished_at: stats.lastSync.finished_at,
        new_reviews: stats.lastSync.new_reviews,
        status: stats.lastSync.status
      } : null
    });
  } catch (error) {
    console.error('[API] Error in GET /api/stats:', error);
    return NextResponse.json(
      { error: `Error interno: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
}