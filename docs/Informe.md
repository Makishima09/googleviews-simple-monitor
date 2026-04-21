Guía
📝 Informe: Cómo detectar y recibir notificaciones cuando entra una nueva reseña en Google
🎯 Objetivo

El objetivo general es muy sencillo:

Cada vez que un negocio reciba una nueva reseña en Google, queremos enterarnos automáticamente y recibir una notificación al instante (por Telegram, email o donde se quiera).

Nada más.
Este documento explica la idea sin tecnicismos para que sea fácil de entender.

🧩 ¿Qué problema estamos resolviendo?

Un negocio recibe reseñas en Google (Google Maps).
El problema es que:

nadie las revisa a tiempo,

se pierden reseñas,

no se responde,

afecta a la reputación y a la imagen del negocio.

Por eso necesitamos un sistema que vigile las reseñas por nosotros y nos avise cuando haya una nueva.

🧠 ¿Qué hace exactamente el sistema? (versión muy simple)

Revisa cada cierto tiempo si hay nuevas reseñas.
(por ejemplo cada 30 minutos)

Guarda un registro de las reseñas que ya conoce.
Así sabemos cuáles son nuevas y cuáles ya vimos antes.

Si aparece una reseña que no estaba registrada:
→ entonces es nueva
→ y debemos enviarnos una notificación.

La notificación puede ser por:

Telegram,

Email,

WhatsApp,

o cualquier otro canal.

Este es el mecanismo básico.
Un pequeño “rastreador” que mira Google y avisa.

🧱 Cómo funciona por dentro (explicado sin código)
1. El sistema pregunta a Google por las reseñas

Hay una forma de pedirle a Google:
"Enséñame todas las reseñas de este negocio."

Google devuelve una lista:
Reseña 1, Reseña 2, Reseña 3…

⚠️ Importante: Esto NO es trivial. Google NO tiene una API pública y gratuita para reseñas.

La Google Business Profile API (anteriormente Google My Business API) tiene estos requisitos:

- **Cuenta de Google Developer** registrada
- **Verificación de propiedad** del negocio (business verification)
- **OAuth 2.0** con scopes específicos (no es solo una "API key")
- **Cuotas estrictas** (rate limits) - máximo ~600 requests/día
- **Revisión manual** de Google antes de poder usar la API

Alternativas:
- Scraping (viola Términos de Servicio de Google, puede bloquear IPs)
- Servicios de terceros (de pago, como Apify)
- APIs comerciales de terceros (ej: Placeful, ReviewManager)

Esto es lo primero que hay que resolver antes de escribir código.

2. Guardamos las reseñas que ya conocemos

Creamos una pequeña base de datos (o incluso un archivo simple, si se quiere).

Ahí guardamos:

el texto de la reseña,

la fecha,

y un identificador único.

Esto es para poder comparar.

3. Cuando volvemos a mirar, comparamos

Si Google devuelve 10 reseñas,

pero nosotros teníamos guardadas 9…

Entonces la reseña número 10 es nueva.

4. Cuando encontramos una nueva reseña → enviamos una alerta

El sistema envía un mensaje tipo:

“📣 Nueva reseña recibida (4 estrellas):
‘La comida buenísima, volveremos.’”

Y ya.
El dueño se entera al momento.

🪜 Resumen del flujo completo

Revisar Google cada X minutos.

Obtener la lista actual de reseñas.

Compararla con lo que ya está guardado.

Detectar si hay alguna que antes no existía.

Guardar la nueva reseña como “vista”.

Enviar una notificación.

Es un ciclo que se repite constantemente.

🔎 ¿Qué necesita saber un programador junior para hacerlo?

Muy poco realmente:

Cómo hacer una llamada a una API (preguntar a un servicio por datos).

Cómo guardar información en algún sitio (archivo, base de datos).

Cómo comparar dos listas.

Cómo enviar un mensaje automático (por Telegram o email).

No hace falta saber:

algoritmos complejos,

arquitectura avanzada,

automatización profesional.

Solo pasos lógicos simples.

🍀 Consejos para construirlo sin líos

Hazlo por partes.
No intentes hacerlo todo de golpe.

Empieza solo leyendo la lista de reseñas.
Si puedes imprimir las reseñas en consola → ya tienes la base.

Luego aprende a guardarlas en un archivo.
Aunque sea un JSON.

Después crea la comparación.
Esto es:

Si aparece una que no está en el archivo → es nueva.

Y finalmente, manda la notificación.
Telegram es el más fácil.

No compliques cosas como permisos, errores o excepciones.
Ya lo mejorarás.

🎁 Idea clave para que lo entienda bien:

El sistema NO necesita “ver” la página de Google, ni abrir el navegador, ni nada visual.

Piensa en Google como un camarero:

Tú le dices:
“Dime todas las reseñas que tienes del negocio X.”

Él te da una lista.

La próxima vez, vuelves y le dices lo mismo.
Si te da algo que no estaba antes, eso es una nueva reseña.

Eso es todo.

📌 Conclusión

Tu programador junior debe entender una sola frase:

“Cada cierto tiempo le pedimos a Google la lista de reseñas.
Si aparece una que no estaba antes, enviamos un aviso.”

Cuando entienda eso, ya está listo para construir el sistema en cualquier lenguaje, plataforma o herramienta.