# 🚀 Guía de Inicio Rápido

## ¡Tu aplicación ya está lista!

### 📦 Lo que se ha configurado:

✅ **Next.js 14** con App Router  
✅ **TypeScript** para tipado seguro  
✅ **Tailwind CSS** para estilos  
✅ **API Routes** para backend  
✅ **Componente completo** migrado y mejorado  
✅ **localStorage** para persistir configuración  

---

## 🎯 Próximos Pasos

### 1. Iniciar el servidor (si no está corriendo)

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 2. Obtener tus credenciales

#### Google API Key:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo o selecciona uno
3. Ve a **APIs & Services** → **Credentials**
4. Habilita **Places API** en la sección Library
5. Crea una **API Key**

#### Google Place ID:
1. Busca tu negocio en Google Maps
2. Abre la URL y busca algo como: `maps/place/.../@...`
3. O usa: https://developers.google.com/maps/documentation/places/web-service/place-id

#### Telegram Bot:
1. Abre Telegram y busca **@BotFather**
2. Envía `/newbot`
3. Sigue las instrucciones y copia tu **Bot Token**
4. Busca **@userinfobot** en Telegram
5. Envía `/start` y copia tu **Chat ID**

### 3. Configurar en la aplicación

1. Ingresa todas las credenciales en la interfaz web
2. Haz clic en **"Probar Notificación"**
3. Deberías recibir un mensaje en Telegram ✅
4. Haz clic en **"Iniciar Monitor"**

---

## 📁 Estructura del Proyecto

```
GoogleReviewsMonitor/
├── app/
│   ├── api/
│   │   ├── reviews/route.ts       ← Google Places API
│   │   └── telegram/route.ts      ← Telegram API
│   ├── globals.css                ← Estilos globales
│   ├── layout.tsx                 ← Layout raíz
│   └── page.tsx                   ← Componente principal
├── node_modules/                  ← Dependencias
├── public/                        ← Archivos estáticos
├── .gitignore                     ← Archivos ignorados
├── next.config.js                 ← Config Next.js
├── package.json                   ← Dependencias del proyecto
├── README.md                      ← Documentación completa
├── QUICK_START.md                 ← Esta guía
├── tailwind.config.ts             ← Config Tailwind
└── tsconfig.json                  ← Config TypeScript
```

---

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev          # Inicia servidor en localhost:3000

# Producción
npm run build        # Construye la aplicación
npm start            # Inicia servidor de producción

# Mantenimiento
npm run lint         # Revisa errores de código
```

---

## 🌟 Mejoras vs Versión Original

### ✨ Nuevas características:

1. **Backend real**: Las API calls se hacen desde el servidor
2. **Persistencia**: La configuración se guarda automáticamente
3. **Seguridad**: API Keys pueden ir en `.env.local`
4. **Conexión real**: Se conecta a Google Places API de verdad
5. **TypeScript**: Todo está tipado correctamente
6. **Mejor UX**: Mensajes de error más claros

### 🔒 Seguridad mejorada:

- Las API Keys nunca se exponen al navegador (si usas `.env.local`)
- Las llamadas a Google se hacen desde el servidor
- CORS resuelto automáticamente
- Tokens protegidos en variables de entorno

---

## 🐛 Solución de Problemas

### El servidor no inicia
```bash
# Borra node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
```

### Error de TypeScript
```bash
# Reconstruye los tipos
rm -rf .next
npm run dev
```

### Puerto 3000 ocupado
```bash
# Usa otro puerto
PORT=3001 npm run dev
```

---

## 🚀 Desplegar en Producción

### Vercel (Recomendado - Gratis):

1. Sube tu código a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Haz clic en "Import Project"
4. Selecciona tu repositorio
5. Agrega `GOOGLE_API_KEY` en las variables de entorno
6. Deploy ✨

### Railway:

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## 📞 ¿Necesitas ayuda?

- Lee el `README.md` completo para más detalles
- Revisa los logs en la consola del navegador (F12)
- Verifica que todas las APIs estén habilitadas en Google Cloud

---

## ✅ Checklist Final

Antes de usar en producción, asegúrate de:

- [ ] Google Places API habilitada
- [ ] API Key válida y con cuota disponible
- [ ] Place ID correcto
- [ ] Bot de Telegram creado
- [ ] Chat ID obtenido
- [ ] Notificación de prueba funciona
- [ ] Monitor detecta reseñas correctamente

---

**¡Listo! Ya tienes un sistema profesional de monitoreo de reseñas** 🎉

Para más información, consulta el `README.md` completo.

