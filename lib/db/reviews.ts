import { all, get, run, initDatabase, waitForDb } from '../db';

// Initialize DB on load
initDatabase().catch(console.error);

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

export interface ReviewFilters {
  desde?: string;
  hasta?: string;
  rating?: number;
}

// Get all places
export function getPlaces(): Place[] {
  return all<Place>('SELECT * FROM places ORDER BY name');
}

// Get place by place_id
export function getPlaceByPlaceId(placeId: string): Place | undefined {
  return get<Place>('SELECT * FROM places WHERE place_id = ?', [placeId]);
}

// Get reviews by place
export function getReviewsByPlace(placeId: string, limit = 50, offset = 0): Review[] {
  return all<Review>(
    'SELECT * FROM reviews WHERE place_id = ? ORDER BY date DESC LIMIT ? OFFSET ?',
    [placeId, limit, offset]
  );
}

// Get review by external ID
export function getReviewByExternalId(externalId: string): Review | undefined {
  return get<Review>('SELECT * FROM reviews WHERE review_id = ?', [externalId]);
}

// Insert place
export function insertPlace(placeId: string, name?: string): number {
  const result = run(
    'INSERT OR IGNORE INTO places (place_id, name) VALUES (?, ?)',
    [placeId, name || null]
  );
  return result.lastInsertRowid;
}

// Update place timestamp
export function updatePlaceTimestamp(placeId: string): void {
  run('UPDATE places SET updated_at = CURRENT_TIMESTAMP WHERE place_id = ?', [placeId]);
}

// Insert review with hash
export function insertReviewWithHash(review: {
  place_id: string;
  review_id: string;
  author_name?: string | null;
  rating?: number | null;
  text?: string | null;
  date?: string | null;
}): number {
  // Calculate hash
  const normalized = [
    review.author_name?.trim() || '',
    review.text?.trim() || '',
    String(review.rating || ''),
    review.date || ''
  ].join('|');
  
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);

  const result = run(
    `INSERT OR IGNORE INTO reviews (place_id, review_id, author_name, rating, text, date, content_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      review.place_id,
      review.review_id,
      review.author_name || null,
      review.rating || null,
      review.text || null,
      review.date || null,
      hash
    ]
  );
  return result.lastInsertRowid;
}

// Start sync log
export function startSyncLog(placeId: string): number {
  const result = run(
    'INSERT INTO sync_log (place_id, status) VALUES (?, ?)',
    [placeId, 'running']
  );
  return result.lastInsertRowid;
}

// Finish sync log
export function finishSyncLog(
  id: number,
  newReviews: number,
  status: 'success' | 'error',
  error?: string
): void {
  run(
    `UPDATE sync_log SET finished_at = CURRENT_TIMESTAMP, new_reviews = ?, status = ?, error = ? WHERE id = ?`,
    [newReviews, status, error || null, id]
  );
}

// Get recent sync logs
export function getRecentSyncLogs(limit = 10) {
  return all('SELECT * FROM sync_log ORDER BY finished_at DESC LIMIT ?', [limit]);
}

// Get all sync logs
export function getAllSyncLogs() {
  return all('SELECT * FROM sync_log ORDER BY finished_at DESC');
}

// Delete place
export function deletePlace(placeId: string): void {
  run('DELETE FROM places WHERE place_id = ?', [placeId]);
}

// Get stats for place
export function getPlaceStats(placeId: string) {
  const total = get<{ count: number }>('SELECT COUNT(*) as count FROM reviews WHERE place_id = ?', [placeId]);
  const avg = get<{ avg: number }>('SELECT AVG(rating) as avg FROM reviews WHERE place_id = ? AND rating IS NOT NULL', [placeId]);
  const lastSync = get<SyncLog>('SELECT * FROM sync_log WHERE place_id = ? ORDER BY finished_at DESC LIMIT 1', [placeId]);
  
  return {
    total: total?.count || 0,
    avg_rating: avg?.avg || 0,
    last_sync: lastSync?.finished_at || null
  };
}

// Get all reviews (for admin)
export function getAllReviews(limit = 1000): Review[] {
  return all<Review>('SELECT * FROM reviews ORDER BY date DESC LIMIT ?', [limit]);
}

// Get reviews with filters
export function getReviewsWithFilters(filters: ReviewFilters & { place_id?: string }, limit = 50, offset = 0) {
  let sql = 'SELECT * FROM reviews WHERE 1=1';
  const params: any[] = [];

  if (filters.place_id) {
    sql += ' AND place_id = ?';
    params.push(filters.place_id);
  }
  if (filters.desde) {
    sql += ' AND date >= ?';
    params.push(filters.desde);
  }
  if (filters.hasta) {
    sql += ' AND date <= ?';
    params.push(filters.hasta);
  }
  if (filters.rating) {
    sql += ' AND rating >= ?';
    params.push(filters.rating);
  }

  sql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return all<Review>(sql, params);
}

// Get review count
export function getReviewCount(placeId?: string): number {
  if (placeId) {
    const result = get<{ count: number }>('SELECT COUNT(*) as count FROM reviews WHERE place_id = ?', [placeId]);
    return result?.count || 0;
  }
  const result = get<{ count: number }>('SELECT COUNT(*) as count FROM reviews');
  return result?.count || 0;
}

// Get review by hash
export function getReviewByHash(hash: string): Review | undefined {
  return get<Review>('SELECT * FROM reviews WHERE content_hash = ?', [hash]);
}

// Get review by hash or derived
export function getReviewByHashOrDerived(hash: string, derivedId: string): Review | undefined {
  return get<Review>(
    'SELECT * FROM reviews WHERE content_hash = ? OR review_id = ?',
    [hash, derivedId]
  );
}

// Update review hash
export function updateReviewHash(id: number, hash: string): void {
  run('UPDATE reviews SET content_hash = ? WHERE id = ?', [hash, id]);
}

// Mark review deleted
export function markReviewDeleted(id: number): void {
  run('UPDATE reviews SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

// Get active reviews
export function getActiveReviews(placeId: string): Review[] {
  return all<Review>(
    'SELECT * FROM reviews WHERE place_id = ? AND deleted_at IS NULL ORDER BY date DESC',
    [placeId]
  );
}

// Get deleted reviews
export function getDeletedReviews(placeId: string): Review[] {
  return all<Review>(
    'SELECT * FROM reviews WHERE place_id = ? AND deleted_at IS NOT NULL ORDER BY date DESC',
    [placeId]
  );
}

// Get all reviews for place (including deleted)
export function getAllReviewsForPlace(placeId: string): Review[] {
  return all<Review>(
    'SELECT * FROM reviews WHERE place_id = ? ORDER BY date DESC',
    [placeId]
  );
}

// Get global stats
export function getStats() {
  const totalReviews = get<{ count: number }>('SELECT COUNT(*) as count FROM reviews');
  const fiveStars = get<{ count: number }>('SELECT COUNT(*) as count FROM reviews WHERE rating = 5');
  const oneStar = get<{ count: number }>('SELECT COUNT(*) as count FROM reviews WHERE rating = 1');
  const avgRating = get<{ avg: number }>('SELECT AVG(rating) as avg FROM reviews WHERE rating IS NOT NULL');
  const lastSync = get('SELECT * FROM sync_log ORDER BY finished_at DESC LIMIT 1');
  
  return {
    totalReviews: totalReviews?.count || 0,
    fiveStars: fiveStars?.count || 0,
    oneStar: oneStar?.count || 0,
    avgRating: avgRating?.avg || null,
    lastSync
  };
}