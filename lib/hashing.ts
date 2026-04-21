import crypto from 'crypto';

/**
 * Data structure for review content used in hash calculation
 */
export interface ReviewForHash {
  author_name?: string | null;
  text?: string | null;
  rating?: number | null;
  date?: string | null;
}

/**
 * Calculate SHA-256 hash from review content (truncated to 16 chars)
 * Normalizes: author_name + text + rating + date
 * @param review - Review data to hash
 * @returns 16-character hex string hash
 */
export function calculateContentHash(review: ReviewForHash): string {
  // Normalize data for consistent hash across different formats
  const normalized = [
    review.author_name?.trim() || '',
    review.text?.trim() || '',
    String(review.rating || ''),
    review.date || ''
  ].join('|');

  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Derive a review ID from place info (fallback for when review_id is not available)
 * Uses MD5 for backwards compatibility with legacy IDs
 * @param placeId - Google place ID
 * @param authorName - Review author name
 * @param timestamp - Unix timestamp
 * @returns MD5 hash as fallback review ID
 */
export function deriveReviewId(
  placeId: string,
  authorName: string,
  timestamp: number
): string {
  const data = `${placeId}|${authorName}|${timestamp}`;
  return crypto
    .createHash('md5')
    .update(data)
    .digest('hex');
}