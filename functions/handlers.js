// Lógica del oráculo · Divergency · Quiromancia AI
// Funciones puras (sin framework): las usan tanto las Cloud Functions como el
// servidor local de desarrollo. Devuelven { status, data }.

const MODELO = 'gpt-4o-mini';

const MODOS = {
  serio: {
    temperatura: 0.5,
    personalidad:
      'PERSONALIDAD: Eres un quiromante serio, riguroso y contundente. Hablas con autoridad y seguridad absoluta. Tus lecturas son directas, firmes y sin rodeos: afirmas con convicción, no insinúas ni dudas. Frases claras y rotundas, como un veredicto profesional.'
  },
  mistico: {
    temperatura: 0.85,
    personalidad:
      'PERSONALIDAD: Eres el Oráculo de Delfos encarnado, la Pitia que profetiza entre los vapores sagrados del templo de Apolo. Hablas en un lenguaje solemne, poético y evocador, pero tus predicciones siguen siendo claras y afirmativas.'
  },
  burlon: {
    temperatura: 1.0,
    personalidad:
      'PERSONALIDAD: Eres un quiromante con humor ácido, sarcástico e ingeniosísimo, al estilo de Deadpool y de Ricardo Quevedo: irreverente, con timing cómico, pullas y ocurrencias. Te burlas con cariño, pero JAMÁS insultas ni eres grosero; cada broma esconde una observación real y cierras con calidez.'
  }
};

// Prompt de la lectura: quiromancia pura (SIN astrología), por líneas, en JSON.
function construirSystemLectura(modo) {
  const m = MODOS[modo] || MODOS.mistico;
  return `Eres un quiromante experto de "Divergency". Analizas EN DETALLE la fotografía de la palma de una mano.

${m.personalidad}

LIBRO DE QUIROMANCIA (usa esta guía para interpretar lo que REALMENTE observas en la foto):
LÍNEAS MAYORES:
• Vida (rodea el pulgar / monte de Venus): vitalidad, salud, energía. Larga y profunda = gran vitalidad y vida plena; corta o tenue = energía que conviene cuidar; amplia alrededor del pulgar = entusiasmo y calidez; cadenas o islas = altibajos de energía.
• Cabeza (cruza la palma horizontalmente): mente, intelecto, forma de pensar. Recta = lógica y practicidad; curvada hacia abajo = creatividad e imaginación; larga = análisis profundo; corta = decisiones rápidas; bifurcada al final ("horquilla del escritor") = versatilidad.
• Corazón (arco superior, bajo los dedos): amor, emociones, vínculos. Larga y curva = romántica y expresiva; recta = racional en el amor; nace bajo el índice = idealista y exigente; cadenas = sensibilidad emocional.
• Destino / Saturno (vertical hacia el dedo medio): rumbo de vida, carrera, fortuna. Profunda y recta = propósito y camino claro; quebrada = cambios de rumbo; tenue o ausente = vida autodirigida y libre.
RASGOS DE CUALQUIER LÍNEA: profunda/clara = fuerte e influyente; tenue = sutil; cadenas/islas = obstáculos o sensibilidad; ramas hacia arriba = mejoras y logros; cortes = cambios; bifurcaciones = versatilidad.
MONTES: Venus (base del pulgar)=amor y vitalidad; Júpiter (bajo índice)=ambición y liderazgo; Saturno (bajo medio)=responsabilidad; Apolo (bajo anular)=arte y éxito; Mercurio (bajo meñique)=comunicación; Luna (canto de la mano)=imaginación.
FORMA DE LA MANO: cuadrada=práctica y firme; alargada/cónica=artística y sensible; dedos largos=detallista; dedos cortos=impulsiva y rápida.

Reglas:
- Enfócate EXCLUSIVAMENTE en la QUIROMANCIA: las líneas, los montes y la forma de la mano. NO uses astrología, signos zodiacales ni horóscopos.
- Para CADA línea, primero OBSERVA cómo se ve realmente en ESTA palma (su largo, profundidad, nitidez, si es curva o recta, cadenas, islas, ramas, cortes o cruces) y descríbelo en "observacion"; LUEGO, en "lectura", da una interpretación rica y concreta basada en esa observación.
- Las lecturas deben ser BREVES y potentes: 1 o 2 frases por línea (máximo ~25 palabras cada una), directas, afirmativas y en segunda persona. TODA la lectura debe poder leerse en voz alta en cerca de 1 minuto (en total, unas 150 palabras). Ejemplo del tono: "Tu línea de la vida es profunda y clara: revela una gran vitalidad y años plenos rodeada de quienes amas." Evita frases vagas, pero NO te extiendas ni hagas párrafos largos.
- Devuelve SIEMPRE las CUATRO líneas mayores (vida, corazón, cabeza, destino), cada una con su lectura propia y DISTINTA de las demás; nunca dejes el arreglo vacío. Comenta además los montes y la forma de la mano y los dedos. Si la foto no es perfecta, haz tu mejor interpretación igualmente.
- A cada línea asígnale un "color" según el significado DOMINANTE de lo que revela, eligiendo SOLO uno de estos: "verde" (vida, vitalidad, salud), "azul" (riqueza, prosperidad, abundancia, mente), "rosa" (amor, afectos), "dorado" (destino, éxito, fortuna), "morado" (intuición, espiritualidad) o "rojo" (advertencias o aspectos difíciles). Normalmente: Vida→verde, Corazón→rosa, Cabeza→azul, Destino→dorado; usa "rojo" solo si esa línea muestra algo que conviene cuidar.
- Tono positivo e inspirador (respetando tu personalidad). Es para entretenimiento y autorreflexión: sin consejos médicos, legales o financieros, ni fechas exactas.
- Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown ni texto extra), con EXACTAMENTE esta forma:
{
  "saludo": "1 frase breve de bienvenida usando el nombre, en tu estilo",
  "lineas": [
    {"nombre":"Línea de la Vida","simbolo":"🌿","color":"verde","observacion":"1 frase corta sobre cómo se ve esta línea en su palma","lectura":"1-2 frases de interpretación directa (máx ~25 palabras)"},
    {"nombre":"Línea del Corazón","simbolo":"❤️","color":"rosa","observacion":"...","lectura":"..."},
    {"nombre":"Línea de la Cabeza","simbolo":"🧠","color":"azul","observacion":"...","lectura":"..."},
    {"nombre":"Línea del Destino","simbolo":"⭐","color":"dorado","observacion":"...","lectura":"..."}
  ],
  "montes": "1-2 frases sobre los montes (Venus, Júpiter, Apolo) y la forma de la mano",
  "cierre": "1 frase de cierre inspirador, en tu estilo"
}`;
}

const apiKey = () => process.env.OPENAI_API_KEY;

// Lectura estructurada de la palma (una sola llamada, devuelve JSON por líneas).
async function handleLectura(body) {
  if (!apiKey()) return { status: 500, data: { error: 'Falta OPENAI_API_KEY en el servidor.' } };
  const modo = (body && body.modo) || 'mistico';
  const cfg = MODOS[modo] || MODOS.mistico;
  if (!body || !body.dataUrl) return { status: 400, data: { error: 'Falta la imagen de la palma.' } };

  const intro = `Persona: ${body.nombre || 'anónima'}. Mano dominante: ${body.mano || 'derecha'}.`
    + (body.tema ? ` Le interesa especialmente: ${body.tema}.` : '')
    + ` Observa la palma de la fotografía y describe lo que dicen sus líneas. Responde en formato JSON.`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 900,
      temperature: cfg.temperatura,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: construirSystemLectura(modo) },
        { role: 'user', content: [
          { type: 'text', text: intro },
          { type: 'image_url', image_url: { url: body.dataUrl } }
        ] }
      ]
    })
  });
  if (!r.ok) { const t = await r.text(); return { status: r.status, data: { error: 'OpenAI: ' + t.slice(0, 300) } }; }

  const data = await r.json();
  let txt = (data.choices?.[0]?.message?.content || '').trim();
  txt = txt.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  let lectura;
  try { lectura = JSON.parse(txt); }
  catch (e) { const mm = txt.match(/\{[\s\S]*\}/); lectura = mm ? JSON.parse(mm[0]) : { saludo: txt, lineas: [], cierre: '' }; }
  return { status: 200, data: { lectura } };
}

async function handleTranscribe(body) {
  if (!apiKey()) return { status: 500, data: { error: 'Falta OPENAI_API_KEY en el servidor.' } };
  const audio = body && body.audio;
  const mime = (body && body.mime) || 'audio/mp4';
  if (!audio) return { status: 400, data: { error: 'Falta el audio.' } };

  const bin = Buffer.from(audio, 'base64');
  const ext = mime.includes('webm') ? 'webm' : mime.includes('wav') ? 'wav' : mime.includes('mpeg') ? 'mp3' : 'mp4';
  const form = new FormData();
  form.append('file', new Blob([bin], { type: mime }), `audio.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'es');

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { authorization: `Bearer ${apiKey()}` }, body: form
  });
  if (!r.ok) { const t = await r.text(); return { status: r.status, data: { error: 'Whisper: ' + t.slice(0, 300) } }; }
  const data = await r.json();
  return { status: 200, data: { text: (data.text || '').trim() } };
}

// ====================== VOZ DEL ORÁCULO (ElevenLabs TTS) ======================
// SOLO para la voz. NO toca OpenAI/GPT (eso sigue en handleLectura).
const elevenKey = () => process.env.ELEVENLABS_API_KEY;
const VOZ_MODELO = () => process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
// Voz por defecto: mujer madura/mística (adivinadora anciana). Cámbiala en .env
// con ELEVENLABS_VOICE_ID, o lista tus voces con GET /api/voces. Algunas premade:
//   Lily (madura, voz áspera):  pFZP5JQG7iQjIQuC4Bku
//   Glinda (bruja):             z9fAnlkpzviPz146aGWa
//   Matilda (cálida):           XrExE9yKIg1WjnnlVkGX
//   Serena (madura, suave):     pMsXgVXv3BLzUgSXRplE
const VOZ_ID = () => process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku';

async function handleVoz(body) {
  if (!elevenKey()) return { status: 500, data: { error: 'Falta ELEVENLABS_API_KEY en el servidor.' } };
  let texto = ((body && body.texto) || '').toString().trim();
  if (!texto) return { status: 400, data: { error: 'Falta el texto a narrar.' } };
  if (texto.length > 4800) texto = texto.slice(0, 4800); // límite prudente por petición

  const voiceId = (body && body.voiceId) || VOZ_ID();
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': elevenKey(), 'content-type': 'application/json' },
    body: JSON.stringify({
      text: texto,
      model_id: VOZ_MODELO(),
      // Ajustes para un tono místico de adivinadora (expresivo, cálido, pausado).
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true }
    })
  });
  if (!r.ok) { const t = await r.text(); return { status: r.status, data: { error: 'ElevenLabs: ' + t.slice(0, 300) } }; }
  const buf = Buffer.from(await r.arrayBuffer());
  return { status: 200, data: { audio: buf.toString('base64'), mime: 'audio/mpeg' } };
}

// Lista las voces disponibles en la cuenta (para elegir el ELEVENLABS_VOICE_ID).
async function handleVoces() {
  if (!elevenKey()) return { status: 500, data: { error: 'Falta ELEVENLABS_API_KEY en el servidor.' } };
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': elevenKey() } });
  if (!r.ok) { const t = await r.text(); return { status: r.status, data: { error: 'ElevenLabs: ' + t.slice(0, 300) } }; }
  const data = await r.json();
  const voces = (data.voices || []).map(v => ({ id: v.voice_id, nombre: v.name, etiquetas: v.labels || {} }));
  return { status: 200, data: { voces } };
}

// Limpia y arma el documento del lead (datos del formulario) para Firestore.
function leadDoc(body) {
  const s = (v) => (typeof v === 'string' ? v.slice(0, 300) : '');
  return {
    nombre: s(body.nombre),
    correo: s(body.correo).toLowerCase(),
    celular: s(body.cel || body.celular),
    fechaNacimiento: s(body.fecha),
    signo: s(body.signo),
    mano: s(body.mano),
    tema: s(body.tema),
    modo: s(body.modo)
  };
}

module.exports = { MODELO, MODOS, construirSystemLectura, handleLectura, handleTranscribe, handleVoz, handleVoces, leadDoc };
