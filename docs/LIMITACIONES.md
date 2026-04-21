# Limitaciones del Sistema

## Acceso a Datos (Critical)

**Problema**: Google no tiene una API pública y gratuita para obtener reseñas.

**Estado actual**: El código usa `Google Places API` (línea 26 de `app/api/reviews/route.ts`) que:
- Requiere una API Key válida
- Tiene cuotas limitadas (~10,000 requests/día para Places API)
- No permite acceso automatizado continuo sin costo

**Qué dice el informe**: El informe #61-76 menciona las alternativas (scraping, APIs de terceros) pero no proporciona una solución implementable.

---

## Fiabilidad del Polling

**Problema**: Revisar cada X minutos no garantiza orden cronológico.

**Estado actual**:
- No hay mecanismo de comparación robusto
- Si el proceso falla silenciosamente, se pierden reseñas
- No hay logging de errores ni notificación de fallos

**Riesgo**: Reseñas pueden perderse sin conocimiento.

---

## Reseñas Modificadas o Eliminadas

**Problema**: No hay detección de cambios.

**Estado actual**:
- El ID `${author_name}_${review.time}` (línea 44) es estático
- Si un usuario edita su reseña → no se detecta
- Si Google elimina una reseña (spam) → no hay manejo

**Impacto**: El sistema trabaja con datos obsoletos.

---

## Sin Manejo de Fallos en Notificaciones

**Problema**: Si Telegram/email falla, la reseña queda marcada como "vista" y la notificación se pierde.

**Estado actual**:
- La API es solo un pipe a Google
- No hay lógica de retry
- No hay cola de notificaciones pendientes

---

## Almacenamiento Frágil

**Problema**: JSON no escala, no soporta concurrencia.

**Estado actual**:
- No hay base de datos
- No hay persistencia de estado
- Cada request es independiente

---

## Sin Autenticación ni Multi-usuario

**Problema**: No hay concepto de "quién recibe qué".

**Estado actual**:
- Ruta pública (solo valida placeId y apiKey)
- Sin sistema de usuarios
- Sin permisos ni roles

---

## Sin Contexto de Respuesta

**Problema**: No hay forma de responder a las reseñas.

**Estado actual**:
- Funcionalidad no implementada
- No hay integración con Google Business Profile API para respuestas

---

## Resumen

| Limitación | Severidad | Status |
|------------|-----------|--------|
| Acceso a datos | Crítica | Sin solución |
| Fiabilidad polling | Alta | Sin implementar |
| Reseñas modificadas | Media | Sin implementar |
| Fallos notificaciones | Alta | Sin implementar |
| Almacenamiento | Alta | Sin implementar |
| Autenticación | Media | Sin implementar |
| Respuesta | Baja | Sin implementar |