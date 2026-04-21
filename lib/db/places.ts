import { db } from './schema';

// ============================================
// Types
// ============================================

export interface Place {
  id: number;
  place_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceWithStats extends Place {
  total_reviews: number;
  avg_rating: number | null;
  five_stars: number;
  one_star: number;
  last_sync: string | null;
}

// ============================================
// Place CRUD Operations
// ============================================

/**
 * Get all places
 */
export function getAllPlaces(): Place[] {
  return db.prepare('SELECT * FROM places ORDER BY name').all() as Place[];
}

/**
 * Get place by place_id
 */
export function getPlaceByPlaceId(placeId: string): Place | undefined {
  return db.prepare('SELECT * FROM places WHERE place_id = ?').get(placeId) as Place | undefined;
}

/**
 * Add a new place
 * @returns The new place ID, or existing place ID if already exists
 */
export function addPlace(placeId: string, name?: string): number {
  const stmt = db.prepare(`
    INSERT INTO places (place_id, name)
    VALUES (?, ?)
    ON CONFLICT(place_id) DO UPDATE SET name = excluded.name
  `);
  
  const result = stmt.run(placeId, name || null);
  
  console.log(`[PLACES] Added/updated place: placeId=${placeId}, name=${name}`);
  return result.lastInsertRowid as number;
}

/**
 * Remove a place (also removes user associations)
 */
export function removePlace(placeId: string): boolean {
  // First remove user associations
  db.prepare('DELETE FROM user_businesses WHERE place_id = ?').run(placeId);
  
  // Then remove the place
  const result = db.prepare('DELETE FROM places WHERE place_id = ?').run(placeId);
  
  console.log(`[PLACES] Removed place: placeId=${placeId}`);
  return result.changes > 0;
}

/**
 * Update place name
 */
export function updatePlaceName(placeId: string, name: string): boolean {
  const result = db.prepare(`
    UPDATE places SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE place_id = ?
  `).run(name, placeId);
  
  return result.changes > 0;
}

// ============================================
// Place Statistics
// ============================================

/**
 * Get statistics for a specific place
 */
export function getPlaceStats(placeId: string): {
  place: Place | undefined;
  total_reviews: number;
  avg_rating: number | null;
  five_stars: number;
  four_stars: number;
  three_stars: number;
  two_stars: number;
  one_star: number;
  last_sync: string | null;
} {
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM reviews WHERE place_id = ? AND deleted_at IS NULL) as total_reviews,
      (SELECT AVG(rating) FROM reviews WHERE place_id = ? AND rating IS NOT NULL AND deleted_at IS NULL) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE place_id = ? AND rating = 5 AND deleted_at IS NULL) as five_stars,
      (SELECT COUNT(*) FROM reviews WHERE place_id = ? AND rating = 4 AND deleted_at IS NULL) as four_stars,
      (SELECT COUNT(*) FROM reviews WHERE place_id = ? AND rating = 3 AND deleted_at IS NULL) as three_stars,
      (SELECT COUNT(*) FROM reviews WHERE place_id = ? AND rating = 2 AND deleted_at IS NULL) as two_stars,
      (SELECT COUNT(*) FROM reviews WHERE place_id = ? AND rating = 1 AND deleted_at IS NULL) as one_star
  `).get(placeId, placeId, placeId, placeId, placeId, placeId, placeId) as {
    total_reviews: number;
    avg_rating: number | null;
    five_stars: number;
    four_stars: number;
    three_stars: number;
    two_stars: number;
    one_star: number;
  };
  
  const lastSync = db.prepare(`
    SELECT finished_at FROM sync_log 
    WHERE place_id = ? AND finished_at IS NOT NULL
    ORDER BY finished_at DESC 
    LIMIT 1
  `).get(placeId) as { finished_at: string } | undefined;
  
  return {
    place: getPlaceByPlaceId(placeId),
    ...stats,
    last_sync: lastSync?.finished_at || null
  };
}

/**
 * Get all places with their statistics
 */
export function getAllPlacesWithStats(): PlaceWithStats[] {
  const places = getAllPlaces();
  
  return places.map(place => {
    const stats = getPlaceStats(place.place_id);
    return {
      ...place,
      total_reviews: stats.total_reviews,
      avg_rating: stats.avg_rating,
      five_stars: stats.five_stars,
      one_star: stats.one_star,
      last_sync: stats.last_sync
    };
  });
}

/**
 * Get places count
 */
export function getPlacesCount(): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM places').get() as { count: number };
  return result.count;
}

/**
 * Get recent activity across all places
 */
export function getRecentActivity(limit = 10): {
  place_id: string;
  place_name: string;
  review_id: string;
  author_name: string | null;
  rating: number | null;
  date: string;
  action: 'new' | 'modified' | 'deleted';
}[] {
  return db.prepare(`
    SELECT 
      r.place_id,
      p.name as place_name,
      r.review_id,
      r.author_name,
      r.rating,
      r.date,
      CASE 
        WHEN r.deleted_at IS NOT NULL THEN 'deleted'
        WHEN r.retrieved_at > datetime('now', '-1 hour') THEN 'new'
        ELSE 'modified'
      END as action
    FROM reviews r
    JOIN places p ON r.place_id = p.place_id
    ORDER BY COALESCE(r.deleted_at, r.retrieved_at) DESC
    LIMIT ?
  `).all(limit) as {
    place_id: string;
    place_name: string;
    review_id: string;
    author_name: string | null;
    rating: number | null;
    date: string;
    action: 'new' | 'modified' | 'deleted';
  }[];
}

/**
 * Search places by name
 */
export function searchPlaces(query: string): Place[] {
  return db.prepare(`
    SELECT * FROM places 
    WHERE name LIKE ? OR place_id LIKE ?
    ORDER BY name
  `).all(`%${query}%`, `%${query}%`) as Place[];
}