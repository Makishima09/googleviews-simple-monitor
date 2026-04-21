import { db } from './schema';

export interface Notification {
  id: number;
  review_id: string;
  place_id: string;
  channel: string;
  payload: string;
  status: 'pending' | 'sent' | 'failed' | 'dead_letter';
  retry_count: number;
  last_error: string | null;
  next_attempt_at: string | null;
  created_at: string;
  sent_at: string | null;
}

/**
 * Create a new notification
 */
export function createNotification(
  reviewId: string,
  placeId: string,
  payload: object
): number {
  const stmt = db.prepare(`
    INSERT INTO notifications (review_id, place_id, payload)
    VALUES (?, ?, ?)
  `);
  return stmt.run(reviewId, placeId, JSON.stringify(payload)).lastInsertRowid as number;
}

/**
 * Get pending notifications that are ready to be processed
 */
export function getPendingNotifications(limit = 10): Notification[] {
  return db.prepare(`
    SELECT * FROM notifications 
    WHERE status = 'pending' 
    AND (next_attempt_at IS NULL OR next_attempt_at <= datetime('now'))
    ORDER BY created_at ASC
    LIMIT ?
  `).all(limit) as Notification[];
}

/**
 * Mark a notification as sent successfully
 */
export function markNotificationSent(id: number): void {
  db.prepare(`
    UPDATE notifications 
    SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(id);
}

/**
 * Mark a notification as failed with retry logic
 * Uses exponential backoff: 1min, 2min, 4min
 * After 3 failures, moves to dead_letter status
 */
export function markNotificationFailed(
  id: number,
  error: string,
  retryCount: number
): void {
  const maxRetries = 3;
  const backoffMinutes = Math.pow(2, retryCount);

  const status = retryCount >= maxRetries ? 'dead_letter' : 'failed';
  const nextAttempt = retryCount < maxRetries
    ? `datetime('now', '+${backoffMinutes} minutes')`
    : 'NULL';

  db.prepare(`
    UPDATE notifications 
    SET status = ?, retry_count = ?, last_error = ?, 
        next_attempt_at = ${nextAttempt}
    WHERE id = ?
  `).run(status, retryCount, error, id);
}

/**
 * Get notification statistics
 */
export function getNotificationStats(): {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  dead_letter: number;
} {
  return db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) as dead_letter
    FROM notifications
  `).get() as {
    total: number;
    sent: number;
    pending: number;
    failed: number;
    dead_letter: number;
  };
}