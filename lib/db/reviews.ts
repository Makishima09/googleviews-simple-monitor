import { db } from './schema';
import { calculateContentHash, deriveReviewId } from '@/lib/hashing';

export interface Review {
  id: number;
  place_id: string;
  review_id: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  date: string | null;
  content_hash: string | null;
  deleted_at: string | null;
  retrieved_at: string;
}

export interface Place {
  id: number;
  place_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: number;
  place_id: string;
  started_at: string;
  finished_at: string | null;
  new_reviews: number;
  status: string;
  error: string | null;
}

/**
 * Filtros para obtener reviews con criterios específicos
 */
export interface ReviewFilters {
  desde?: string;
  hasta?: string;
  rating?: number;
}

/**
 * Get all places ordered by name
 */
export function getPlaces(): Place[] {
  return db.prepare('SELECT * FROM places ORDER BY name').all() as Place[];
}

/**
 * Get a place by its external place_id
 */
export function getPlaceByPlaceId(placeId: string): Place | undefined {
  return db.prepare('SELECT * FROM places WHERE place_id = ?').get(placeId) as Place | undefined;
}

/**
 * Get reviews by place_id with optional limit
 */
export function getReviewsByPlace(placeId: string, limit = 50): Review[] {
  return db.prepare(`
    SELECT * FROM reviews 
    WHERE place_id = ? 
    ORDER BY date DESC 
    LIMIT ?
  `).all(placeId, limit) as Review[];
}

/**
 * Check if a review already exists by its external review_id
 */
export function getReviewByExternalId(externalId: string): Review | undefined {
  return db.prepare('SELECT * FROM reviews WHERE review_id = ?').get(externalId) as Review | undefined;
}

/**
 * Insert a new review (uses INSERT OR IGNORE to prevent duplicates)
 * Returns the rowid of the inserted record (0 if already exists)
 */
export function insertReview(review: Omit<Review, 'id' | 'retrieved_at'>): number {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO reviews (place_id, review_id, author_name, rating, text, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    review.place_id,
    review.review_id,
    review.author_name,
    review.rating,
    review.text,
    review.date
  );
  return result.changes > 0 ? (result.lastInsertRowid as number) : 0;
}

/**
 * Insert a new place (uses INSERT OR IGNORE to prevent duplicates)
 * Returns the rowid of the inserted record (0 if already exists)
 */
export function insertPlace(placeId: string, name?: string): number {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO places (place_id, name)
    VALUES (?, ?)
  `);
  const result = stmt.run(placeId, name || null);
  return result.changes > 0 ? (result.lastInsertRowid as number) : 0;
}

/**
 * Update place's updated_at timestamp
 */
export function updatePlaceTimestamp(placeId: string): void {
  db.prepare(`
    UPDATE places SET updated_at = CURRENT_TIMESTAMP WHERE place_id = ?
  `).run(placeId);
}

/**
 * Start a new sync log entry
 * Returns the log id
 */
export function startSyncLog(placeId: string): number {
  const stmt = db.prepare(`
    INSERT INTO sync_log (place_id, status)
    VALUES (?, 'running')
  `);
  return stmt.run(placeId).lastInsertRowid as number;
}

/**
 * Finish a sync log entry
 */
export function finishSyncLog(
  id: number,
  newReviews: number,
  status: 'success' | 'error',
  error?: string
): void {
  db.prepare(`
    UPDATE sync_log 
    SET finished_at = CURRENT_TIMESTAMP, new_reviews = ?, status = ?, error = ?
    WHERE id = ?
  `).run(newReviews, status, error || null, id);
}

/**
 * Get recent sync logs for a place
 */
export function getRecentSyncLogs(placeId: string, limit = 10): SyncLog[] {
  return db.prepare(`
    SELECT * FROM sync_log 
    WHERE place_id = ? 
    ORDER BY started_at DESC 
    LIMIT ?
  `).all(placeId, limit) as SyncLog[];
}

/**
 * Get all sync logs
 */
export function getAllSyncLogs(limit = 50): SyncLog[] {
  return db.prepare(`
    SELECT * FROM sync_log 
    ORDER BY started_at DESC 
    LIMIT ?
  `).all(limit) as SyncLog[];
}

/**
 * Get reviews with optional filters and pagination
 * @param limit - Maximum number of reviews to return
 * @param offset - Number of reviews to skip
 * @param filters - Optional filters: desde, hasta, rating
 */
export function getReviews(
  limit = 50,
  offset = 0,
  filters?: ReviewFilters
): { reviews: Review[]; total: number } {
  let where = '1=1';
  const params: (string | number)[] = [];

  if (filters?.desde) {
    where += ' AND date >= ?';
    params.push(filters.desde);
  }
  if (filters?.hasta) {
    where += ' AND date <= ?';
    params.push(filters.hasta);
  }
  if (filters?.rating) {
    where += ' AND rating >= ?';
    params.push(filters.rating);
  }

  // Get total count with same filters
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM reviews WHERE ${where}`);
  const { total } = countStmt.get(...params) as { total: number };

  // Get reviews with pagination
  const stmt = db.prepare(`
    SELECT * FROM reviews 
    WHERE ${where}
    ORDER BY date DESC 
    LIMIT ? OFFSET ?
  `);
  const reviews = stmt.all(...params, limit, offset) as Review[];

  console.log(`[DB] getReviews: found ${total} reviews, returning ${reviews.length} (limit=${limit}, offset=${offset})`);
  return { reviews, total };
}

/**
 * Get reviews filtered by place_id with optional filters and pagination
 * @param placeId - The external Google place_id
 * @param limit - Maximum number of reviews to return
 * @param offset - Number of reviews to skip
 * @param filters - Optional filters: desde, hasta, rating
 */
export function getReviewsByPlaceFiltered(
  placeId: string,
  limit = 50,
  offset = 0,
  filters?: ReviewFilters
): { reviews: Review[]; total: number } {
  let where = 'place_id = ?';
  const params: (string | number)[] = [placeId];

  if (filters?.desde) {
    where += ' AND date >= ?';
    params.push(filters.desde);
  }
  if (filters?.hasta) {
    where += ' AND date <= ?';
    params.push(filters.hasta);
  }
  if (filters?.rating) {
    where += ' AND rating >= ?';
    params.push(filters.rating);
  }

  // Get total count with same filters
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM reviews WHERE ${where}`);
  const { total } = countStmt.get(...params) as { total: number };

  // Get reviews with pagination
  const stmt = db.prepare(`
    SELECT * FROM reviews 
    WHERE ${where}
    ORDER BY date DESC 
    LIMIT ? OFFSET ?
  `);
  const reviews = stmt.all(...params, limit, offset) as Review[];

  console.log(`[DB] getReviewsByPlaceFiltered: found ${total} reviews for place=${placeId}, returning ${reviews.length}`);
  return { reviews, total };
}

/**
 * Get statistics from the database
 */
export function getStats(): {
  totalPlaces: number;
  totalReviews: number;
  avgRating: number | null;
  fiveStars: number;
  oneStar: number;
  lastSync: SyncLog | undefined;
} {
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM places) as totalPlaces,
      (SELECT COUNT(*) FROM reviews) as totalReviews,
      (SELECT AVG(rating) FROM reviews WHERE rating IS NOT NULL) as avgRating,
      (SELECT COUNT(*) FROM reviews WHERE rating = 5) as fiveStars,
      (SELECT COUNT(*) FROM reviews WHERE rating = 1) as oneStar
  `).get() as {
    totalPlaces: number;
    totalReviews: number;
    avgRating: number | null;
    fiveStars: number;
    oneStar: number;
  };

  const lastSync = db.prepare(`
    SELECT * FROM sync_log 
    WHERE finished_at IS NOT NULL
    ORDER BY finished_at DESC 
    LIMIT 1
  `).get() as SyncLog | undefined;

  console.log(`[DB] getStats: places=${stats.totalPlaces}, reviews=${stats.totalReviews}, avgRating=${stats.avgRating?.toFixed(2)}`);
  return { ...stats, lastSync };
}

// ============================================
// Deduplication Functions (Milestone 5)
// ============================================

/**
 * Get a review by its content hash
 * @param hash - The content_hash to search for
 * @returns The review if found, undefined otherwise
 */
export function getReviewByHash(hash: string): Review | undefined {
  return db.prepare(
    'SELECT * FROM reviews WHERE content_hash = ?'
  ).get(hash) as Review | undefined;
}

/**
 * Get a review by its content hash or derived ID (fallback)
 * This is the main deduplication function
 * @param hash - The content_hash to search for
 * @param derivedId - The derived review ID as fallback
 * @returns The review if found, undefined otherwise
 */
export function getReviewByHashOrDerived(hash: string, derivedId: string): Review | undefined {
  return db.prepare(`
    SELECT * FROM reviews 
    WHERE (content_hash = ? OR review_id = ?)
    AND deleted_at IS NULL
  `).get(hash, derivedId) as Review | undefined;
}

/**
 * Insert a new review with automatic hash calculation
 * @param review - Review data (without id, retrieved_at, content_hash)
 * @returns The rowid of the inserted record (0 if already exists based on review_id)
 */
export function insertReviewWithHash(
  review: Omit<Review, 'id' | 'retrieved_at' | 'content_hash' | 'deleted_at'>
): number {
  const hash = calculateContentHash(review);

  return db.prepare(`
    INSERT OR IGNORE INTO reviews
    (place_id, review_id, author_name, rating, text, date, content_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    review.place_id,
    review.review_id,
    review.author_name,
    review.rating,
    review.text,
    review.date,
    hash
  ).lastInsertRowid as number;
}

/**
 * Update the content_hash for an existing review
 * Used when a review content has been modified
 * @param id - The review database ID
 * @param hash - The new content hash
 */
export function updateReviewHash(id: number, hash: string): void {
  db.prepare(`
    UPDATE reviews SET content_hash = ? WHERE id = ?
  `).run(hash, id);
}

/**
 * Mark a review as deleted (soft delete)
 * @param id - The review database ID
 */
export function markReviewDeleted(id: number): void {
  db.prepare(`
    UPDATE reviews
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NULL
  `).run(id);
}

/**
 * Get all active (non-deleted) reviews for a place
 * @param placeId - The Google place ID
 * @returns Array of active reviews
 */
export function getActiveReviews(placeId: string): Review[] {
  return db.prepare(`
    SELECT * FROM reviews
    WHERE place_id = ? AND deleted_at IS NULL
    ORDER BY date DESC
  `).all(placeId) as Review[];
}

/**
 * Get all reviews for a place (including deleted) - for audit purposes
 * @param placeId - The Google place ID
 * @returns Array of all reviews
 */
export function getAllReviewsForPlace(placeId: string): Review[] {
  return db.prepare(`
    SELECT * FROM reviews
    WHERE place_id = ?
    ORDER BY date DESC
  `).all(placeId) as Review[];
}

/**
 * Get deleted reviews for a place
 * @param placeId - The Google place ID
 * @returns Array of deleted reviews
 */
export function getDeletedReviews(placeId: string): Review[] {
  return db.prepare(`
    SELECT * FROM reviews
    WHERE place_id = ? AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `).all(placeId) as Review[];
}