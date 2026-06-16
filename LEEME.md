# Quiromancia AI · Divergency

App **web** de quiromancia para desplegar en **Firebase**. Intro con estrella y audio,
elección de oráculo (3 modos), formulario con datos del usuario, cámara con tema de
escaneo, animación de análisis, y un **chat** donde el oráculo entrega la lectura (con
música de fondo suave) y se puede preguntar por **voz** (micrófono) o por texto.

> Desarrollada por **Divergency**. Modelo experimental, solo para entretenimiento.

---

## Qué hace

- **Intro**: estrella animada + audio (`mp3/yodguard-healing-magic-5-378667.mp3`); inicia al tocar.
- **3 modos**: 🎯 Serio · 🔮 Oráculo (Delfos) · 😏 Burlón (sarcástico estilo Deadpool / Ricardo Quevedo, sin grosería).
- **Formulario**: nombre, correo, celular, mano dominante, fecha de nacimiento (saca el signo solo) y tema. Los datos se guardan como **lead** en Firestore.
- **Cámara**: tema de escaneo (estrellas + barrido), sin silueta de mano.
- **Lectura**: análisis animado → aviso experimental → chat con la lectura, **música de fondo suave** (`mp3/dragon.mp3`) y voz del oráculo (TTS).
- **Límite de 3 lecturas por usuario** (por correo), con indicador “Lectura X/3”.
- **Al terminar**: alerta “¿Deseas recibir tu predicción?” → **iniciar sesión con Google** → se envía la lectura al **correo**.

---

## Estructura del proyecto

```
quiromancia/
├─ public/                  # Firebase Hosting (frontend)
│  ├─ index.html
│  └─ mp3/  (intro + dragon.mp3)
├─ functions/               # Cloud Functions (backend)
│  ├─ index.js              # API: /chat /transcribe /lead /enviar
│  ├─ handlers.js           # lógica compartida (OpenAI, leads)
│  └─ package.json
├─ firebase.json            # hosting + rewrites + functions + firestore
├─ .firebaserc              # ← pon aquí tu PROJECT-ID
├─ firestore.rules          # acceso solo vía Functions
├─ dev-server.mjs           # servidor LOCAL de pruebas
└─ .env                     # OPENAI_API_KEY para desarrollo local
```

---

## Datos que se recolectan (Firestore)

- **`leads`** — cada envío del formulario: nombre, correo, celular, fecha de nacimiento, signo, mano, tema, modo, fecha.
- **`predicciones_enviadas`** — cada predicción solicitada por correo: uid, correo, nombre, texto, fecha.

> Las reglas (`firestore.rules`) **bloquean el acceso directo** desde el navegador. Solo las Cloud Functions (Admin SDK) leen/escriben. Para ver los datos, usa la consola de Firebase → Firestore.

---

## Probar en el PC (local, sin Firebase)

```
node dev-server.mjs
```
Abre `http://localhost:3000`. La clave se lee de `.env`. En local, los `leads` y las
predicciones se guardan en `leads.local.json` / `predicciones.local.json` (no se envía
correo real, y el botón de Google necesita la config de Firebase para funcionar de verdad).

---

## Desplegar en Firebase

> Requiere el **plan Blaze** (pago por uso) porque las Functions llaman a OpenAI.
> Firestore y Auth tienen capa gratuita amplia.

**1. Crear proyecto y herramientas**
- Crea un proyecto en **console.firebase.google.com** y súbelo a **Blaze**.
- Instala el CLI e inicia sesión:
  ```
  npm i -g firebase-tools
  firebase login
  ```
- Pon tu ID de proyecto en **`.firebaserc`** (reemplaza `TU-PROJECT-ID`).

**2. Activar servicios en la consola de Firebase**
- **Firestore Database** → Crear base de datos (modo producción).
- **Authentication** → Sign-in method → **Google** (habilitar). En *Authorized domains* agrega tu dominio `*.web.app` (ya viene) y `localhost`.

**3. Pegar la config web en el frontend**
- Firebase → ⚙️ Configuración del proyecto → *Tus apps* → Web → copia el objeto `firebaseConfig`.
- Pégalo en **`public/index.html`** (busca `const firebaseConfig = {`).

**4. Configurar secretos (clave OpenAI y correo)**
```
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set SMTP_USER     # tu Gmail (ej. tucorreo@gmail.com)
firebase functions:secrets:set SMTP_PASS     # CONTRASEÑA DE APLICACIÓN de Gmail (no la normal)
```
> La contraseña de aplicación se crea en tu cuenta Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones. Si no configuras SMTP, la predicción igual queda registrada en Firestore (solo no se envía el email).

**5. Instalar dependencias y desplegar**
```
cd functions
npm install
cd ..
firebase deploy
```
Al terminar te da la URL `https://TU-PROJECT-ID.web.app`. Ábrela en el iPad y, en Safari,
**Compartir → Agregar a pantalla de inicio** para usarla a pantalla completa.

---

## Personalización

- **Tono / modelo**: `functions/handlers.js` → objeto `MODOS` (personalidad y temperatura) y `MODELO` (`gpt-4o-mini`).
- **Diseño, textos, audios**: `public/index.html` (variables CSS en `:root`) y carpeta `public/mp3/`.
- **Volumen de la música de fondo**: en `index.html`, función `fondoMusica` (`bg.volume = 0.14`).

---

## Costos

Cada lectura y pregunta consumen saldo de OpenAI (pago por uso). `gpt-4o-mini` y
`whisper-1` son de los más económicos. Firebase: Functions/Firestore tienen capa gratuita;
revisa el panel de uso si esperas mucho tráfico.
