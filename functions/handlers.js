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

Reglas:
- Enfócate EXCLUSIVAMENTE en la QUIROMANCIA: las líneas, los montes y la forma de la mano. NO uses astrología, signos zodiacales ni horóscopos.
- Para CADA línea, primero OBSERVA cómo se ve realmente en ESTA palma (su largo, profundidad, nitidez, si es curva o recta, cadenas, islas, ramas, cortes o cruces) y descríbelo en "observacion"; LUEGO, en "lectura", da una interpretación rica y concreta basada en esa observación.
- Las lecturas deben ser GENEROSAS y detalladas: de 4 a 6 frases por línea, directas y afirmativas, en segunda persona. Ejemplo del nivel esperado: "Tu línea de la vida es larga, profunda y bien trazada, lo que revela una enorme vitalidad y energía; vas a tener una vida larga y plena, con la fuerza para superar cualquier obstáculo y disfrutar de muchos años hermosos rodeada de quienes amas." NUNCA frases vagas ni de una sola oración.
- Devuelve SIEMPRE las CUATRO líneas mayores (vida, corazón, cabeza, destino), cada una con su lectura propia y DISTINTA de las demás; nunca dejes el arreglo vacío. Comenta además los montes y la forma de la mano y los dedos. Si la foto no es perfecta, haz tu mejor interpretación igualmente.
- A cada línea asígnale un "color" según el significado DOMINANTE de lo que revela, eligiendo SOLO uno de estos: "verde" (vida, vitalidad, salud), "azul" (riqueza, prosperidad, abundancia, mente), "rosa" (amor, afectos), "dorado" (destino, éxito, fortuna), "morado" (intuición, espiritualidad) o "rojo" (advertencias o aspectos difíciles). Normalmente: Vida→verde, Corazón→rosa, Cabeza→azul, Destino→dorado; usa "rojo" solo si esa línea muestra algo que conviene cuidar.
- Tono positivo e inspirador (respetando tu personalidad). Es para entretenimiento y autorreflexión: sin consejos médicos, legales o financieros, ni fechas exactas.
- Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown ni texto extra), con EXACTAMENTE esta forma:
{
  "saludo": "1-2 frases de bienvenida usando el nombre, en tu estilo",
  "lineas": [
    {"nombre":"Línea de la Vida","simbolo":"🌿","color":"verde","observacion":"1-2 frases sobre cómo se ve esta línea en su palma","lectura":"4-6 frases de interpretación directa y detallada"},
    {"nombre":"Línea del Corazón","simbolo":"❤️","color":"rosa","observacion":"...","lectura":"..."},
    {"nombre":"Línea de la Cabeza","simbolo":"🧠","color":"azul","observacion":"...","lectura":"..."},
    {"nombre":"Línea del Destino","simbolo":"⭐","color":"dorado","observacion":"...","lectura":"..."}
  ],
  "montes": "1 párrafo (3-5 frases) sobre los montes (Venus, Júpiter, Apolo, etc.) y la forma de la mano y los dedos",
  "cierre": "2-3 frases de cierre inspirador, en tu estilo"
}`;
}

// En la nube usa el secret dedicado QUIROMANCIA_OPENAI_API_KEY; en local cae a
// OPENAI_API_KEY (.env) para no romper el dev-server.
const apiKey = () => process.env.QUIROMANCIA_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

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
      max_tokens: 2200,
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

module.exports = { MODELO, MODOS, construirSystemLectura, handleLectura, handleTranscribe, leadDoc };
