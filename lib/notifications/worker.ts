import {
  getPendingNotifications,
  markNotificationSent,
  markNotificationFailed,
  createNotification
} from '@/lib/db/notifications';

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
 * Queue a notification for later delivery
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