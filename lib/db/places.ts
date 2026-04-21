import { all, get, run, initDatabase } from '../db';

// Initialize DB
initDatabase().catch(console.error);

export interface Place {
  id: number;
  place_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceStats {
  total: number;
  avg_rating: number;
  recent: number;
}

// Get all places
export function getAllPlaces(): Place[] {
  return all<Place>('SELECT * FROM places ORDER BY name');
}

// Get place by ID
export function getPlaceById(id: number): Place | undefined {
  return get<Place>('SELECT * FROM places WHERE id = ?', [id]);
}

// Get place by place_id
export function getPlaceByPlaceId(placeId: string): Place | undefined {
  return get<Place>('SELECT * FROM places WHERE place_id = ?', [placeId]);
}

// Add place
export function addPlace(placeId: string, name?: string, config?: any): number {
  const result = run(
    'INSERT OR IGNORE INTO places (place_id, name) VALUES (?, ?)',
    [placeId, name || null]
  );
  return result.lastInsertRowid;
}

// Update place
export function updatePlace(placeId: string, data: { name?: string }): void {
  if (data.name) {
    run('UPDATE places SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE place_id = ?', 
      [data.name, placeId]);
  }
}

// Remove place
export function removePlace(placeId: string): void {
  // Delete related records first
  run('DELETE FROM reviews WHERE place_id = ?', [placeId]);
  run('DELETE FROM sync_log WHERE place_id = ?', [placeId]);
  run('DELETE FROM user_businesses WHERE place_id = ?', [placeId]);
  run('DELETE FROM places WHERE place_id = ?', [placeId]);
}

// Get stats for place
export function getStatsForPlace(placeId: string): PlaceStats {
  const total = get<{ count: number }>(
    'SELECT COUNT(*) as count FROM reviews WHERE place_id = ?',
    [placeId]
  );
  
  const avg = get<{ avg: number }>(
    'SELECT AVG(rating) as avg FROM reviews WHERE place_id = ? AND rating IS NOT NULL',
    [placeId]
  );

  // Recent = last 7 days
  const recent = get<{ count: number }>(
    `SELECT COUNT(*) as count FROM reviews WHERE place_id = ? AND date >= datetime('now', '-7 days')`,
    [placeId]
  );

  return {
    total: total?.count || 0,
    avg_rating: avg?.avg || 0,
    recent: recent?.count || 0
  };
}

// Get places with stats (for admin)
export function getPlacesWithStats() {
  const places = getAllPlaces();
  return places.map(place => ({
    ...place,
    ...getStatsForPlace(place.place_id)
  }));
}

// Get places count
export function getPlacesCount(): number {
  const result = get<{ count: number }>('SELECT COUNT(*) as count FROM places');
  return result?.count || 0;
}

// Get all places with stats (for dashboard)
export function getAllPlacesWithStats() {
  const places = getAllPlaces();
  return places.map(place => {
    const stats = getStatsForPlace(place.place_id);
    const fiveStars = get<{ count: number }>(
      'SELECT COUNT(*) as count FROM reviews WHERE place_id = ? AND rating = 5',
      [place.place_id]
    );
    const oneStar = get<{ count: number }>(
      'SELECT COUNT(*) as count FROM reviews WHERE place_id = ? AND rating = 1',
      [place.place_id]
    );
    const lastSync = get(
      'SELECT finished_at FROM sync_log WHERE place_id = ? ORDER BY finished_at DESC LIMIT 1',
      [place.place_id]
    );
    return {
      ...place,
      ...stats,
      five_stars: fiveStars?.count || 0,
      one_star: oneStar?.count || 0,
      last_sync: lastSync?.finished_at || null
    };
  });
}

// Get recent activity
export function getRecentActivity(limit = 10) {
  return all(`
    SELECT 
      r.place_id,
      p.name as place_name,
      r.review_id,
      r.author_name,
      r.rating,
      r.date,
      r.retrieved_at,
      CASE 
        WHEN r.deleted_at IS NOT NULL THEN 'deleted'
        WHEN r.content_hash IS NULL THEN 'new'
        ELSE 'modified'
      END as action
    FROM reviews r
    LEFT JOIN places p ON r.place_id = p.place_id
    ORDER BY r.retrieved_at DESC
    LIMIT ?
  `, [limit]);
}