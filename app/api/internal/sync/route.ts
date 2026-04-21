import { NextRequest, NextResponse } from 'next/server';
import { initSchema } from '@/lib/db/schema';
import { runMigrations } from '@/lib/db/migrate';
import {
  insertReview,
  insertPlace,
  startSyncLog,
  finishSyncLog,
  getReviewByExternalId,
  getPlaceByPlaceId,
  updatePlaceTimestamp
} from '@/lib/db/reviews';
import { queueNotification, processNotifications } from '@/lib/notifications/worker';

// Initialize database schema and run migrations at startup
initSchema();
runMigrations();

// Tipo para el resultado de sync
type SyncResult = {
  success: boolean;
  placeId?: string;
  newReviews?: number;
  timestamp: string;
  error?: string;
};

export async function POST(request: NextRequest) {
  // 1. Validar CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('[SYNC] CRON_SECRET no configurado en el servidor');
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  // Aceptar tanto header Authorization como query param ?secret=
  const querySecret = request.nextUrl.searchParams.get('secret');
  const isValid = authHeader === `Bearer ${expectedSecret}` || querySecret === expectedSecret;

  if (!isValid) {
    console.warn('[SYNC] Intento de acceso no autorizado');
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // 2. Obtener lista de businesses a sincronizar
  const placeIds = process.env.PLACE_IDS?.split(',').map(s => s.trim()).filter(Boolean) || [];

  if (placeIds.length === 0) {
    console.warn('[SYNC] No hay businesses configurados');
    return NextResponse.json({ error: 'No hay businesses configurados' }, { status: 400 });
  }

  // 3. Ejecutar sync por cada business
  const results: SyncResult[] = [];
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error('[SYNC] GOOGLE_API_KEY no configurada');
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
  }

  for (const placeId of placeIds) {
    try {
      const result = await syncPlace(placeId, apiKey);
      results.push(result);

      console.log(`[SYNC] ${placeId}: ${result.success ? 'OK' : 'ERROR'} - nuevas: ${result.newReviews || 0}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[SYNC] ${placeId}: EXCEPTION - ${errorMsg}`);
      results.push({
        success: false,
        placeId,
        timestamp: new Date().toISOString(),
        error: errorMsg
      });
    }
  }

  // 4. Verificar umbral de fallos y alertar si es necesario
  await checkFailureThreshold(results);

  // 5. Process pending notifications
  const notifResult = await processNotifications();

  // 6. Responder con resumen
  const successfulSyncs = results.filter(r => r.success).length;
  return NextResponse.json({
    success: true,
    total: placeIds.length,
    successful: successfulSyncs,
    failed: placeIds.length - successfulSyncs,
    notifications: notifResult,
    results
  });
}

// Función auxiliar: sincronizar un solo place
async function syncPlace(placeId: string, apiKey: string): Promise<SyncResult> {
  // Start sync log
  const logId = startSyncLog(placeId);

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,reviews&key=${apiKey}&language=es`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') {
      const errorMsg = `Google API error: ${data.status}`;
      finishSyncLog(logId, 0, 'error', errorMsg);
      return {
        success: false,
        placeId,
        timestamp: new Date().toISOString(),
        error: errorMsg
      };
    }

    // Save or update place
    const placeName = data.result?.name;
    insertPlace(placeId, placeName);
    updatePlaceTimestamp(placeId);

    // Process reviews and track new ones
    const reviews = data.result?.reviews || [];
    let newCount = 0;
    const newReviews: Array<{
      review_id: string;
      author_name: string | null;
      rating: number | null;
      text: string | null;
    }> = [];

    for (const review of reviews) {
      // Check if review already exists to avoid duplicates
      const exists = getReviewByExternalId(review.review_id);
      if (!exists) {
        // Google returns review time as Unix timestamp
        const reviewDate = review.time ? new Date(review.time * 1000).toISOString() : null;

        insertReview({
          place_id: placeId,
          review_id: review.review_id,
          author_name: review.author_name || null,
          rating: review.rating || null,
          text: review.text || null,
          date: reviewDate
        });

        // Track new review for notification
        newReviews.push({
          review_id: review.review_id,
          author_name: review.author_name || null,
          rating: review.rating || null,
          text: review.text || null
        });

        newCount++;
      }
    }

    // Queue notifications for new reviews
    if (newCount > 0) {
      const place = getPlaceByPlaceId(placeId);
      for (const review of newReviews) {
        const stars = '★'.repeat(review.rating || 0) + '☆'.repeat(5 - (review.rating || 0));
        const message = `⭐ *Nueva Reseña* para *${place?.name || placeId}*\n\n` +
          `${stars} ${review.rating}/5\n` +
          `*${review.author_name || 'Anónimo'}*\n\n` +
          `"${review.text?.substring(0, 200) || 'Sin texto'}..."`;

        queueNotification(
          review.review_id,
          placeId,
          message
        );
      }
      console.log(`[SYNC] ${placeId}: ${newCount} notificaciones encoladas`);
    }

    finishSyncLog(logId, newCount, 'success');
    console.log(`[SYNC] ${placeId}: saved ${newCount} new reviews out of ${reviews.length} total`);

    return {
      success: true,
      placeId,
      newReviews: newCount,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    finishSyncLog(logId, 0, 'error', errorMsg);
    return {
      success: false,
      placeId,
      timestamp: new Date().toISOString(),
      error: errorMsg
    };
  }
}

// Función auxiliar: verificar umbral de fallos
async function checkFailureThreshold(results: SyncResult[]) {
  const threshold = parseInt(process.env.FAILURE_THRESHOLD || '3', 10);
  const failedCount = results.filter(r => !r.success).length;

  if (failedCount >= threshold) {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ ALERTA: ${failedCount} ciclos de sync fallidos (umbral: ${threshold})`
        })
      });
    }
  }
}