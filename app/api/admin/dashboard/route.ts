import { NextRequest, NextResponse } from 'next/server';

// Mock data for testing UI when DB is not available
const mockDashboard = {
  total_places: 2,
  total_reviews: 47,
  avg_rating: 4.3,
  five_stars: 28,
  one_star: 5,
  users: {
    total: 1,
    admins: 1,
    viewers: 0
  },
  notifications: {
    sent: 12,
    pending: 2,
    failed: 1,
    dead_letter: 0
  },
  last_sync: new Date().toISOString(),
  places: [
    {
      place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      name: 'Mi Negocio de Ejemplo',
      total_reviews: 35,
      avg_rating: 4.5,
      five_stars: 22,
      one_star: 3,
      last_sync: new Date().toISOString()
    },
    {
      place_id: 'ChIJEXAMPLExxxxxxxxx',
      name: 'Otro Negocio',
      total_reviews: 12,
      avg_rating: 3.8,
      five_stars: 6,
      one_star: 2,
      last_sync: new Date().toISOString()
    }
  ],
  recent_activity: [
    {
      place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      place_name: 'Mi Negocio de Ejemplo',
      review_id: 'abc123',
      author_name: 'Juan Pérez',
      rating: 5,
      date: new Date().toISOString(),
      action: 'new'
    },
    {
      place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      place_name: 'Mi Negocio de Ejemplo',
      review_id: 'def456',
      author_name: 'María García',
      rating: 4,
      date: new Date(Date.now() - 86400000).toISOString(),
      action: 'modified'
    }
  ]
};

export async function GET(request: NextRequest) {
  // Return mock data for UI testing
  return NextResponse.json(mockDashboard);
}