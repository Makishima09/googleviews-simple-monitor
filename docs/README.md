# 📚 Documentación - Monitor de Reseñas de Google Maps

Bienvenido a la documentación completa del Monitor de Reseñas de Google Maps.

## 📖 Índice de Documentación

### 🚀 Guías de Usuario

#### [Inicio Rápido](./QUICK_START.md)
Guía paso a paso para configurar y ejecutar el monitor en menos de 5 minutos.

**Contenido:**
- Instalación y configuración
- Obtención de credenciales (Google API, Telegram Bot)
- Primer uso
- Despliegue en producción

---

#### [Historial de Reseñas](./HISTORIAL_RESEÑAS.md)
Explicación completa del sistema de historial visual de reseñas.

**Contenido:**
- Diferenciación entre reseñas existentes y nuevas
- Visualización con códigos de color
- Persistencia de datos
- Gestión del historial

---

#### [Informe Conceptual](./Informe.md)
Documento teórico que explica el funcionamiento del sistema sin tecnicismos.

**Contenido:**
- ¿Qué problema resuelve?
- Cómo funciona por dentro
- Flujo completo del sistema
- Consejos para implementación

---

### 🔧 Documentación Técnica

#### [Bug Fix: Duplicados](./BUGFIX_DUPLICADOS.md)
Solución técnica al problema de reseñas duplicadas en cada revisión.

**Problema:** Las reseñas se detectaban como "nuevas" repetidamente  
**Causa:** Closure stale en `setInterval` con React hooks  
**Solución:** Implementación de `useRef` para mantener referencias actualizadas

---

#### [Bug Fix: Loop Infinito](./FIX_INFINITE_LOOP.md)
Solución al problema de llamadas infinitas a la API.

**Problema:** El sistema hacía llamadas sin parar a Google API  
**Causa:** Conflicto de nombres entre estado React y función global `setInterval`  
**Solución:** Renombrado de variables para evitar sobrescritura

---

#### [Nuevas Funcionalidades](./NUEVA_FUNCIONALIDAD.md)
Changelog detallado de características implementadas.

**Contenido:**
- Historial de reseñas nuevas detectadas
- Persistencia en localStorage
- Diferenciación visual
- Sistema de limpieza de historial

---

## 🎯 Navegación Rápida

### Por Tipo de Usuario

**Si eres usuario final:**
1. Lee [Inicio Rápido](./QUICK_START.md) para configurar todo
2. Consulta [Historial de Reseñas](./HISTORIAL_RESEÑAS.md) para entender la interfaz
3. Lee [Informe Conceptual](./Informe.md) para comprender el concepto

**Si eres desarrollador:**
1. Lee [Informe Conceptual](./Informe.md) para entender la arquitectura
2. Revisa los bug fixes para aprender de problemas comunes
3. Consulta [Nuevas Funcionalidades](./NUEVA_FUNCIONALIDAD.md) para ver el changelog

**Si tienes problemas:**
1. Revisa la sección Troubleshooting en cada documento
2. Consulta los bug fixes si experimentas comportamiento extraño
3. Verifica el [README principal](../README.md) para FAQ

---

## 📝 Resumen de Documentos

| Documento | Tipo | Dificultad | Tiempo de Lectura |
|-----------|------|------------|-------------------|
| [QUICK_START.md](./QUICK_START.md) | Guía | ⭐ Fácil | 10 min |
| [HISTORIAL_RESEÑAS.md](./HISTORIAL_RESEÑAS.md) | Guía | ⭐⭐ Media | 15 min |
| [Informe.md](./Informe.md) | Conceptual | ⭐ Fácil | 10 min |
| [BUGFIX_DUPLICADOS.md](./BUGFIX_DUPLICADOS.md) | Técnico | ⭐⭐⭐ Avanzado | 15 min |
| [FIX_INFINITE_LOOP.md](./FIX_INFINITE_LOOP.md) | Técnico | ⭐⭐⭐ Avanzado | 10 min |
| [NUEVA_FUNCIONALIDAD.md](./NUEVA_FUNCIONALIDAD.md) | Changelog | ⭐⭐ Media | 20 min |

---

## 🔗 Enlaces Útiles

- [README Principal](../README.md)
- [Código Fuente](../app/)
- [API Routes](../app/api/)
- [Configuración Next.js](../next.config.js)

---

## 📌 Convenciones

En la documentación usamos los siguientes iconos y marcadores:

- ✅ **Correcto / Implementado**
- ❌ **Incorrecto / No implementado**
- ⚠️ **Advertencia / Importante**
- 💡 **Tip / Sugerencia**
- 🔍 **Detalle técnico**
- 📊 **Ejemplo / Diagrama**
- 🧪 **Prueba / Testing**
- 🐛 **Bug / Problema**
- 🎯 **Objetivo / Resultado**

---

## 🤝 Contribuir a la Documentación

¿Encontraste un error o quieres mejorar la documentación?

1. Los archivos están en formato Markdown (.md)
2. Sigue el estilo y estructura existente
3. Incluye ejemplos cuando sea posible
4. Usa los iconos de convención apropiados
5. Abre un Pull Request con tus cambios

---

**Última actualización:** Noviembre 2025  
**Versión del proyecto:** 1.0.0

