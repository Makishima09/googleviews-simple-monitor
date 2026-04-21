import { NextRequest, NextResponse } from 'next/server';
import { getAllPlacesWithStats, getRecentActivity, getPlacesCount } from '@/lib/db/places';
import { getAllUsers, getUsersCountByRole } from '@/lib/db/users';
import { getStats } from '@/lib/db/reviews';
import { getNotificationStats } from '@/lib/db/notifications';

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
// /api/admin/dashboard
// ============================================

/**
 * GET /api/admin/dashboard
 * Get global dashboard stats
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
    
    // Get global stats from reviews
    const reviewStats = getStats();
    
    // Get places with stats
    const places = getAllPlacesWithStats();
    
    // Get recent activity
    const recentActivity = getRecentActivity(10);
    
    // Get users stats
    const usersStats = getUsersCountByRole();
    
    // Get notifications stats
    const notificationsStats = getNotificationStats();
    
    // Calculate global average rating
    const totalRating = places.reduce((sum, p) => {
      return sum + (p.avg_rating || 0);
    }, 0);
    const avgRating = places.length > 0 ? totalRating / places.length : null;
    
    // Build response
    const dashboard = {
      // Summary cards
      total_places: places.length,
      total_reviews: reviewStats.totalReviews,
      avg_rating: avgRating ? parseFloat(avgRating.toFixed(2)) : null,
      five_stars: reviewStats.fiveStars,
      one_star: reviewStats.oneStar,
      
      // Users
      users: {
        total: usersStats.total,
        admins: usersStats.admin,
        viewers: usersStats.viewer
      },
      
      // Notifications
      notifications: {
        sent: notificationsStats.sent,
        pending: notificationsStats.pending,
        failed: notificationsStats.failed,
        dead_letter: notificationsStats.dead_letter
      },
      
      // Last sync info
      last_sync: reviewStats.lastSync?.finished_at || null,
      
      // Places with stats
      places: places.map(p => ({
        place_id: p.place_id,
        name: p.name,
        total_reviews: p.total_reviews,
        avg_rating: p.avg_rating ? parseFloat(p.avg_rating.toFixed(2)) : null,
        five_stars: p.five_stars,
        one_star: p.one_star,
        last_sync: p.last_sync
      })),
      
      // Recent activity
      recent_activity: recentActivity.map(a => ({
        place_id: a.place_id,
        place_name: a.place_name,
        review_id: a.review_id,
        author_name: a.author_name,
        rating: a.rating,
        date: a.date,
        action: a.action
      }))
    };
    
    console.log(`[API] Admin dashboard: places=${dashboard.total_places}, reviews=${dashboard.total_reviews}`);
    
    return NextResponse.json(dashboard);
    
  } catch (error) {
    console.error('[API] GET /api/admin/dashboard error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}