# Quiromancia AI · Divergency

App **web** de quiromancia: intro animada con estrella y audio, elección de oráculo
(3 personalidades), formulario con datos del usuario, cámara con tema de escaneo,
animación de análisis y un **chat** donde el oráculo entrega la lectura (con música de
fondo) y se le puede preguntar por **voz** o por texto. Al final, el usuario puede
**recibir su predicción por correo** iniciando sesión con Google.

Pensada para desplegarse en **Firebase** (Hosting + Cloud Functions + Firestore + Auth).

> Desarrollada por **Divergency**. Modelo experimental, solo para entretenimiento.

---

## ✨ Funcionalidades

- **Intro** con estrella animada + audio (inicia al tocar).
- **3 modos** de oráculo: 🎯 Serio · 🔮 Oráculo de Delfos · 😏 Burlón (sarcástico, sin grosería).
- **Formulario**: nombre, correo, celular, mano dominante, fecha de nacimiento (calcula el **signo** solo) y tema. Se guarda como *lead* en Firestore.
- **Cámara** con tema de escaneo (estrellas + barrido) y respaldo a cámara nativa.
- **Análisis** animado con IA (OpenAI `gpt-4o-mini` con visión).
- **Chat** con la lectura, **música de fondo suave** y **voz** del oráculo (TTS).
- **Preguntas por voz** (micrófono → Whisper) o por texto.
- **Límite de 3 lecturas por usuario** (por correo), con indicador `Lectura X/3`.
- **Recibir la predicción por correo** vía **inicio de sesión con Google**.

---

## 🗂️ Estructura

```
quiromancia/
├─ public/                  # Firebase Hosting (frontend)
│  ├─ index.html
│  └─ mp3/
├─ functions/               # Cloud Functions (backend)
│  ├─ index.js              # API: /chat /transcribe /lead /enviar
│  ├─ handlers.js           # lógica compartida (OpenAI, leads)
│  └─ package.json
├─ firebase.json            # hosting + rewrites + functions + firestore
├─ .firebaserc              # ← poner el PROJECT-ID
├─ firestore.rules          # acceso solo vía Functions
├─ dev-server.mjs           # servidor LOCAL de pruebas
└─ LEEME.md                 # guía detallada (ES)
```

---

## 🔐 Configuración que NO está en el repo (la hace quien despliega)

Por seguridad, estos valores **no se versionan** y deben configurarse en el despliegue:

1. **Clave de OpenAI** y **SMTP** → como *secrets* de Functions (no en el código).
2. **Config web de Firebase** (`apiKey`, etc.) → pegar en `public/index.html`.
3. **ID del proyecto** → en `.firebaserc`.

Ver el paso a paso completo en **[LEEME.md](LEEME.md)**.

---

## 🚀 Despliegue (resumen)

> Requiere plan **Blaze** (las Functions llaman a OpenAI).

```bash
# 1. Herramientas
npm i -g firebase-tools && firebase login

# 2. Poner el PROJECT-ID en .firebaserc y activar en consola:
#    Firestore + Authentication (Google)

# 3. Pegar la config web de Firebase en public/index.html

# 4. Secretos
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS

# 5. Desplegar
cd functions && npm install && cd ..
firebase deploy
```

Detalles y notas (correo Gmail, dominios autorizados, etc.) en **[LEEME.md](LEEME.md)**.

---

## 🧪 Desarrollo local

```bash
node dev-server.mjs   # http://localhost:3000  (clave en .env)
```
En local, los *leads* y predicciones se guardan en archivos `*.local.json`
(no se envía correo real).

---

## 🗄️ Datos recolectados (Firestore)

- `leads` — datos del formulario.
- `predicciones_enviadas` — predicciones solicitadas por correo.

Acceso solo desde Cloud Functions (ver `firestore.rules`).
