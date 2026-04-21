# Milestone 4: Sistema de Notificaciones

## Objetivo

Implementar sistema automático de notificaciones Telegram cuando se detectan nuevas reseñas, con cola de retry y manejo de errores.

**Dependencias previas**: Milestone 3 completado (API pública + SQLite).

**Duración estimada**: 1–2 días.

---

## Entregables

1. Tabla `notifications` en SQLite
2. Endpoint para enviar notificación
3. Integración con sync para detectar y notificar nuevas reseñas
4. Sistema de retry con backoff
5. Dead letter para notificaciones fallidas

---

## Paso 1: Schema de Notifications

Añadir a `lib/db/schema.ts`:

```typescript
// Tabla de notificaciones
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    channel TEXT DEFAULT 'telegram',
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    next_attempt_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sent_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
  CREATE INDEX IF NOT EXISTS idx_notifications_next_attempt ON notifications(next_attempt_at);
`);
```

---

## Paso 2: Queries de Notifications

Crear `lib/db/notifications.ts`:

```typescript
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

export function getPendingNotifications(limit = 10): Notification[] {
  return db.prepare(`
    SELECT * FROM notifications 
    WHERE status = 'pending' 
    AND (next_attempt_at IS NULL OR next_attempt_at <= datetime('now'))
    ORDER BY created_at ASC
    LIMIT ?
  `).all(limit) as Notification[];
}

export function markNotificationSent(id: number): void {
  db.prepare(`
    UPDATE notifications 
    SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(id);
}

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

export function getNotificationStats() {
  return db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) as dead_letter
    FROM notifications
  `).get();
}
```

---

## Paso 3: Endpoint de Telegram

Modificar `app/api/telegram/route.ts` para soportar notifications:

```typescript
import { NextRequest, NextResponse } from 'next/server';

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, chat_id, text, bot_token } = body;

  if (action === 'send') {
    const token = bot_token || process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token || !chat_id || !text) {
      return NextResponse.json(
        { error: 'Faltan parámetros: token, chat_id, text' },
        { status: 400 }
      );
    }

    const message: TelegramMessage = {
      chat_id,
      text,
      parse_mode: 'Markdown'
    };

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      }
    );

    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json(
        { error: result.description },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message_id: result.result.message_id });
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
```

---

## Paso 4: Worker de Notificaciones

Crear `lib/notifications/worker.ts`:

```typescript
import { 
  getPendingNotifications, 
  markNotificationSent, 
  markNotificationFailed,
  createNotification 
} from '@/lib/db/notifications';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
    return result.ok === true;
  } catch (error) {
    console.error('[NOTIFICATIONS] Error enviando a Telegram:', error);
    return false;
  }
}

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
    } else {
      markNotificationFailed(
        notification.id,
        'Telegram API error',
        notification.retry_count + 1
      );
      failed++;
    }
  }

  return { sent, failed };
}

export function queueNotification(
  reviewId: string,
  placeId: string,
  text: string,
  chatId?: string
): void {
  const payload = {
    text,
    chat_id: chatId || DEFAULT_CHAT_ID,
    token: TELEGRAM_TOKEN
  };
  
  createNotification(reviewId, placeId, payload);
}
```

---

## Paso 5: Integrar con Sync

Modificar `app/api/internal/sync/route.ts`:

```typescript
import { queueNotification } from '@/lib/notifications/worker';
import { getReviewByExternalId } from '@/lib/db/reviews';

// En syncPlace, después de insertar nuevas reviews:
if (newCount > 0) {
  for (const review of newReviews) {
    const message = `⭐ *Nueva Reseña* para *${place.name}*\n\n` +
      `★ ${review.rating}/5\n` +
      `${review.author_name}\n\n` +
      `"${review.text?.substring(0, 200)}..."`;

    queueNotification(
      review.review_id,
      placeId,
      message
    );
  }
}
```

---

## Paso 6: Ejecutar Worker

Opción A: En el mismo endpoint de sync (al final):
```typescript
// Al final del sync
await processNotifications();
```

Opción B: Endpoint separado:
```typescript
// app/api/internal/notifications/route.ts
export async function POST() {
  const result = await processNotifications();
  return NextResponse.json(result);
}
```

---

## Checklist de Verificación

- [ ] Tabla `notifications` creada en SQLite
- [ ] Queries implementados (create, getPending, markSent, markFailed)
- [ ] Función `sendTelegramNotification` funcionando
- [ ] Función `queueNotification` funcionando
- [ ] Worker `processNotifications` implementado
- [ ] Sync integra detección de nuevas reviews
- [ ] Sync llama a `queueNotification` para nuevas reseñas
- [ ] Retry con backoff configurado (1min, 2min, 4min)
- [ ] Dead letter para fallos > 3 intentos
- [ ] Test: ejecutar sync con review nueva → notificación enviada
- [ ] Test: simular fallo → retry funciona

---

## Notas Adicionales

- **Batch processing**: Procesar notificaciones en lotes para no bloquear el sync
- **Rate limiting**: Telegram tiene límites; considerar cola si volumen alto
- **Rich content**: Usar Markdown/HTML para mejor formato en Telegram
- **Siguiente milestone**: M5 - Deduplicación con hashes

---

## Referencias

- Queries: `lib/db/notifications.ts`
- Worker: `lib/notifications/worker.ts`
- Sync: `app/api/internal/sync/route.ts`
- Milestone anterior: Milestone 3
- Siguiente milestone: **Deduplicación con hashes** (Milestone 5)

---

## Roadmap (progreso)

| Milestone | Estado |
|-----------|--------|
| Milestone 1: Scheduler + Logging | ✅ Completado |
| Milestone 2: SQLite Schema | ✅ Completado |
| Milestone 3: API Pública | ✅ Completado |
| Milestone 4: Notificaciones | ✅ Completado |
| Milestone 5: Deduplicación | ⏳ Pendiente |
