# Informe de Despliegue — Quiromancia AI · Divergency

**Proyecto:** Quiromancia AI · Divergency
**App en vivo:** https://quiromacia-ia.web.app
**Proyecto Firebase:** `desarrollo-investigaciones` (plan Blaze)
**Rama de trabajo:** `despliegue`
**Fecha del informe:** 2026-06-18
**Contacto técnico:** divergencyai@gmail.com

---

## 1. Resumen ejecutivo

Se desplegó la aplicación web **Quiromancia AI** (lectura de la palma con IA, voz del oráculo y entrega de la lectura por WhatsApp) en Firebase, dentro de un **proyecto compartido** con muchas otras apps. El despliegue se hizo de forma **acotada y segura** para no afectar a las demás aplicaciones del proyecto, en una rama dedicada (`despliegue`) sin modificar nunca la rama `main`.

Estado final: **todo operativo** — lectura por IA, voz premium (ElevenLabs), guardado de datos en Firestore, login con Google y envío de la lectura por WhatsApp vía un webhook de n8n.

---

## 2. ¿Qué hace la aplicación?

Flujo del usuario:
1. **Intro** animada con estrella y audio.
2. Elección de **oráculo** (3 personalidades: Serio, Místico/Delfos, Burlón).
3. **Formulario** "Cuéntame de ti": nombre, correo, celular, mano dominante, fecha de nacimiento, tema. Se guarda como *lead* en Firestore.
4. **Cámara** con tema de escaneo + detección de la mano (silueta/malla).
5. **Lectura por IA**: análisis de la palma con visión (OpenAI), presentada como **diagrama anotado** por líneas (vida, corazón, cabeza, destino), montes y consejos.
6. **Voz del oráculo** (ElevenLabs TTS) narra la lectura, con respaldo a la voz del navegador si falla.
7. **Entrega por WhatsApp**: al pulsar el botón, la lectura completa se envía al celular del formulario **desde +57 323 3239999**.

---

## 3. Arquitectura y stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML/CSS/JS estático (`public/index.html`), servido por **Firebase Hosting** |
| Backend | **Cloud Functions (2ª gen)**, Node.js 20, Express |
| Base de datos | **Cloud Firestore** |
| Autenticación | **Firebase Auth** (Google) |
| IA — lectura | OpenAI `gpt-4o-mini` (visión) |
| IA — transcripción | OpenAI `whisper-1` |
| Voz (TTS) | **ElevenLabs** (`eleven_multilingual_v2`) |
| Envío WhatsApp | Webhook **n8n** (`n8n.divergencyai.cloud`) |

---

## 4. Infraestructura de despliegue

### 4.1. Proyecto Firebase (compartido)
`desarrollo-investigaciones` es un proyecto **compartido** con ~30 sitios de Hosting y varias Cloud Functions de otras apps (p. ej. `agent`, `chatProposalGPT`, `processPDFGPT`). Por eso **nunca** se ejecuta `firebase deploy` "a secas": pisaría hosting ajeno, podría sobrescribir funciones de otras apps y reemplazaría las reglas de Firestore de todo el proyecto.

### 4.2. Hosting
- **Sitio dedicado:** `quiromacia-ia` → https://quiromacia-ia.web.app (NO el sitio por defecto del proyecto).
- En `firebase.json`: `"site": "quiromacia-ia"`, carpeta `public/`.

### 4.3. Cloud Function
- **Nombre:** `quiromanciaApi` (renombrada desde `api` para no chocar con otra función existente).
- 2ª gen · región `us-central1` · 512 MiB · Node.js 20 · timeout 60 s · CORS habilitado.
- **Rewrite de Hosting:** `/api/**` → `quiromanciaApi` (us-central1).

### 4.4. App web (para `firebaseConfig`)
- App web registrada "Quiromancia", `appId: 1:293865702055:web:a0fba764df14823eacd182`.
- Config pegada en `public/index.html` (`apiKey`, `authDomain`, `projectId`, `appId`). El `apiKey` de Firebase **no es secreto** (es config pública de cliente).

### 4.5. Firestore
- Colecciones: **`leads`** (datos del formulario) y **`predicciones_enviadas`** (legado del envío por correo).
- Ubicación de la base: `nam5`.
- **Las reglas de Firestore NO se despliegan desde este repo** (para no sobrescribir las del proyecto compartido). La app escribe vía Admin SDK desde la función, que ignora las reglas; el navegador no accede directo a Firestore.

---

## 5. Secrets (Secret Manager)

Se usan **nombres dedicados** para no colisionar con los secrets compartidos del proyecto. `handlers.js` los lee con *fallback* a los nombres genéricos para el dev-server local.

| Secret | Uso | Estado |
|--------|-----|--------|
| `QUIROMANCIA_OPENAI_API_KEY` | Lectura y transcripción (OpenAI) | ✅ activo |
| `QUIROMANCIA_ELEVENLABS_API_KEY` | Voz del oráculo (ElevenLabs) | ✅ activo |
| `SMTP_USER` | (Correo — legado, ya no se usa) | ⚠️ sin uso |
| `SMTP_PASS` | (Correo — legado, ya no se usa) | ⚠️ sin uso |

> Al cambiar el valor de un secret hay que **re-desplegar** la función para que tome la versión nueva (queda anclada a la versión del momento del deploy).

---

## 6. Endpoints del backend (`/api/...`)

| Ruta | Método | Función |
|------|--------|---------|
| `/api/lectura` | POST | Lectura de la palma con visión (OpenAI), devuelve JSON por líneas |
| `/api/transcribe` | POST | Transcribe audio (Whisper) para preguntas por voz |
| `/api/voz` | POST | Genera la narración con ElevenLabs (TTS) → audio |
| `/api/voces` | GET | Lista voces de la cuenta ElevenLabs (auxiliar) |
| `/api/lead` | POST | Guarda los datos del formulario en `leads` (Firestore) |
| `/api/enviar` | POST | (Legado) Registraba/enviaba la predicción por correo |

---

## 7. Envío de la lectura por WhatsApp (n8n)

El botón **"Enviar a WhatsApp"** ya **no abre `wa.me`**. Ahora el frontend hace:

```
POST https://n8n.divergencyai.cloud/webhook/quiromancia-lectura
Content-Type: application/json

{ "celular": "573XXXXXXXXX", "lectura": "Texto completo de la lectura…" }
```

- El mensaje llega al usuario **desde +57 323 3239999** (DivergencyAI).
- El celular se normaliza (Colombia: 10 dígitos que empiezan en 3 → `57…`, sin `+`).
- **Sin backend ni token**: el webhook es público y tiene **CORS habilitado** para `quiromacia-ia.web.app` (verificado: preflight 204, `Access-Control-Allow-Origin` correcto).
- UI: estados "Enviando…" → "✅ Tu lectura fue enviada a tu WhatsApp" / errores, con **bloqueo de doble envío**.

---

## 8. Adaptaciones específicas de despliegue

Cambios hechos para que la app funcione correctamente en producción (todos en la rama `despliegue`):

1. **`.firebaserc`** → proyecto por defecto `desarrollo-investigaciones`.
2. **`firebase.json`** → `site: quiromacia-ia`, rewrite a `quiromanciaApi`, **sin** sección `firestore`.
3. **Función renombrada** `api` → `quiromanciaApi` para evitar colisión con otra app.
4. **Secrets dedicados** (`QUIROMANCIA_OPENAI_API_KEY`, `QUIROMANCIA_ELEVENLABS_API_KEY`) con *fallback* local en `handlers.js`.
5. **`firebaseConfig`** real pegado en `public/index.html`.
6. **Tratado de quiromancia** copiado a `functions/quiromancia.txt`: la función lo lee del disco (`guiaTratado`), y al desplegar solo viaja `functions/` (no `public/`).
7. **Botón de WhatsApp** → `POST` al webhook de n8n (sección 7).
8. **Cabeceras de caché** en `firebase.json`:
   - HTML (`/` y `**/*.html`) → `no-cache, no-store, must-revalidate` (cada deploy se ve al instante).
   - Audios (`mp3/wav/m4a`) → `public, max-age=86400` (cacheados 24 h).

---

## 9. Flujo de ramas (Git)

- Todo el trabajo de despliegue vive en la rama **`despliegue`** (la config de despliegue **no** está en `main`).
- Cuando hay cambios nuevos en `main`, se traen con **`git merge origin/main` estando en `despliegue`** — **nunca** se hace checkout/merge sobre `main`.
- La rama **`main` quedó intacta** durante todo el proceso (verificado repetidamente: `main` sigue en `bb8215f`, sin commits del despliegue).
- Conflictos típicos al mezclar (`functions/index.js`, `functions/handlers.js`, `public/index.html`): se resuelven conservando la **config de despliegue** + el **código nuevo de main**.

---

## 10. Historial de commits (rama `despliegue`)

```
4689d99  Hosting: no cachear el HTML (raíz y *.html)
bbb309f  WhatsApp: enviar la lectura vía webhook de n8n (emisor DivergencyAI)
92f101a  Despliegue: incluir quiromancia.txt en functions/ para la nube
3fa21fd  Merge origin/main → despliegue
  1a51c84 Lectura: más ligera + reintentos, no bloquea con el modal
  d54ab76 Tolerancia: no bloquea con el aviso de "repetir foto"
  ecc5d1a Lectura: refuerzo con el tratado quiromancia.txt
  f76ac2c Resultado: tarjeta de "Consejos del oráculo"
  ac4acf5 Enfoque: botonera tras la foto + lectura según el tema
  b1a3cb1 Botonera de enfoque (amor/dinero/trabajo/familia/salud) + consejos
  26d7eeb Responsive: la lectura se apila en móvil/tablet
6e943f4  Merge origin/main → despliegue
  d3deff6 Diagrama anotado, lectura personalizada (PDF) y escáner anclado a la mano
dacd66c  Merge origin/main → despliegue
  901d153 Cambios de profesores, voz ElevenLabs, resumen de respuestas, logos
0622297  Merge origin/main → despliegue
9aede64  Configurar despliegue en Firebase (config base)
  f8427ef … (historial previo de main: trazos, silueta, cajitas, etc.)
bb8215f  (base) Quiromancia AI · Divergency — app lista para Firebase
```

---

## 11. Verificaciones realizadas

- ✅ `GET /` → 200 (web carga).
- ✅ `POST /api/lectura` (sin imagen) → 400 "Falta la imagen de la palma" (ruta viva).
- ✅ `POST /api/voz` → 200 con audio (voz ElevenLabs funciona).
- ✅ Guardado en Firestore `leads` confirmado con todos los campos.
- ✅ Login con Google funcionando.
- ✅ Webhook n8n: CORS para `quiromacia-ia.web.app` (preflight 204).
- ✅ Cabecera `Cache-Control: no-cache` en `/` y `max-age=86400` en `mp3`.
- ✅ Cada re-deploy: solo `quiromanciaApi` + sitio `quiromacia-ia` (otras apps y Firestore intactos).

---

## 12. Pendientes y recomendaciones

| Tema | Detalle | Prioridad |
|------|---------|-----------|
| **Node.js 20** | Se **desactiva el 2026-10-30**. Subir Functions a `nodejs22` (cambiar `runtime` en `firebase.json` y `engines` en `functions/package.json`) antes de esa fecha. | Media (antes de oct-2026) |
| **Cambios solo en `despliegue`** | El botón de WhatsApp, la config de despliegue y el cache viven solo en `despliegue`, no en `main`. Conviene llevarlos a `main` para que sean "oficiales" y no depender de re-aplicarlos en cada merge. | Media |
| **Secrets SMTP sin uso** | `SMTP_USER` / `SMTP_PASS` y el endpoint `/api/enviar` quedaron sin uso (la entrega es por WhatsApp). Se pueden limpiar del código. | Baja |
| **Permiso `voices_read`** | La clave de ElevenLabs no tiene ese permiso, por lo que `/api/voces` da 401. No afecta la app (usa una voz por defecto). Opcional: añadir el permiso si se quiere listar/cambiar voces. | Baja |

---

## 13. Comandos de referencia

```bash
# Desplegar (SIEMPRE acotado — no usar firebase deploy a secas)
firebase deploy --only "functions:quiromanciaApi,hosting:quiromacia-ia" --project desarrollo-investigaciones --force

# Solo hosting (cambios de frontend)
firebase deploy --only "hosting:quiromacia-ia" --project desarrollo-investigaciones

# Configurar un secret (pide el valor, oculto)
firebase functions:secrets:set NOMBRE --project desarrollo-investigaciones

# Ver versiones de un secret (sin mostrar el valor)
firebase functions:secrets:get NOMBRE --project desarrollo-investigaciones

# Ver logs de la función
firebase functions:log --only quiromanciaApi --project desarrollo-investigaciones

# Traer cambios de main hacia despliegue (estando en la rama despliegue)
git fetch origin && git merge origin/main
```

---

## 14. Recursos

- **App:** https://quiromacia-ia.web.app
- **Consola Firebase:** https://console.firebase.google.com/project/desarrollo-investigaciones/overview
- **Webhook WhatsApp (n8n):** https://n8n.divergencyai.cloud/webhook/quiromancia-lectura
- **Número emisor WhatsApp:** +57 323 3239999
- **Contacto:** divergencyai@gmail.com

---

*Informe generado el 2026-06-18.*
