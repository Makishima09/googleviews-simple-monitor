import {
  getPendingNotifications,
  markNotificationSent,
  markNotificationFailed,
  createNotification
} from '@/lib/db/notifications';
import { getUsersForPlace, getAdmins } from '@/lib/db/users';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Send a notification to Telegram
 * Returns true if successful, false otherwise
 */
export async function sendTelegramNotification(
  chatId: string,
  text: string,
  token?: string
): Promise<boolean> {
  const botToken = token || TELEGRAM_TOKEN;

  if (!botToken) {
    console.error('[NOTIFICATIONS] No hay Telegram token configurado');
    return false;
  }

  if (!chatId) {
    console.error('[NOTIFICATIONS] No hay chatId configurado');
    return false;
  }

  // Validate that we have actual values (not empty strings)
  if (botToken.trim() === '' || chatId.trim() === '') {
    console.error('[NOTIFICATIONS] Telegram token o chatId están vacíos');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown'
        })
      }
    );

    const result = await response.json();

    if (!result.ok) {
      console.error('[NOTIFICATIONS] Telegram API error:', result.description);
      return false;
    }

    console.log('[NOTIFICATIONS] Mensaje enviado a Telegram:', result.result.message_id);
    return true;
  } catch (error) {
    console.error('[NOTIFICATIONS] Error enviando a Telegram:', error);
    return false;
  }
}

/**
 * Process pending notifications from the queue
 * Returns counts of sent and failed notifications
 */
export async function processNotifications(): Promise<{
  sent: number;
  failed: number;
}> {
  const pending = getPendingNotifications(10);

  let sent = 0;
  let failed = 0;

  for (const notification of pending) {
    const payload = JSON.parse(notification.payload);
    const chatId = payload.chat_id || DEFAULT_CHAT_ID;
    const text = payload.text;
    const token = payload.token || TELEGRAM_TOKEN;

    const success = await sendTelegramNotification(chatId, text, token);

    if (success) {
      markNotificationSent(notification.id);
      sent++;
      console.log(`[NOTIFICATIONS] Notificación ${notification.id} enviada`);
    } else {
      markNotificationFailed(
        notification.id,
        'Telegram API error',
        notification.retry_count + 1
      );
      failed++;
      console.log(`[NOTIFICATIONS] Notificación ${notification.id} fallida, retry_count=${notification.retry_count + 1}`);
    }
  }

  console.log(`[NOTIFICATIONS] Procesadas: ${sent} enviadas, ${failed} fallidas`);
  return { sent, failed };
}

/**
 * Queue notifications for new review to specific users who have access to the place
 * This is the key function for per-user notifications
 */
export function queueNotificationForPlace(
  reviewId: string,
  placeId: string,
  text: string,
  notifyType: 'new' | 'modified' | 'deleted' = 'new'
): number {
  // Get users who should receive notifications for this place
  const users = getUsersForPlace(placeId, notifyType);
  
  if (users.length === 0) {
    console.log(`[NOTIFICATIONS] No hay usuarios para notificaciones de place=${placeId}`);
    return 0;
  }
  
  let queued = 0;
  
  for (const user of users) {
    // Get user's notification preferences from their business association
    const payload = {
      text,
      chat_id: user.telegram_chat_id,
      token: TELEGRAM_TOKEN,
      user_id: user.id,
      user_name: user.name,
      notify_type: notifyType
    };
    
    const id = createNotification(reviewId, placeId, payload);
    queued++;
    console.log(`[NOTIFICATIONS] Notificación encolada: id=${id}, user=${user.name}, place=${placeId}`);
  }
  
  // Also notify admins
  const admins = getAdmins();
  for (const admin of admins) {
    const adminPayload = {
      text: `[ADMIN] ${text}`,
      chat_id: admin.telegram_chat_id,
      token: TELEGRAM_TOKEN,
      user_id: admin.id,
      user_name: admin.name,
      is_admin_alert: true
    };
    
    const id = createNotification(reviewId, placeId, adminPayload);
    queued++;
    console.log(`[NOTIFICATIONS] Admin alert encolada: id=${id}, admin=${admin.name}`);
  }
  
  return queued;
}

/**
 * Queue a notification for later delivery (legacy, uses default chat)
 * Returns notification ID or -1 if configuration is missing
 */
export function queueNotification(
  reviewId: string,
  placeId: string,
  text: string,
  chatId?: string
): number {
  const finalChatId = chatId || DEFAULT_CHAT_ID;

  // Validate configuration before queueing
  if (!TELEGRAM_TOKEN || !finalChatId) {
    console.warn(
      `[NOTIFICATIONS] Configuración incompleta para encolar notificación: ` +
      `token=${!!TELEGRAM_TOKEN}, chatId=${!!finalChatId}`
    );
    return -1;
  }

  const payload = {
    text,
    chat_id: finalChatId,
    token: TELEGRAM_TOKEN
  };

  const id = createNotification(reviewId, placeId, payload);
  console.log(`[NOTIFICATIONS] Notificación encolada: ${id} para review ${reviewId}`);
  return id;
}

/**
 * Queue personalized notifications for each user associated with a place
 * Use this for new reviews discovered during sync
 */
export function notifyNewReviewForPlace(
  placeId: string,
  review: {
    review_id: string;
    author_name: string | null;
    rating: number | null;
    text: string | null;
  },
  placeName?: string
): number {
  const stars = '★'.repeat(review.rating || 0) + '☆'.repeat(5 - (review.rating || 0));
  const truncatedText = review.text?.substring(0, 200) || 'Sin texto';
  
  const message = `⭐ *Nueva Reseña* para *${placeName || placeId}*\n\n` +
    `${stars} ${review.rating}/5\n` +
    `*${review.author_name || 'Anónimo'}*\n\n` +
    `"${truncatedText}..."`;
  
  return queueNotificationForPlace(review.review_id, placeId, message, 'new');
}

/**
 * Queue notifications for modified review
 */
export function notifyModifiedReviewForPlace(
  placeId: string,
  review: {
    review_id: string;
    author_name: string | null;
    rating: number | null;
    text: string | null;
  },
  placeName?: string
): number {
  const message = `✏️ *Reseña Modificada* para *${placeName || placeId}*\n\n` +
    `*${review.author_name || 'Anónimo'}*\n\n` +
    `"${review.text?.substring(0, 200) || 'Sin texto'}..."`;
  
  return queueNotificationForPlace(review.review_id, placeId, message, 'modified');
}