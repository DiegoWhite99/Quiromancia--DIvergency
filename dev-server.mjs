// Servidor de desarrollo local · Divergency · Quiromancia AI
// Replica la estructura de Firebase: sirve /public y enruta /api/* a la misma
// lógica de functions/handlers.js. Los endpoints /lead y /enviar se simulan
// localmente (guardan en archivos .local.json; no envían correo real).
//   Uso:  node dev-server.mjs   →   http://localhost:3000   (la clave se lee de .env)

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handlers = require('./functions/handlers.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

// --- Cargar .env ---
if (existsSync(join(__dirname, '.env'))) {
  const txt = await readFile(join(__dirname, '.env'), 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const TIPOS = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.m4a':'audio/mp4',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.ico':'image/x-icon' };

function enviar(res, status, obj) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(obj));
}
async function leerBody(req) { let raw = ''; for await (const c of req) raw += c; try { return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
async function guardarLocal(doc, file) {
  const ruta = join(__dirname, file);
  let arr = [];
  if (existsSync(ruta)) { try { arr = JSON.parse(await readFile(ruta, 'utf8')); } catch { arr = []; } }
  arr.push(doc);
  await writeFile(ruta, JSON.stringify(arr, null, 2));
}

// Blindaje: un fallo de red (p. ej. ECONNRESET hacia OpenAI/ElevenLabs) NO debe
// tumbar el servidor. Registramos y seguimos vivos.
process.on('unhandledRejection', (e) => console.error('⚠ unhandledRejection:', (e && e.message) || e));
process.on('uncaughtException', (e) => console.error('⚠ uncaughtException:', (e && e.message) || e));

const server = createServer(async (req, res) => {
 try {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const ruta = url.pathname;

  // ---- API ----
  if (req.method === 'POST' && ruta === '/api/lectura') {
    const r = await handlers.handleLectura(await leerBody(req)); return enviar(res, r.status, r.data);
  }
  if (req.method === 'POST' && ruta === '/api/transcribe') {
    const r = await handlers.handleTranscribe(await leerBody(req)); return enviar(res, r.status, r.data);
  }
  if (req.method === 'POST' && ruta === '/api/voz') {
    const r = await handlers.handleVoz(await leerBody(req)); return enviar(res, r.status, r.data);
  }
  if (req.method === 'GET' && ruta === '/api/voces') {
    const r = await handlers.handleVoces(); return enviar(res, r.status, r.data);
  }
  if (req.method === 'POST' && ruta === '/api/lead') {
    const doc = handlers.leadDoc(await leerBody(req)); doc.createdAt = new Date().toISOString();
    await guardarLocal(doc, 'leads.local.json'); return enviar(res, 200, { ok: true, local: true });
  }
  if (req.method === 'POST' && ruta === '/api/enviar') {
    const body = await leerBody(req);
    await guardarLocal({ correo: body.email || '', nombre: body.nombre || '', prediccion: String(body.prediccion || '').slice(0, 600), at: new Date().toISOString() }, 'predicciones.local.json');
    return enviar(res, 200, { ok: true, correo: body.email || '', enviado: false, nota: 'Local: registrado (sin correo real).' });
  }

  // ---- Estáticos desde /public ----
  const archivo = ruta === '/' ? '/index.html' : ruta;
  const full = join(PUBLIC, archivo);
  if (!full.startsWith(PUBLIC) || !existsSync(full)) { res.statusCode = 404; return res.end('No encontrado'); }
  try {
    const data = await readFile(full);
    res.setHeader('content-type', TIPOS[extname(full)] || 'application/octet-stream');
    // En desarrollo NO cacheamos el HTML/JS: así el navegador siempre carga la
    // última versión y no hace falta el "refresco forzado" tras cada cambio.
    if (['.html', '.js'].includes(extname(full))) res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.end(data);
  } catch { res.statusCode = 500; res.end('Error'); }
 } catch (e) {
  // Cualquier error de una petición se responde como 500 y el servidor SIGUE vivo.
  console.error('dev-server error:', (e && e.message) || e);
  try { if (!res.headersSent) enviar(res, 500, { error: 'Error interno del servidor de desarrollo.' }); else res.end(); } catch (_) {}
 }
});

server.listen(PORT, () => {
  console.log(`\n  🔮 Quiromancia AI · Divergency  (dev, estructura Firebase)`);
  console.log(`  Local: http://localhost:${PORT}`);
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'cargada ✓' : 'NO encontrada ✗ (revisa .env)'}`);
  console.log(`  ELEVENLABS_API_KEY: ${process.env.ELEVENLABS_API_KEY ? 'cargada ✓' : 'NO encontrada ✗ (voz usará el navegador)'}`);
  console.log(`  Leads → leads.local.json · Predicciones → predicciones.local.json\n`);
});
