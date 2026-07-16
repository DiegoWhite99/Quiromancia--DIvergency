# 🚀 Manual de despliegue · Quiromancia AI · Divergency

Guía para subir el proyecto a **Firebase** (Hosting + Cloud Functions) por tu cuenta.
El sitio se sirve desde **Hosting** (carpeta `public/`) y la lógica del oráculo corre en
una **Cloud Function** (`functions/`) a la que Hosting redirige `/api/**`.

---

## 0) Requisitos (una sola vez)

1. **Node.js 20+** instalado (`node --version`).
2. **Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   firebase --version
   ```
3. Una cuenta de Google y un **proyecto de Firebase** creado en
   https://console.firebase.google.com
4. **Plan Blaze (pago por uso)** activado en el proyecto.
   ⚠️ **Obligatorio**: las Cloud Functions solo pueden llamar a APIs externas
   (OpenAI, ElevenLabs) con el plan Blaze. Con el plan gratuito (Spark) la lectura
   fallará. Tiene una capa gratuita generosa; para este uso el costo es mínimo.
5. En la consola de Firebase, activa:
   - **Firestore Database** (para guardar los leads del formulario).
   - (Opcional) **Authentication → Google** si quieres el envío por correo.

---

## 1) Iniciar sesión y elegir el proyecto (una sola vez)

Desde la carpeta del proyecto (`d:\Documentos\quiromancia`):

```bash
firebase login
firebase use --add
```
`firebase use --add` te lista tus proyectos: elige el tuyo y ponle un alias
(por ejemplo `default`). Esto rellena `.firebaserc` automáticamente.

Verifica:
```bash
firebase use
```

---

## 2) Configurar los secretos (claves de API)

Las claves NO van en el código. Se guardan como **secrets** de Functions:

```bash
# Obligatorio (motor de la lectura):
firebase functions:secrets:set OPENAI_API_KEY

# Opcional (voz del oráculo con ElevenLabs; si no, usa la voz del navegador):
firebase functions:secrets:set ELEVENLABS_API_KEY

# Opcional (envío de la predicción por correo con Gmail):
firebase functions:secrets:set SMTP_USER   # tu correo, ej. tucorreo@gmail.com
firebase functions:secrets:set SMTP_PASS   # "contraseña de aplicación" de Gmail
```
Cada comando te pide pegar el valor. Para ver los que ya tienes:
```bash
firebase functions:secrets:access OPENAI_API_KEY
```
> Si cambias un secreto, hay que **volver a desplegar** las functions para que lo tomen.

---

## 3) (Opcional) Configurar el login con Google para el correo

Solo si vas a usar el envío por correo (el flujo normal usa **WhatsApp** y no lo necesita).
En `public/index.html`, en el bloque `firebaseConfig`, pega la config web de tu proyecto
(Consola Firebase → Configuración del proyecto → Tus apps → Web → SDK config):
```js
const firebaseConfig = {
  apiKey: "…",
  authDomain: "…",
  projectId: "…",
  appId: "…"
};
```

---

## 4) Desplegar

**Todo (Hosting + Functions + reglas de Firestore):**
```bash
firebase deploy
```

**Solo una parte** (más rápido cuando cambias poco):
```bash
firebase deploy --only hosting     # cambiaste el front (public/)
firebase deploy --only functions   # cambiaste la lógica (functions/)
firebase deploy --only firestore:rules
```

Al terminar, la CLI te da la **URL** del sitio (algo como
`https://TU-PROYECTO.web.app`). Ábrela y prueba una lectura.

> **Nota**: antes de desplegar las functions se ejecuta automáticamente
> `node functions/sync-guia.js` (hook *predeploy*), que copia
> `public/docs/quiromancia.txt` dentro de `functions/` para que el oráculo tenga
> la guía también en producción. No tienes que hacer nada manual.

---

## 5) Editar la guía de quiromancia (base de conocimiento)

El oráculo se apoya en **`public/docs/quiromancia.txt`**. Puedes editarlo cuando
quieras (añadir/afinar interpretaciones). Al hacer `firebase deploy` (o
`--only functions`) el hook *predeploy* la vuelve a copiar a `functions/`.

- En **desarrollo local** (`npm run dev`) se lee directo desde `public/docs/`.
- En **producción** se lee la copia en `functions/quiromancia.txt` (se genera sola).

También puedes sincronizarla a mano:
```bash
node functions/sync-guia.js
```

---

## 6) Probar en local antes de desplegar

```bash
npm run dev          # servidor local en http://localhost:3000
```
Necesita un archivo **`.env`** en la raíz con al menos:
```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...   # opcional
```
(el `.env` está en `.gitignore`, no se sube al repo).

---

## 7) Ver logs y depurar

```bash
firebase functions:log
```
Si una lectura no sale, busca en los logs. El backend reintenta hasta 3 veces y
**nunca bloquea con el aviso** salvo error de red: si ves
`handleLectura: sin líneas tras 3 intentos`, casi siempre es la **clave o el saldo
de OpenAI** (revisa `OPENAI_API_KEY` y que la cuenta tenga crédito).

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| La lectura nunca sale / error 500 | Falta plan Blaze o falta `OPENAI_API_KEY` | Activa Blaze y set del secreto; redeploy functions |
| `Invalid project id` | No elegiste proyecto | `firebase use --add` |
| Cambié un secreto y no aplica | Los secretos se cargan al desplegar | `firebase deploy --only functions` |
| El formulario no guarda leads | Firestore no activado | Actívalo en la consola |
| No llega el correo | Falta login Google + SMTP | Es opcional; el flujo normal es WhatsApp |

---

## Resumen exprés (ya configurado)

```bash
firebase login            # una vez
firebase use --add        # una vez, elige tu proyecto
firebase functions:secrets:set OPENAI_API_KEY   # una vez (o al cambiarla)
firebase deploy           # cada vez que quieras publicar cambios
```
