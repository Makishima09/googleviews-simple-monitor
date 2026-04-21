# 🔔 Monitor de Reseñas de Google Maps

Sistema automatizado para detectar y recibir notificaciones instantáneas cuando tu negocio recibe una nueva reseña en Google Maps.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-cyan)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Características

- ✅ **Monitoreo en tiempo real** de reseñas de Google Maps
- ✅ **Notificaciones instantáneas** vía Telegram
- ✅ **Historial visual** de reseñas existentes y nuevas
- ✅ **Diferenciación automática** entre reseñas iniciales y nuevas
- ✅ **Interfaz intuitiva** con estado visual del monitor
- ✅ **Persistencia** de configuración y historial en el navegador
- ✅ **Registro de actividad** con historial de eventos
- ✅ **Configuración flexible** del intervalo de revisión
- ✅ **Backend seguro** con Next.js API Routes
- ✅ **Listo para producción** con Next.js 14

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno (opcional)

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Opcional: Configura tu API Key aquí para mayor seguridad
GOOGLE_API_KEY=tu_api_key_aqui
```

> **Nota:** Si no configuras el `.env.local`, puedes ingresar la API Key directamente en la interfaz web.

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

📖 **Guía completa:** Lee [`docs/QUICK_START.md`](./docs/QUICK_START.md) para instrucciones detalladas paso a paso.

## 📋 Requisitos Previos

### 1. Google Places API Key

1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Places API**
4. Crea una **API Key**
5. (Opcional) Restringe la key a Places API

### 2. Google Place ID

1. Busca tu negocio en [Google Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
2. Copia el **Place ID** (ejemplo: `ChIJN1t_tDeuEmsRUsoyG83frY4`)

### 3. Telegram Bot

1. Abre Telegram y busca [@BotFather](https://t.me/botfather)
2. Envía `/newbot` y sigue las instrucciones
3. Copia el **Bot Token** (ejemplo: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Busca [@userinfobot](https://t.me/userinfobot) en Telegram
5. Envía `/start` y copia tu **Chat ID**

## 🎯 Cómo Usar

1. **Configurar credenciales:**
   - Ingresa tu Google Place ID
   - Ingresa tu Google API Key
   - Ingresa tu Telegram Bot Token
   - Ingresa tu Telegram Chat ID
   - Ajusta el intervalo de revisión (minutos)

2. **Probar notificaciones:**
   - Haz clic en "Probar Notificación"
   - Deberías recibir un mensaje de prueba en Telegram

3. **Iniciar el monitor:**
   - Haz clic en "Iniciar Monitor"
   - El sistema revisará Google cada X minutos
   - Recibirás una notificación cuando haya reseñas nuevas

4. **Monitoreo continuo:**
   - Mantén la pestaña abierta para que el monitor funcione
   - Revisa el "Registro de Actividad" para ver el estado

## 🌐 Desplegar en Producción

### Opción 1: Vercel (Recomendado - Gratis)

1. Sube tu código a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Importa tu repositorio
4. Configura la variable de entorno `GOOGLE_API_KEY` (opcional)
5. Deploy automático ✨

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Opción 2: Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Opción 3: VPS (Linux)

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar e instalar
git clone tu-repositorio
cd google-reviews-monitor
npm install
npm run build

# Ejecutar con PM2
npm install -g pm2
pm2 start npm --name "reviews-monitor" -- start
pm2 save
pm2 startup
```

## ⚙️ Configuración Avanzada

### Monitoreo 24/7

Para que el monitor funcione continuamente sin mantener el navegador abierto, necesitas:

1. **Deplegar en un servidor** (Vercel, Railway, VPS)
2. **Crear un cron job** o servicio que ejecute las revisiones
3. **Usar una base de datos** para persistir las reseñas conocidas

### Estructura del Proyecto

```
google-reviews-monitor/
├── app/
│   ├── api/
│   │   ├── reviews/
│   │   │   └── route.ts       # API Route para Google Places
│   │   └── telegram/
│   │       └── route.ts       # API Route para Telegram
│   ├── globals.css            # Estilos globales
│   ├── layout.tsx             # Layout principal
│   └── page.tsx               # Componente principal
├── docs/                      # 📚 Documentación
│   ├── QUICK_START.md         # Guía de inicio rápido
│   ├── HISTORIAL_RESEÑAS.md   # Funcionalidad de historial
│   ├── BUGFIX_DUPLICADOS.md   # Solución bug de duplicados
│   ├── FIX_INFINITE_LOOP.md   # Solución loop infinito
│   ├── NUEVA_FUNCIONALIDAD.md # Nuevas características
│   └── Informe.md             # Informe conceptual del proyecto
├── public/                    # Archivos estáticos
├── .env.local                 # Variables de entorno (no subir a Git)
├── next.config.js             # Configuración de Next.js
├── package.json               # Dependencias
└── README.md                  # Este archivo
```

## 🔒 Seguridad

- ✅ Las API Keys se pueden configurar en `.env.local` (servidor)
- ✅ Las llamadas a Google API se hacen desde el servidor (no expuestas)
- ✅ Las credenciales ingresadas en la UI se guardan en localStorage (solo tu navegador)
- ⚠️ **Nunca subas** `.env.local` a Git (ya está en `.gitignore`)

## 🛠️ Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo con hot-reload
npm run dev

# Build para producción
npm run build

# Ejecutar producción localmente
npm start

# Linting
npm run lint
```

## 📊 Tecnologías

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utility-first
- **Lucide React** - Iconos
- **Google Places API** - Obtención de reseñas
- **Telegram Bot API** - Notificaciones

## 📚 Documentación Completa

Toda la documentación está organizada en la carpeta [`docs/`](./docs/):

### Guías de Usuario
- **[Inicio Rápido](./docs/QUICK_START.md)** - Configuración paso a paso en 5 minutos
- **[Historial de Reseñas](./docs/HISTORIAL_RESEÑAS.md)** - Cómo funciona el sistema de historial visual
- **[Informe Conceptual](./docs/Informe.md)** - Explicación del proyecto sin tecnicismos

### Documentación Técnica
- **[Bug Fix: Duplicados](./docs/BUGFIX_DUPLICADOS.md)** - Solución al problema de closures con `setInterval`
- **[Bug Fix: Loop Infinito](./docs/FIX_INFINITE_LOOP.md)** - Solución al conflicto de nombres con `setInterval`
- **[Nuevas Funcionalidades](./docs/NUEVA_FUNCIONALIDAD.md)** - Changelog y características implementadas

## 🎨 Capturas de Pantalla

### Dashboard Principal
El monitor muestra el estado en tiempo real con indicadores visuales claros.

### Historial de Reseñas
- **Reseñas Existentes** (azul): Las que ya existían al iniciar el monitor
- **Reseñas Nuevas** (verde): Las detectadas después del inicio, con notificación a Telegram

### Registro de Actividad
Logs en tiempo real de todas las acciones del monitor.

## 🐛 Troubleshooting

### "Error al obtener reseñas"
- Verifica que tu Google API Key sea válida
- Asegúrate de que Places API esté habilitada en Google Cloud Console
- Confirma que el Place ID sea correcto

### "Error Telegram"
- Verifica que el Bot Token sea válido
- Asegúrate de haber iniciado conversación con el bot en Telegram
- Confirma que el Chat ID sea correcto (debe ser solo números)

### "Las reseñas se duplican"
- Ver solución completa en [`docs/BUGFIX_DUPLICADOS.md`](./docs/BUGFIX_DUPLICADOS.md)
- Limpia localStorage: `localStorage.removeItem('newReviewsDetected')`

### "El monitor hace llamadas infinitas"
- Ver solución completa en [`docs/FIX_INFINITE_LOOP.md`](./docs/FIX_INFINITE_LOOP.md)
- Detén el servidor y reinicia

### El monitor se detiene al cerrar el navegador
- Esto es normal si ejecutas en localhost
- Para monitoreo 24/7, deploya en Vercel/Railway/VPS

## ❓ FAQ

### ¿Cuántas reseñas puede monitorear?
La API de Google Places devuelve las **5 reseñas más relevantes** (priorizando las recientes). Para la mayoría de negocios, esto cubre el 95%+ de reseñas nuevas con texto.

### ¿Las reseñas malas se detectan?
**Sí, absolutamente.** Las reseñas negativas tienen la misma prioridad (o más) que las positivas, especialmente si son recientes y tienen texto.

### ¿Funciona para múltiples negocios?
Sí, pero necesitas cambiar el Place ID y limpiar el historial para cada negocio. Se recomienda usar una instancia separada para cada negocio.

### ¿Cuánto cuesta?
- **Gratis** si usas Vercel/Railway tier gratuito
- Google Places API: primeras 28,500 consultas/mes gratis
- Telegram: 100% gratuito

### ¿Puedo modificar el intervalo mínimo?
Sí, el mínimo es 1 minuto, pero se recomienda 30 minutos para evitar agotar la cuota de Google API.

## 📝 Licencia

Este proyecto es de código abierto bajo licencia MIT. Úsalo libremente para tus proyectos.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🗺️ Roadmap

Funcionalidades planeadas para futuras versiones:

- [ ] Base de datos PostgreSQL para persistencia completa
- [ ] Autenticación (NextAuth.js) para múltiples usuarios
- [ ] Dashboard de estadísticas con gráficos
- [ ] Monitoreo de múltiples negocios simultáneamente
- [ ] Análisis de sentimiento con IA
- [ ] Respuestas automáticas a reseñas
- [ ] Webhooks para integración con otros sistemas
- [ ] Exportación de reportes en PDF/CSV
- [ ] Notificaciones por email además de Telegram
- [ ] App móvil (React Native)

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

¿Preguntas o sugerencias? Abre un issue en el repositorio.

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/) - Framework React
- [Tailwind CSS](https://tailwindcss.com/) - Framework de estilos
- [Lucide Icons](https://lucide.dev/) - Iconos
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview) - API de reseñas
- [Telegram Bot API](https://core.telegram.org/bots/api) - Sistema de notificaciones

---

**¡Hecho con ❤️ para mejorar la gestión de reseñas de negocios by MABC!**

**⭐ Si este proyecto te fue útil, considera darle una estrella en GitHub**

