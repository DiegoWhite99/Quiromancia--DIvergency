// Cloud Functions (2ª gen) · Divergency · Quiromancia AI
// Expone /api/chat, /api/transcribe, /api/lead y /api/enviar a través de Hosting.

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const express = require('express');
const nodemailer = require('nodemailer');

const h = require('./handlers');

admin.initializeApp();
const db = admin.firestore();

// Secretos (se configuran con: firebase functions:secrets:set NOMBRE)
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const SMTP_USER = defineSecret('SMTP_USER'); // p.ej. tucorreo@gmail.com
const SMTP_PASS = defineSecret('SMTP_PASS'); // contraseña de aplicación de Gmail

const app = express();
app.use(express.json({ limit: '12mb' }));

const router = express.Router();

router.post('/lectura', async (req, res) => {
  try { const r = await h.handleLectura(req.body || {}); res.status(r.status).json(r.data); }
  catch (e) { logger.error('lectura', e); res.status(500).json({ error: e.message }); }
});

router.post('/transcribe', async (req, res) => {
  try { const r = await h.handleTranscribe(req.body || {}); res.status(r.status).json(r.data); }
  catch (e) { logger.error('transcribe', e); res.status(500).json({ error: e.message }); }
});

// Guarda los datos del formulario (lead) en Firestore.
router.post('/lead', async (req, res) => {
  try {
    const doc = h.leadDoc(req.body || {});
    if (!doc.correo) return res.status(400).json({ error: 'Falta el correo.' });
    doc.createdAt = admin.firestore.FieldValue.serverTimestamp();
    doc.userAgent = (req.headers['user-agent'] || '').slice(0, 200);
    const ref = await db.collection('leads').add(doc);
    res.json({ ok: true, id: ref.id });
  } catch (e) { logger.error('lead', e); res.status(500).json({ error: e.message }); }
});

// Envía la predicción al correo del usuario tras iniciar sesión con Google.
router.post('/enviar', async (req, res) => {
  try {
    const { idToken, prediccion, modo } = req.body || {};
    if (!idToken) return res.status(401).json({ error: 'Falta autenticación.' });
    if (!prediccion) return res.status(400).json({ error: 'No hay predicción para enviar.' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const correo = decoded.email;
    const nombre = decoded.name || req.body.nombre || 'Viajero';
    if (!correo) return res.status(400).json({ error: 'La cuenta de Google no tiene correo.' });

    // Registro de la solicitud (sirve aunque el correo no esté configurado).
    await db.collection('predicciones_enviadas').add({
      uid: decoded.uid, correo, nombre, modo: (modo || ''),
      prediccion: String(prediccion).slice(0, 8000),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Envío del correo (si hay SMTP configurado). Si falla, no rompe el flujo:
    // la solicitud ya quedó registrada arriba en Firestore.
    const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
    if (user && pass && pass.length > 6) {
      try {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
        const html = `
          <div style="font-family:Georgia,serif;background:#0e0e52;color:#EDECFF;padding:28px;border-radius:16px">
            <p style="color:#EBC878;letter-spacing:.3em;font-size:12px;text-transform:uppercase">Divergency · Quiromancia AI</p>
            <h2 style="color:#fff">Tu lectura, ${nombre}</h2>
            <div style="white-space:pre-wrap;line-height:1.6;font-family:Arial,sans-serif;font-size:15px">${String(prediccion).replace(/</g,'&lt;')}</div>
            <p style="color:#A9A8D8;font-size:12px;margin-top:24px">Modelo experimental · Solo para entretenimiento.</p>
          </div>`;
        await transporter.sendMail({
          from: `"Divergency · Quiromancia" <${user}>`,
          to: correo,
          subject: '🔮 Tu predicción de Quiromancia AI',
          html
        });
        return res.json({ ok: true, correo, enviado: true });
      } catch (mailErr) {
        logger.error('sendMail', mailErr);
        return res.json({ ok: true, correo, enviado: false, nota: 'Registrada; el correo no pudo enviarse (revisa SMTP).' });
      }
    }

    // Sin SMTP: queda registrada en Firestore para enviar luego.
    res.json({ ok: true, correo, enviado: false, nota: 'Solicitud registrada (SMTP no configurado).' });
  } catch (e) { logger.error('enviar', e); res.status(500).json({ error: e.message }); }
});

app.use('/api', router);
app.use('/', router);

exports.api = onRequest(
  { region: 'us-central1', cors: true, timeoutSeconds: 60, memory: '512MiB',
    secrets: [OPENAI_API_KEY, SMTP_USER, SMTP_PASS] },
  app
);
