# 🔧 Solución: Loop Infinito de Llamadas a la API

## 🐛 Problema Identificado

Había un **conflicto crítico de nombres**: el estado React se llamaba `setInterval`, que sobrescribía la función global `window.setInterval()`, causando un ciclo infinito de re-renders y llamadas a la API.

## ✅ Solución Aplicada

Se renombraron las variables para evitar el conflicto:

```typescript
// ❌ ANTES (conflicto)
const [interval, setInterval] = useState(30);

// ✅ DESPUÉS (correcto)
const [checkInterval, setCheckInterval] = useState(30);
```

## 🔄 Pasos para Aplicar el Fix

### 1. Detener el servidor actual

Si tienes el servidor corriendo, detenlo con `Ctrl + C` en la terminal.

### 2. Limpiar el localStorage del navegador

El navegador tiene configuración antigua guardada que puede causar problemas. Límpiala:

**Opción A: Desde la Consola del Navegador**
1. Abre la aplicación en `http://localhost:3000`
2. Presiona `F12` para abrir las DevTools
3. Ve a la pestaña **Console**
4. Ejecuta este comando:
```javascript
localStorage.removeItem('reviewMonitorConfig');
location.reload();
```

**Opción B: Desde Application/Storage**
1. Abre DevTools (`F12`)
2. Ve a la pestaña **Application** (Chrome) o **Storage** (Firefox)
3. En el menú izquierdo: **Local Storage** → `http://localhost:3000`
4. Busca `reviewMonitorConfig` y elimínalo
5. Recarga la página (`F5`)

### 3. Reiniciar el servidor

```bash
npm run dev
```

### 4. Verificar que funciona

1. Abre `http://localhost:3000`
2. La consola del terminal **NO** debería mostrar llamadas continuas
3. Configura tus credenciales nuevamente
4. El monitor debería funcionar normalmente

## 🎯 ¿Por Qué Pasó Esto?

JavaScript tiene dos `setInterval`:
- **React state**: `const [interval, setInterval] = useState(30)`
- **Browser API**: `window.setInterval(fn, time)`

Cuando usamos `setInterval` como nombre de estado en React, sobrescribe la función del navegador, causando:
1. Re-renders infinitos
2. Llamadas a la API sin control
3. Agotamiento de la cuota de Google API
4. Posibles cargos excesivos

## ✨ Cambios Realizados

1. ✅ Renombrado `interval` → `checkInterval`
2. ✅ Renombrado `setInterval` → `setCheckInterval`
3. ✅ Actualizado localStorage para usar `checkInterval`
4. ✅ Migración automática de configs antiguas
5. ✅ Sin errores de TypeScript/ESLint

## 🛡️ Prevención Futura

**Nombres a evitar en React:**
- ❌ `setInterval` / `setTimeout`
- ❌ `clearInterval` / `clearTimeout`
- ❌ `fetch` / `console`
- ❌ Cualquier API global del navegador

**Buenos nombres para estados:**
- ✅ `checkInterval` / `setCheckInterval`
- ✅ `pollingInterval` / `setPollingInterval`
- ✅ `intervalMinutes` / `setIntervalMinutes`

## 📊 Verificación

Después de aplicar el fix, deberías ver:

```bash
✓ Ready in 3.6s
○ Compiling /api/reviews ...
✓ Compiled /api/reviews in 1336ms
# Y NADA MÁS (hasta que inicies el monitor manualmente)
```

Las llamadas a `/api/reviews` solo deberían aparecer cuando:
1. Inicies el monitor manualmente
2. Se cumpla el intervalo configurado (cada 30 minutos por defecto)

---

## 🆘 Si el Problema Persiste

1. **Cierra TODAS las pestañas** de `localhost:3000`
2. **Limpia la caché del navegador** completamente
3. **Borra `node_modules/.cache`**:
```bash
rm -rf node_modules/.cache
rm -rf .next
npm run dev
```

4. **Verifica que no haya múltiples pestañas** ejecutando el monitor

---

**Estado:** ✅ ARREGLADO - Actualiza y limpia localStorage

