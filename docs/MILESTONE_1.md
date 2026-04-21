# Milestone 1: Scheduler en Servidor + Logging Estructurado

## Objetivo

Configurar un job que ejecute el ciclo de sincronización en el servidor (no en el navegador), con logging estructurado yendpoint interno protegido.

**Dependencias previas**: Ninguna (este es el primer milestone).

**Duración estimada**: 1–2 días.

---

## Entregables

1. Endpoint interno protegido: `POST /api/internal/sync`
2. Sistema de scheduling que invoque el endpoint (Vercel Cron, cronjob externo, o worker)
3. Logging estructurado por cada ciclo de sync
4. Alertas automáticas si N ciclos fallan consecutivamente

---

## Paso 1: Variables de Entorno

Añadir al `.env.local`:

```bash
# Clave secreta para proteger el endpoint de sync (genera una cadena aleatoria segura)
CRON_SECRET=tu_cadena_segura_aqui_minimo_32_caracteres

# Opcional: configuración de alertas
ALERT_WEBHOOK_URL=           # URL para enviar alertas (Telegram, Slack, etc.)
FAILURE_THRESHOLD=3          # Ciclos consecutivos fallidos antes de alertar (default: 3)
```

**Dónde editar**: `.env.local` (no hacer commit de valores reales).

---

## Paso 2: Crear el Endpoint Interno

Crear archivo `app/api/internal/sync/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

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
  // (por ahora hardcoded o leer de config; más adelante vendrá de DB)
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

  // 5. Responder con resumen
  const successfulSyncs = results.filter(r => r.success).length;
  return NextResponse.json({
    success: true,
    total: placeIds.length,
    successful: successfulSyncs,
    failed: placeIds.length - successfulSyncs,
    results
  });
}

// Función auxiliar: sincronizar un solo place
async function syncPlace(placeId: string, apiKey: string): Promise<SyncResult> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,reviews&key=${apiKey}&language=es`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK') {
    return {
      success: false,
      placeId,
      timestamp: new Date().toISOString(),
      error: `Google API error: ${data.status}`
    };
  }

  const reviews = data.result?.reviews || [];
  const newReviews = reviews.length; // Por ahora crude; más adelante será comparación real

  return {
    success: true,
    placeId,
    newReviews,
    timestamp: new Date().toISOString()
  };
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
```

---

## Paso 3: Configurar el Scheduler

### Opción A: Vercel Cron (recomendado si usas Vercel)

Crear archivo `vercel.json` en la raíz del proyecto:

```json
{
  "crons": [
    {
      "path": "/api/internal/sync",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Esto ejecuta el sync cada 30 minutos.

### Opción B: Cron Externo (Railway, Render, etc.)

Usar un servicio de cron externo quellame a:

```
POST https://tu-dominio.com/api/internal/sync?secret=tu_cadena_segura_aqui
```

Configurar el intervalo según necesidades (30 min, 1 hora, etc.).

### Opción C: Worker Propio (avanzado)

Si tienes un proceso Node.js dedicado, usar `node-cron`:

```typescript
import cron from 'node-cron';

cron.schedule('*/30 * * * *', async () => {
  await fetch('https://tu-dominio.com/api/internal/sync?secret=' + process.env.CRON_SECRET, {
    method: 'POST'
  });
});
```

---

## Paso 4: Verificar que Funciona

### Test manual

Ejecutar desde terminal:

```bash
curl -X POST "http://localhost:3000/api/internal/sync?secret=tu_cadena_segura_aqui"
```

Debería responder con JSON conteniendo `success: true` y un array de resultados.

### Test de autenticación

```bash
# Sin secret → debe fallar con 401
curl -X POST "http://localhost:3000/api/internal/sync"
# Con secret incorrecto → debe fallar con 401
curl -X POST "http://localhost:3000/api/internal/sync?secret=incorrecto"
```

### Ver logs

Tras ejecutar, revisar la konsola del servidor. Debería aparecer:

```
[SYNC] ChIJ...: OK - nuevas: 5
[SYNC] ChIJ...: OK - nuevas: 2
```

---

## Checklist de Verificación

- [ ] `CRON_SECRET` definido en `.env.local`
- [ ] Endpoint `/api/internal/sync` creado
- [ ] Endpoint rechaza requests sin token (401)
- [ ] Endpoint acepta requests con token válido (200)
- [ ] Logging estructurado visible en konsola (formato `[SYNC] ...`)
- [ ] Si hay `ALERT_WEBHOOK_URL`, se envío alerta tras N fallos
- [ ] Scheduler configurado (Vercel Cron, externo, o worker)
- [ ] El scheduler ejecuta el endpoint cada X minutos
- [ ] Test manual exitoso (respuesta JSON válida)
- [ ] No hay secretos hardcodeados en el código fuente

---

## Notas Adicionales

- **No Hacer Commit de Secretos**: Asegurar que `.env.local` está en `.gitignore`.
- **Errores No Silenciosos**: Si el sync falla, debe dejar rastro en logs (no usar `console.error` exclusivamente, también retornar error en la respuesta).
- **Extensibilidad**: El endpoint está preparado para integrate con SQLite en milestones posteriores.
- **Monitoreo**: Considera añadir métricas (latencia, reviews procesadas) a un servicio como Datadog o UptimeRobot.

---

## Referencias

- Endpoint de reseñas actual: `app/api/reviews/route.ts`
- Variables de entorno: `.env.local`
- Siguiente milestone: **SQLite schema y migraciones** (Milestone 2)