// Lógica del oráculo · Divergency · Quiromancia AI
// Funciones puras (sin framework): las usan tanto las Cloud Functions como el
// servidor local de desarrollo. Devuelven { status, data }.

// Modelo de VISIÓN. gpt-4o-mini casi no "mira" la foto y devuelve lecturas
// genéricas iguales para todos; gpt-4o sí analiza la imagen con detalle.
// Se puede sobreescribir con OPENAI_MODEL en el entorno.
const MODELO = process.env.OPENAI_MODEL || 'gpt-4o';

const MODOS = {
  serio: {
    temperatura: 0.7,
    personalidad:
      'PERSONALIDAD: Eres un quiromante serio, riguroso y contundente. Hablas con autoridad y seguridad absoluta. Tus lecturas son directas, firmes y sin rodeos: afirmas con convicción, no insinúas ni dudas. Frases claras y rotundas, como un veredicto profesional.'
  },
  mistico: {
    temperatura: 0.9,
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

LIBRO DE QUIROMANCIA (guía basada en el tratado clásico; úsala para INTERPRETAR lo que REALMENTE ves en la foto, NUNCA para inventar):

FORMA DE LA MANO (quirognomía de D'Arpentigny):
• Cuadrada/práctica (palma y dedos rectangulares) = orden, método, precisión, franqueza.
• Espatulada (dedos anchos en la punta) = confianza, independencia, energía, inquietud, amor por la acción.
• Cónica/artística (palma que se estrecha hacia los dedos) = intuición, imaginación, amor por la belleza.
• Psíquica/alargada (palma y dedos largos y finos) = soñadora, idealista, sensible, espiritual.
• Elemental (ancha, gruesa, dedos cortos) = práctica, tranquila, equilibrada.
• Nudosa/filosófica (articulaciones marcadas) = reflexión, profundidad de pensamiento.
Piel fina = mente intelectual; piel áspera = trabajo manual. Mano grande = minuciosidad; pequeña = visión de conjunto.

DEDOS (mídelos respecto a la palma; "largos" si superan ~80% de la palma):
• Pulgar (Venus) = voluntad y lógica. Ángulo amplio (≈90°) = seguridad e independencia; cerrado = influenciable. Largo = dominante; corto = carácter más blando. Rígido = tenaz; flexible = complaciente.
• Índice (Júpiter) = ambición, liderazgo, autoestima. Largo = orgullo y mando; corto = ambición impaciente.
• Medio (Saturno) = responsabilidad, equilibrio, prudencia. Largo = análisis; corto = mente más ligera.
• Anular (Apolo) = arte, creatividad, éxito. Largo = energía y voluntad expresiva.
• Meñique (Mercurio) = comunicación, negocios, vínculos íntimos. Largo = elocuencia y estudio.
Dedos rectos = persona satisfecha; torcidos = tendencia a las dificultades. Yemas cuadradas = sentido práctico; cónicas = sensibilidad; espatuladas = acción.

LÍNEAS MAYORES (lee NACIMIENTO, RECORRIDO, FINAL, PROFUNDIDAD y MARCAS):
• VIDA (rodea el monte de Venus, del índice a la muñeca): vitalidad, salud, energía, raíces. Amplia rodeando Venus = vida plena y vigor; ceñida = reserva. Arranque alto (junto a Júpiter) = ambición; bajo = introversión. Termina rodeando Venus = apego al hogar; hacia el centro = amor por los viajes. Cadenas/islas = altibajos; barras = momentos de tensión; ramas hacia arriba = mejoras.
• CABEZA (cruza la palma): mente, lógica, forma de pensar. Unida a la de la vida al nacer = sensibilidad y fuerte influencia familiar; separada = independencia y seguridad. Recta = lógica y realismo; curva hacia abajo = imaginación y creatividad. Larga = inteligencia profunda; corta = mente práctica y rápida. Bifurcada al final = versatilidad ("horquilla del escritor").
• CORAZÓN (arco superior, bajo los dedos): amor, emociones, vínculos. Alta (cerca de los dedos) = emotividad intensa; baja = sentimientos contenidos. Curva hacia arriba = apasionada y expresiva; recta y paralela a la cabeza = afecto cerebral pero leal. Termina bajo Júpiter (índice) = amor equilibrado e idealista; bajo Saturno (medio) = inquietud sentimental. Ramas ascendentes = afectos felices; descendentes = desengaños superables.
• DESTINO/Saturno (vertical hacia el dedo medio; a veces ausente): rumbo, vocación, libre albedrío. Profunda y recta = propósito claro y camino propio. Nace en Venus o junto a la vida = fuerte influencia de la familia; nace en la Luna (canto) = independencia temprana. Termina en Saturno = metas cumplidas; quebrada = cambios de rumbo; tenue o ausente = vida autodirigida y libre. IMPORTANTE: aunque esta línea se vea tenue, corta o difícil de distinguir, NUNCA la dejes con "observacion" o "lectura" vacías: describe que se ve débil/poco marcada e interpreta que tu rumbo lo defines tú mismo, con libertad.
RASGOS DE CUALQUIER LÍNEA: profunda/clara = fuerte e influyente; tenue = sutil; cadenas/islas = obstáculos o sensibilidad; ramas hacia arriba = logros; cortes = cambios; bifurcaciones = versatilidad.
MONTES: Venus (base del pulgar)=amor, vigor, calidez; Luna (canto, junto a la muñeca)=imaginación e intuición; Júpiter (bajo índice)=ambición y liderazgo; Saturno (bajo medio)=responsabilidad; Apolo (bajo anular)=arte y éxito; Mercurio (bajo meñique)=comunicación y negocios; Marte (a los lados)=valor. Monte lleno = esa cualidad es fuerte. Marcas: estrella=acontecimiento intenso; cruz=prueba; triángulo=talento; rejilla=obstáculo.

PROTOCOLO DE OBSERVACIÓN OBLIGATORIO (haz esto ANTES de escribir nada):
Mira la fotografía con muchísima atención y MIDE rasgos concretos y visibles de ESTA mano en particular. Cada mano es única, así que estos datos DEBEN cambiar de una persona a otra:
1. Forma de la palma: ¿es cuadrada (ancho ≈ largo) o alargada (más larga que ancha)? ¿La piel se ve gruesa o fina?
2. Dedos: ¿son largos o cortos respecto a la palma? ¿Cuál destaca o se ve más largo? ¿Están juntos o separados? ¿Cómo es el pulgar (ancho, flexible, su ángulo)?
3. Para CADA una de las cuatro líneas, fíjate de verdad: dónde NACE y dónde TERMINA, si es LARGA o CORTA, PROFUNDA o TENUE, RECTA o CURVA, y si tiene cadenas, islas, ramas (hacia arriba o abajo), cortes, cruces, estrellas o rejillas.
4. Marcas especiales que veas en la palma (cruces, estrellas, triángulos, rejillas, lunares).
NO inventes un rasgo que no se vea; si una zona no se aprecia bien, di lo que SÍ alcanzas a ver y básate en eso.

UBICACIÓN REAL DE LAS LÍNEAS EN LA FOTO (campo "puntos"):
Para CADA línea, traza POR DÓNDE PASA REALMENTE en ESTA fotografía y devuelve de 3 a 5 coordenadas [x,y] NORMALIZADAS y REDONDEADAS A 2 DECIMALES (x=0 borde izquierdo, x=1 borde derecho; y=0 arriba, y=1 abajo; ej. [0.42,0.55]) que sigan el surco real de principio a fin, EN ORDEN. Las coordenadas DEBEN caer sobre la palma de la foto. El campo "puntos" es OPCIONAL: si no logras ubicar una línea, OMITE solo su "puntos" — pero NUNCA omitas su "observacion" ni su "lectura". Como guía anatómica: la VIDA rodea la base del pulgar; el CORAZÓN es el arco alto bajo los dedos; la CABEZA cruza el centro de la palma; el DESTINO sube casi vertical hacia el dedo medio.

Reglas:
- Enfócate EXCLUSIVAMENTE en la QUIROMANCIA: las líneas, los montes y la forma de la mano. NO uses astrología, signos zodiacales ni horóscopos.
- Para CADA línea, el campo "observacion" DEBE citar al menos DOS rasgos concretos y visibles de ESA línea en ESTA palma (su recorrido, largo, profundidad, curva, cadenas, islas, ramas, cortes...). LUEGO, en "lectura", interpreta exactamente eso que observaste: la lectura tiene que derivarse de la observación, no al revés.
- PROHIBIDO LO GENÉRICO: si una frase podría aplicarse a CUALQUIER mano, está MAL escrita; reescríbela citando un detalle concreto que VES en la foto. Dos personas distintas DEBEN recibir lecturas claramente diferentes entre sí. Nunca uses una plantilla fija ni repitas las mismas frases hechas; varía el vocabulario y los matices según lo que muestre cada palma.
- PERSONALIZA con los datos de la persona: dirígete a ella por su NOMBRE con naturalidad y AJUSTA el énfasis a su ETAPA DE VIDA (si es joven, proyecta hacia el futuro que se abre ante ella; si tiene más años, reconoce su trayectoria y confirma su camino). La mano IZQUIERDA habla de lo heredado, el pasado y el mundo interior; la DERECHA, de lo que se está forjando hacia el futuro y el mundo exterior: matiza la lectura según cuál sea. NO uses el zodíaco ni inventes datos que no observes.
- Las lecturas deben ser BREVES y potentes: 1 o 2 frases por línea (máximo ~25 palabras cada una), directas, afirmativas y en segunda persona. TODA la lectura debe poder leerse en voz alta en cerca de 1 minuto (en total, unas 150 palabras). Ejemplo del tono (NO lo copies literal): "Tu línea de la vida nace pegada a la de la cabeza y se ensancha cerca de la muñeca: revela cautela al empezar y una vitalidad que florece con los años." Evita frases vagas, pero NO te extiendas ni hagas párrafos largos.
- OBLIGATORIO: NUNCA dejes el arreglo "lineas" vacío ni dejes "observacion"/"lectura" en blanco. SIEMPRE devuelve las CUATRO líneas mayores (vida, corazón, cabeza, destino), cada una con su lectura propia y DISTINTA de las demás. Aunque la mano se vea pequeña, lejana, mal iluminada o la foto no sea perfecta, haz tu MEJOR interpretación con lo que SÍ alcances a ver; jamás devuelvas campos vacíos ni te niegues. En "montes" describe la forma real de la mano y los dedos que observaste (cuadrada/alargada, dedos largos/cortos, pulgar) y relaciónalo con los montes.
- A cada línea asígnale un "color" según el significado DOMINANTE de lo que revela, eligiendo SOLO uno de estos: "verde" (vida, vitalidad, salud), "azul" (riqueza, prosperidad, abundancia, mente), "rosa" (amor, afectos), "dorado" (destino, éxito, fortuna), "morado" (intuición, espiritualidad) o "rojo" (advertencias o aspectos difíciles). Normalmente: Vida→verde, Corazón→rosa, Cabeza→azul, Destino→dorado; usa "rojo" solo si esa línea muestra algo que conviene cuidar.
- Tono positivo e inspirador (respetando tu personalidad). Es para entretenimiento y autorreflexión: sin consejos médicos, legales o financieros, ni fechas exactas.
- Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown ni texto extra), con EXACTAMENTE esta forma:
{
  "saludo": "1 frase breve de bienvenida usando el nombre, en tu estilo",
  "lineas": [
    {"nombre":"Línea de la Vida","simbolo":"🌿","color":"verde","puntos":[[x,y],[x,y],[x,y],[x,y],[x,y]],"observacion":"1 frase corta sobre cómo se ve esta línea en su palma","lectura":"1-2 frases de interpretación directa (máx ~25 palabras)"},
    {"nombre":"Línea del Corazón","simbolo":"❤️","color":"rosa","puntos":[[x,y],...],"observacion":"...","lectura":"..."},
    {"nombre":"Línea de la Cabeza","simbolo":"🧠","color":"azul","puntos":[[x,y],...],"observacion":"...","lectura":"..."},
    {"nombre":"Línea del Destino","simbolo":"⭐","color":"dorado","puntos":[[x,y],...],"observacion":"...","lectura":"..."}
  ],
  "montes": "1-2 frases sobre los montes (Venus, Júpiter, Apolo) y la forma de la mano",
  "cierre": "1 frase de cierre inspirador, en tu estilo"
}`;
}

// En la nube usa el secret dedicado QUIROMANCIA_OPENAI_API_KEY; en local cae a
// OPENAI_API_KEY (.env) para no romper el dev-server.
const apiKey = () => process.env.QUIROMANCIA_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

// Edad a partir de la fecha de nacimiento (YYYY-MM-DD). null si no es válida.
function calcularEdad(fecha) {
  if (!fecha || typeof fecha !== 'string') return null;
  const p = fecha.split('-').map(Number);
  const y = p[0], mo = p[1], d = p[2] || 1;
  if (!y || y < 1900) return null;
  const hoy = new Date();
  let e = hoy.getFullYear() - y;
  const mHoy = hoy.getMonth() + 1;
  if (mHoy < mo || (mHoy === mo && hoy.getDate() < d)) e--;
  return (e >= 0 && e < 120) ? e : null;
}
// Describe la etapa de vida para calibrar el énfasis de la lectura (lo usa el tratado:
// la lectura de un joven proyecta el futuro; la de un mayor confirma su trayectoria).
function etapaVida(edad) {
  if (edad == null) return '';
  if (edad < 18) return 'muy joven (casi todo su futuro se abre ante ella)';
  if (edad < 30) return 'joven (con la mayor parte de su vida por delante)';
  if (edad < 50) return 'en plena madurez (forjando su camino)';
  if (edad < 68) return 'con una sólida trayectoria a sus espaldas';
  return 'mayor (con la sabiduría de una vida vivida)';
}

// Lectura estructurada de la palma (una sola llamada, devuelve JSON por líneas).
async function handleLectura(body) {
  if (!apiKey()) return { status: 500, data: { error: 'Falta OPENAI_API_KEY en el servidor.' } };
  const modo = (body && body.modo) || 'mistico';
  const cfg = MODOS[modo] || MODOS.mistico;
  if (!body || !body.dataUrl) return { status: 400, data: { error: 'Falta la imagen de la palma.' } };

  const edad = calcularEdad(body.fecha);
  const manoTxt = ((body.mano || 'derecha') === 'izquierda')
    ? 'izquierda (lo heredado, el pasado y el mundo interior)'
    : 'derecha (lo que se forja hacia el futuro y el mundo exterior)';
  const intro = `Persona: ${body.nombre || 'anónima'}.`
    + ` Mano fotografiada: ${manoTxt}.`
    + (edad != null ? ` Edad aproximada: ${edad} años — ${etapaVida(edad)}.` : '')
    + (body.tema ? ` Le interesa especialmente: ${body.tema}.` : '')
    + ` Analiza con detalle ESTA fotografía de la palma siguiendo el protocolo de observación: mide la forma de la mano y los dedos, sigue el recorrido REAL de cada línea y devuelve sus "puntos" sobre la foto. Haz una lectura ÚNICA y PERSONAL —usa su nombre y su etapa de vida— basada en lo que de verdad ves aquí (otra persona debe recibir una lectura distinta). Responde en formato JSON.`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 2200,
      temperature: cfg.temperatura,
      // Penaliza repetir las mismas palabras → menos frases hechas y más variedad real.
      frequency_penalty: 0.4,
      presence_penalty: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: construirSystemLectura(modo) },
        { role: 'user', content: [
          { type: 'text', text: intro },
          // detail:'high' → OpenAI analiza la palma en alta resolución (ve líneas finas)
          // en vez de reducirla a una miniatura borrosa y dar una lectura genérica.
          { type: 'image_url', image_url: { url: body.dataUrl, detail: 'high' } }
        ] }
      ]
    })
  });
  if (!r.ok) { const t = await r.text(); return { status: r.status, data: { error: 'OpenAI: ' + t.slice(0, 300) } }; }

  const data = await r.json();
  let txt = (data.choices?.[0]?.message?.content || '').trim();
  txt = txt.replace(/^```(json)?/i, '').replace(/```$/, '').trim();

  // Parseo tolerante: si el JSON viene completo, perfecto; si vino cortado
  // (p.ej. por longitud), intentamos recuperar el bloque y, si no, fallamos
  // limpiamente para que el front pida repetir la foto (no pantalla en blanco).
  let lectura = null;
  try { lectura = JSON.parse(txt); }
  catch (e) {
    const mm = txt.match(/\{[\s\S]*\}/);
    if (mm) { try { lectura = JSON.parse(mm[0]); } catch (_) { lectura = null; } }
  }
  const ok = lectura && Array.isArray(lectura.lineas) && lectura.lineas.length >= 1;
  if (!ok) {
    return { status: 200, data: { lectura: { error: 'No pudimos leer tu palma con claridad. Vuelve a tomar la foto.' } } };
  }
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
// En la nube usa el secret dedicado QUIROMANCIA_ELEVENLABS_API_KEY; en local cae
// a ELEVENLABS_API_KEY (.env) para no romper el dev-server.
const elevenKey = () => process.env.QUIROMANCIA_ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
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
