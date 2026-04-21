# 🚀 Guía de Inicio Rápido

Sistema automatizado para monitorear reseñas de Google Maps con notificaciones Telegram y sync automático en servidor.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:

- [ ] Cuenta de Google Cloud (gratis)
- [ ] Cuenta de Telegram
- [ ] Acceso a terminal/command line
- [ ] Node.js 18+ instalado

---

## 🔧 Paso 1: Configurar Google Cloud

### 1.1 Crear Proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Haz clic en **"Select a project"** → **"New project"**
3. Nombre: `google-reviews-monitor` (o el que prefieras)
4. Haz clic en **"Create"**

### 1.2 Habilitar Places API

1. En el panel izquierdo, ve a **APIs & Services** → **Library**
2. Busca **"Places API"**
3. Haz clic en ella y luego en **"Enable"**

> **⚠️ IMPORTANTE**: La Places API tiene cuota gratuita de 28,500 solicitudes/mes. Para la mayoría de negocios esto es suficiente.

### 1.3 Crear API Key

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **"Create Credentials"** → **"API Key"**
3. Copia la key generada (tendrás que usarla más adelante)

### 1.4 (Opcional) Restringir la API Key

Para mayor seguridad:

1. En **Credentials**, haz clic sobre tu API Key
2. En **API restrictions**, selecciona **"Restrict key"**
3. Elige **"Places API"** de la lista
4. Guarda los cambios

---

## 📍 Paso 2: Obtener Place ID

El Place ID identifica tu negocio en Google Maps.

### Método 1: Google Place ID Finder

1. Ve a [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
2. Busca tu negocio en el mapa
3. Copia el **Place ID** (algo como `ChIJN1t_tDeuEmsRUsoyG83frY4`)

### Método 2: URL de Google Maps

1. Busca tu negocio en [Google Maps](https://www.google.com/maps)
2. Haz clic en **"Share"** → **"Embed a map"**
3. Copia el código y busca el Place ID en el atributo `src`

### Método 3: API de Google

```bash
curl "https://maps.googleapis.com/maps/api/place/textsearch/json?query=NOMBRE_DE_TU_NEGOCIO&key=TU_API_KEY"
```

Busca el campo `place_id` en la respuesta.

---

## 📱 Paso 3: Configurar Telegram

### 3.1 Crear Bot

1. Abre Telegram y busca **@BotFather**
2. Envía `/newbot`
3. Sigue las instrucciones:
   - Nombre del bot: `ReviewsMonitor` (o lo que quieras)
   - Username del bot: `mi_reviews_monitor_bot` (debe terminar en `bot`)
4. **⚠️ COPIA EL BOT TOKEN** (algo como `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 3.2 Obtener Chat ID

1. Busca **@userinfobot** en Telegram
2. Envía `/start`
3. Copia el **Chat ID** (número largo, ej: `123456789`)

### 3.3 Probar el Bot

```bash
# Reemplaza con tus valores
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>" \
  -d "text=¡Hola! Tu bot funciona."
```

---

## ⚙️ Paso 4: Configurar Variables de Entorno

### 4.1 Crear archivo `.env.local`

En la raíz del proyecto, crea un archivo llamado `.env.local`:

```bash
# Copia el ejemplo
cp .env.example .env.local
```

### 4.2 Editar `.env.local`

Abre `.env.local` y completa los valores:

```env
# ====================
# GOOGLE CONFIGURATION
# ====================

# Tu API Key de Google Cloud (obligatorio)
GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Tus Places ID separados por coma (obligatorio)
# Ejemplo: ChIJN1t_tDeuEmsRUsoyG83frY4,ChIJxxxx
PLACE_IDS=ChIJN1t_tDeuEmsRUsoyG83frY4

# ====================
# CRON CONFIGURATION
# ====================

# Clave secreta para el endpoint de sync (OBLIGATORIO)
# Genera una cadena aleatoria de al menos 32 caracteres
# Puedes usar: openssl rand -base64 32
CRON_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# ====================
# NOTIFICATIONS (Optional)
# ====================

# Webhook de alertas (Telegram: tu propio bot o otro)
# Formato: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>
ALERT_WEBHOOK_URL=

# Fallos consecutivos antes de alertar (default: 3)
FAILURE_THRESHOLD=3

# ====================
# DATABASE (Optional)
# ====================

# Path de la base de datos SQLite (default: ./data/reviews.db)
# DB_PATH=./data/reviews.db
```

### 4.3 Generar CRON_SECRET seguro

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 4.4 ⚠️ IMPORTANTE: No hacer commit

Asegúrate de que `.env.local` está en `.gitignore`:

```
# Verificar que contiene:
.env.local
.env*.local
```

---

## ▶️ Paso 5: Ejecutar en Desarrollo

### 5.1 Instalar dependencias

```bash
npm install
```

### 5.2 Iniciar servidor

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 5.3 Probar sync manualmente

```bash
# Reemplaza CRON_SECRET con el valor de tu .env.local
curl -X POST "http://localhost:3000/api/internal/sync?secret=tu_cron_secret_aqui"
```

Deberías ver una respuesta JSON como:

```json
{
  "success": true,
  "total": 1,
  "successful": 1,
  "failed": 0,
  "results": [
    {
      "success": true,
      "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "newReviews": 5,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 5.4 Verificar que rechaza sin secret

```bash
# Sin secret → 401 Unauthorized
curl -X POST "http://localhost:3000/api/internal/sync"

# Con secret incorrecto → 401 Unauthorized
curl -X POST "http://localhost:3000/api/internal/sync?secret=incorrecto"
```

---

## 🌐 Paso 6: Desplegar en Vercel

### 6.1 Subir a GitHub

```bash
# En tu terminal, dentro del proyecto
git add .
git commit -m "Initial deploy"
git push origin main
```

### 6.2 Importar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **"Add New..."** → **"Project"**
3. Importa tu repositorio de GitHub
4. En **"Environment Variables"**, añade:

| Variable | Valor |
|----------|-------|
| `GOOGLE_API_KEY` | Tu API Key de Google |
| `PLACE_IDS` | Tus Place IDs separados por coma |
| `CRON_SECRET` | Tu cadena secreta (mínimo 32 chars) |
| `ALERT_WEBHOOK_URL` | (Opcional) URL de Telegram |
| `FAILURE_THRESHOLD` | 3 |

5. Haz clic en **"Deploy"**

### 6.3 Configurar Vercel Cron

El archivo `vercel.json` ya está configurado para ejecutar el sync cada 30 minutos.

Para verificar:
1. Ve a tu proyecto en Vercel Dashboard
2. **Settings** → **Cron Jobs**
3. Deberías ver el job configurado

### 6.4 Probar endpoint en producción

```bash
# Reemplaza con tu dominio
curl -X POST "https://tu-proyecto.vercel.app/api/internal/sync?secret=tu_cron_secret"
```

---

## 📊 Paso 7: Verificar que Todo Funciona

### 7.1 Endpoints disponibles

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/places` | Lista de lugares configurados |
| `GET /api/reviews` | Reviews desde SQLite |
| `GET /api/reviews?place_id=...&rating=4` | Reviews filtradas |
| `GET /api/stats` | Estadísticas del sistema |
| `POST /api/internal/sync` | Ejecutar sync manualmente |

### 7.2 Probar API de reviews

```bash
# Todas las reviews
curl "https://tu-proyecto.vercel.app/api/reviews"

# Reviews de un lugar específico
curl "https://tu-proyecto.vercel.app/api/reviews?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4"

# Reviews con rating >= 4
curl "https://tu-proyecto.vercel.app/api/reviews?rating=4"

# Reviews desde una fecha
curl "https://tu-proyecto.vercel.app/api/reviews?desde=2024-01-01"
```

### 7.3 Ver estadísticas

```bash
curl "https://tu-proyecto.vercel.app/api/stats"
```

Respuesta:

```json
{
  "stats": {
    "totalPlaces": 1,
    "totalReviews": 150,
    "avgRating": 4.2,
    "fiveStars": 80,
    "oneStar": 10
  },
  "recentSync": {
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "status": "success",
    "new_reviews": 3,
    "finished_at": "2024-01-15T10:30:00Z"
  }
}
```

---

## 🔔 Paso 8: Configurar Notificaciones

### 8.1 Webhook de Telegram

Crea tu propio webhook URL:

```
https://api.telegram.org/bot<BOT_TOKEN>/sendMessage?chat_id=<CHAT_ID>
```

### 8.2 Añadir a variables de entorno

En Vercel o `.env.local`:

```env
ALERT_WEBHOOK_URL=https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/sendMessage?chat_id=123456789
```

### 8.3 Probar notificación

El sistema enviará alertas automáticamente cuando:
- `FAILURE_THRESHOLD` ciclos fallan consecutivamente (default: 3)

---

## 🐛 Solución de Problemas

### "Error: Google API key not configured"

- Verifica que `GOOGLE_API_KEY` está en `.env.local`
- Reinicia el servidor: `npm run dev`

### "Error: No businesses configured"

- Verifica que `PLACE_IDS` tiene al menos un Place ID válido

### "Error: Unauthorized" en /api/internal/sync

- Verifica que estás pasando el parámetro `?secret=CRON_SECRET`
- Confirma que `CRON_SECRET` en `.env.local` coincide

### "Error: Places API is not enabled"

- Ve a Google Cloud Console → APIs & Services → Library
- Busca "Places API" y habilítala

### Las reseñas no se guardan en SQLite

- Verifica que el directorio `data/` existe y tiene permisos de escritura

### El cron no se ejecuta en Vercel

- Verifica que `vercel.json` está en la raíz del proyecto
- Revisa los logs en Vercel Dashboard → Functions

### Recibo errores CORS

- Los endpoints de API no deberían tener CORS en producción
- Si usas en desarrollo, usa una extensión de navegador o configura proxy

---

## 📁 Estructura del Proyecto

```
GoogleReviewsMonitor/
├── app/
│   ├── api/
│   │   ├── internal/
│   │   │   └── sync/route.ts    # Endpoint de sync (protegido)
│   │   ├── places/route.ts      # API de lugares
│   │   ├── reviews/route.ts     # API de reviews
│   │   ├── stats/route.ts       # API de estadísticas
│   │   └── telegram/route.ts   # API de Telegram
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── docs/                         # Documentación
│   ├── MILESTONE_1.md          # Scheduler + logging
│   ├── MILESTONE_2.md          # SQLite schema
│   ├── MILESTONE_3.md          # API pública
│   └── QUICK_START.md          # Esta guía
├── lib/
│   └── db/
│       ├── schema.ts           # Schema SQLite
│       ├── migrate.ts          # Migraciones
│       └── reviews.ts          # Queries
├── data/                        # Base de datos SQLite
├── vercel.json                  # Configuración Cron
├── .env.local                   # Variables (NO committing)
├── .env.example                 # Template
├── package.json
└── README.md
```

---

## ✅ Checklist Final

Antes de usar en producción, verifica:

- [ ] Google Places API habilitada en Cloud Console
- [ ] API Key válida y con cuota disponible
- [ ] Place ID correcto y verificado
- [ ] `CRON_SECRET` generado (mínimo 32 caracteres)
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Telegram Bot creado y funcionando
- [ ] Chat ID obtenido
- [ ] Sync manual funciona (`/api/internal/sync`)
- [ ] API de reviews responde correctamente
- [ ] Proyecto desplegado en Vercel (o servidor)
- [ ] Vercel Cron configurado y ejecutándose
- [ ] Logs visibles en consola/Vercel Dashboard
- [ ] `.env.local` NO está en Git (verificar `.gitignore`)

---

## 🔗 Recursos Útiles

- [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

---

## 📞 ¿Necesitas Ayuda?

1. Revisa los logs en Vercel Dashboard → Functions
2. Consulta el `README.md` para detalles completos
3. Revisa `docs/MILESTONE_1.md`, `MILESTONE_2.md`, `MILESTONE_3.md`

---

**¡Listo! Tu sistema de monitoreo de reseñas está configurado** 🎉

El sync se ejecutará automáticamente cada 30 minutos y recibirás notificaciones cuando haya nuevas reseñas.
