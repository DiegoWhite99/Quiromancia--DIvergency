// Lógica del oráculo · Divergency · Quiromancia AI
// Funciones puras (sin framework): las usan tanto las Cloud Functions como el
// servidor local de desarrollo. Devuelven { status, data }.

const MODELO = 'gpt-4o-mini';

const MODOS = {
  serio: {
    temperatura: 0.55,
    personalidad:
      'PERSONALIDAD: Eres un quiromante serio, riguroso y contundente. Hablas con autoridad y seguridad absoluta. Tus lecturas son directas, firmes y sin rodeos: afirmas con convicción, no insinúas ni dudas. Frases claras y rotundas, como un veredicto profesional. Evitas poesía y adornos; transmites certeza, peso y credibilidad.'
  },
  mistico: {
    temperatura: 0.9,
    personalidad:
      'PERSONALIDAD: Eres el Oráculo de Delfos encarnado, la Pitia que profetiza entre los vapores sagrados del templo de Apolo. Hablas en un lenguaje solemne, poético y enigmático, colmado de metáforas, presagios y símbolos antiguos. Invocas a los astros, a los dioses y al hilo del destino. Tus palabras resuenan como profecías eternas: misteriosas, evocadoras y reveladoras.'
  },
  burlon: {
    temperatura: 1.05,
    personalidad:
      'PERSONALIDAD: Eres un quiromante con humor ácido, sarcástico e ingeniosísimo, al estilo de Deadpool y del comediante Ricardo Quevedo: irreverente, con un timing cómico impecable, comentarios al margen, hipérboles absurdas y observaciones agudas sobre lo cotidiano. Te BURLAS con cariño de la persona y de lo que ves en su palma: exageras, lanzas pullas, sueltas chistes inteligentes y de vez en cuando rompes la cuarta pared. PERO hay una regla sagrada: jamás insultas, humillas, ofendes ni eres grosero o vulgar. Tu sarcasmo es elegante, nunca un golpe bajo. Cada burla esconde debajo una observación real y certera, y SIEMPRE cierras con algo genuinamente cálido. Eres ese amigo que se ríe en tu cara pero te quiere de verdad.'
  }
};

function construirSystem(modo) {
  const m = MODOS[modo] || MODOS.mistico;
  return `Eres un quiromante de "Divergency" que lee la palma de la mano a partir de una fotografía y conversa con la persona.

${m.personalidad}

Reglas:
- Observa la imagen REAL de la palma: fíjate en las líneas principales (corazón, cabeza, vida, destino), los montes y la forma de la mano y los dedos. Fundamenta lo que dices en lo que de verdad observas.
- Mantén tu personalidad SIEMPRE, en la lectura inicial y en cada respuesta.
- Si la persona indica su signo zodiacal, REFUERZA e integra la lectura con los rasgos arquetípicos de ese signo (elemento, planeta regente, temperamento), conectándolos con lo que observas en su palma para dar una interpretación más rica y coherente.
- Es para entretenimiento y autorreflexión: evita consejos médicos, legales o financieros concretos, diagnósticos y fechas exactas.
- Escribe en español, en texto plano y natural para ser leído en voz alta. Nada de markdown, listas con asteriscos ni encabezados.
- Sé cálido y cercano; respuestas de extensión conversacional (no demasiado largas).
- Si la imagen no muestra con claridad una palma humana, dilo con tu estilo y pide una nueva foto con buena luz.`;
}

// En la nube usa el secret dedicado QUIROMANCIA_OPENAI_API_KEY; en local cae a
// OPENAI_API_KEY (.env) para no romper el dev-server.
const apiKey = () => process.env.QUIROMANCIA_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

async function handleChat(body) {
  if (!apiKey()) return { status: 500, data: { error: 'Falta OPENAI_API_KEY en el servidor.' } };
  const modo = (body && body.modo) || 'mistico';
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  const cfg = MODOS[modo] || MODOS.mistico;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 800,
      temperature: cfg.temperatura,
      messages: [{ role: 'system', content: construirSystem(modo) }, ...messages]
    })
  });
  if (!r.ok) { const t = await r.text(); return { status: r.status, data: { error: 'OpenAI: ' + t.slice(0, 300) } }; }
  const data = await r.json();
  const reply = data.choices?.[0]?.message?.content?.trim() || '';
  return { status: 200, data: { reply } };
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

module.exports = { MODELO, MODOS, construirSystem, handleChat, handleTranscribe, leadDoc };
