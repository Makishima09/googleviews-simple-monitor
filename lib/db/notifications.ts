import { all, get, run, initDatabase } from '../db';

// Initialize DB
initDatabase().catch(console.error);

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

// Create notification
export function createNotification(
  reviewId: string,
  placeId: string,
  payload: object
): number {
  const result = run(
    'INSERT INTO notifications (review_id, place_id, payload) VALUES (?, ?, ?)',
    [reviewId, placeId, JSON.stringify(payload)]
  );
  return result.lastInsertRowid;
}

// Get pending notifications
export function getPendingNotifications(limit = 10): Notification[] {
  return all<Notification>(`
    SELECT * FROM notifications 
    WHERE status = 'pending' 
    AND (next_attempt_at IS NULL OR next_attempt_at <= datetime('now'))
    ORDER BY created_at ASC
    LIMIT ?
  `, [limit]);
}

// Mark notification sent
export function markNotificationSent(id: number): void {
  run(`
    UPDATE notifications 
    SET status = 'sent', sent_at = datetime('now') 
    WHERE id = ?
  `, [id]);
}

// Mark notification failed
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

  run(`
    UPDATE notifications 
    SET status = ?, retry_count = ?, last_error = ?, 
        next_attempt_at = ${nextAttempt}
    WHERE id = ?
  `, [status, retryCount, error, id]);
}

// Get notification stats
export function getNotificationStats() {
  return get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) as dead_letter
    FROM notifications
  `);
}

// Get notifications by review
export function getNotificationsByReview(reviewId: string): Notification[] {
  return all<Notification>(
    'SELECT * FROM notifications WHERE review_id = ? ORDER BY created_at DESC',
    [reviewId]
  );
}

// Get notifications by place
export function getNotificationsByPlace(placeId: string): Notification[] {
  return all<Notification>(
    'SELECT * FROM notifications WHERE place_id = ? ORDER BY created_at DESC LIMIT 100',
    [placeId]
  );
}