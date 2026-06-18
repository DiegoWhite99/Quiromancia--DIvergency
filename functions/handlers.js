// Lógica del oráculo · Divergency · Quiromancia AI
// Funciones puras (sin framework): las usan tanto las Cloud Functions como el
// servidor local de desarrollo. Devuelven { status, data }.

const fs = require('fs');
const path = require('path');

// Carga (y cachea) el tratado de quiromancia (public/docs/quiromancia.txt) para
// REFORZAR las lecturas. Se queda con la parte interpretativa (de "LOS MONTES" en
// adelante: montes, llanos y todas las líneas), saltando la historia inicial.
let _guiaCache = null;
function guiaTratado() {
  if (_guiaCache !== null) return _guiaCache;
  const candidatos = [
    path.join(__dirname, '..', 'public', 'docs', 'quiromancia.txt'),
    path.join(__dirname, 'quiromancia.txt'),
    path.join(process.cwd(), 'public', 'docs', 'quiromancia.txt')
  ];
  let txt = '';
  for (const p of candidatos) {
    try { if (fs.existsSync(p)) { txt = fs.readFileSync(p, 'utf8'); break; } } catch (e) {}
  }
  if (txt) {
    // Nos quedamos con lo MÁS útil para una lectura (las líneas) y recortamos fuerte
    // para que el prompt no pese demasiado: peticiones más rápidas y fiables.
    let i = txt.indexOf('LAS LÍNEAS');
    if (i < 0) i = txt.indexOf('LOS MONTES');
    if (i < 0) i = txt.indexOf('LOS DEDOS');
    if (i > 0) txt = txt.slice(i);
    txt = txt.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    const MAX = 16000;   // ~4k tokens (antes ~12k): mucho más ligero
    if (txt.length > MAX) txt = txt.slice(0, MAX);
  }
  _guiaCache = txt;
  return _guiaCache;
}

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
  const base = `Eres un quiromante experto de "Divergency". Analizas EN DETALLE la fotografía de la palma de una mano.

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
Prioriza lo que SÍ alcances a ver; pero si la foto está borrosa, oscura, de lejos o la mano se ve pequeña o ladeada, NO te detengas: completa con la interpretación típica de una mano y entrega igualmente la lectura. Lo importante es SIEMPRE dar una lectura, nunca quedarte sin responder.

UBICACIÓN REAL DE LAS LÍNEAS EN LA FOTO (campo "puntos"):
Para CADA línea, traza POR DÓNDE PASA REALMENTE en ESTA fotografía y devuelve de 3 a 5 coordenadas [x,y] NORMALIZADAS y REDONDEADAS A 2 DECIMALES (x=0 borde izquierdo, x=1 borde derecho; y=0 arriba, y=1 abajo; ej. [0.42,0.55]) que sigan el surco real de principio a fin, EN ORDEN. Las coordenadas DEBEN caer sobre la palma de la foto. El campo "puntos" es OPCIONAL: si no logras ubicar una línea, OMITE solo su "puntos" — pero NUNCA omitas su "observacion" ni su "lectura". Como guía anatómica: la VIDA rodea la base del pulgar; el CORAZÓN es el arco alto bajo los dedos; la CABEZA cruza el centro de la palma; el DESTINO sube casi vertical hacia el dedo medio.

Reglas:
- REGLA #1 (la más importante): SIEMPRE entrega una lectura COMPLETA de las 4 líneas, pase lo que pase. Aunque la foto esté borrosa, oscura, tomada de lejos, con la mano pequeña, ladeada, con sombras o solo se vea parte de la palma, INTERPRETA lo que puedas y completa el resto con la lectura típica de una mano. Mientras se intuya una mano, hazlo. JAMÁS devuelvas el resultado vacío, JAMÁS digas que la imagen no sirve o que no puedes leerla, JAMÁS pidas otra foto. Eso está terminantemente PROHIBIDO.
- Enfócate EXCLUSIVAMENTE en la QUIROMANCIA: las líneas, los montes y la forma de la mano. NO uses astrología, signos zodiacales ni horóscopos.
- Para CADA línea, el campo "observacion" DEBE citar al menos DOS rasgos concretos y visibles de ESA línea en ESTA palma (su recorrido, largo, profundidad, curva, cadenas, islas, ramas, cortes...). LUEGO, en "lectura", interpreta exactamente eso que observaste: la lectura tiene que derivarse de la observación, no al revés.
- PROHIBIDO LO GENÉRICO: si una frase podría aplicarse a CUALQUIER mano, está MAL escrita; reescríbela citando un detalle concreto que VES en la foto. Dos personas distintas DEBEN recibir lecturas claramente diferentes entre sí. Nunca uses una plantilla fija ni repitas las mismas frases hechas; varía el vocabulario y los matices según lo que muestre cada palma.
- PERSONALIZA con los datos de la persona: dirígete a ella por su NOMBRE con naturalidad y AJUSTA el énfasis a su ETAPA DE VIDA (si es joven, proyecta hacia el futuro que se abre ante ella; si tiene más años, reconoce su trayectoria y confirma su camino). La mano IZQUIERDA habla de lo heredado, el pasado y el mundo interior; la DERECHA, de lo que se está forjando hacia el futuro y el mundo exterior: matiza la lectura según cuál sea. NO uses el zodíaco ni inventes datos que no observes.
- Las lecturas deben ser potentes y con sustancia: 2 o 3 frases por línea (máximo ~40 palabras cada una), directas, afirmativas y en segunda persona. TODA la lectura debe poder leerse en voz alta en cerca de minuto y medio (en total, unas 210 palabras). Ejemplo del tono (NO lo copies literal): "Tu línea de la vida nace pegada a la de la cabeza y se ensancha cerca de la muñeca: revela cautela al empezar y una vitalidad que florece con los años." Evita frases vagas y relleno, pero da una lectura rica y desarrollada.
- ENFOQUE POR TEMA: si la persona eligió un tema de interés (amor, dinero, trabajo, familia o salud), ENFOCA cerca del 80% de la lectura en ese tema: interpreta CADA línea desde esa óptica (qué dice tu mano sobre ESE tema) y resalta lo que más le importa; el 20% restante, una visión general. Si el tema es "general", reparte el enfoque de forma equilibrada.
- CONSEJOS: termina SIEMPRE con "consejos": 2 o 3 recomendaciones breves, prácticas y en tu estilo, relacionadas con el tema elegido (p. ej. dinero: "Cuida lo que gastas y aparta un ahorro cada mes"; amor: "Escucha de verdad y di lo que sientes"; trabajo: "Apuesta por lo que se te da bien"). Son guiños de oráculo para reflexionar, NO órdenes.
- OBLIGATORIO: NUNCA dejes el arreglo "lineas" vacío ni dejes "observacion"/"lectura" en blanco. SIEMPRE devuelve las CUATRO líneas mayores (vida, corazón, cabeza, destino), cada una con su lectura propia y DISTINTA de las demás. Aunque la mano se vea pequeña, lejana, mal iluminada o la foto no sea perfecta, haz tu MEJOR interpretación con lo que SÍ alcances a ver; jamás devuelvas campos vacíos ni te niegues. En "montes" describe la forma real de la mano y los dedos que observaste (cuadrada/alargada, dedos largos/cortos, pulgar) y relaciónalo con los montes.
- A cada línea asígnale un "color" según el significado DOMINANTE de lo que revela, eligiendo SOLO uno de estos: "verde" (vida, vitalidad, salud), "azul" (riqueza, prosperidad, abundancia, mente), "rosa" (amor, afectos), "dorado" (destino, éxito, fortuna), "morado" (intuición, espiritualidad) o "rojo" (advertencias o aspectos difíciles). Normalmente: Vida→verde, Corazón→rosa, Cabeza→azul, Destino→dorado; usa "rojo" solo si esa línea muestra algo que conviene cuidar.
- Tono positivo e inspirador (respetando tu personalidad). Es para entretenimiento y autorreflexión: los "consejos" son sugerencias ligeras y positivas en clave de oráculo, NO asesoría médica, legal ni financiera profesional ni diagnósticos; no des fechas exactas.
- Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown ni texto extra), con EXACTAMENTE esta forma:
{
  "saludo": "1 frase breve de bienvenida usando el nombre, en tu estilo",
  "lineas": [
    {"nombre":"Línea de la Vida","simbolo":"🌿","color":"verde","puntos":[[x,y],[x,y],[x,y],[x,y],[x,y]],"observacion":"1 frase corta sobre cómo se ve esta línea en su palma","lectura":"2-3 frases de interpretación directa (máx ~40 palabras), enfocadas en el tema elegido"},
    {"nombre":"Línea del Corazón","simbolo":"❤️","color":"rosa","puntos":[[x,y],...],"observacion":"...","lectura":"..."},
    {"nombre":"Línea de la Cabeza","simbolo":"🧠","color":"azul","puntos":[[x,y],...],"observacion":"...","lectura":"..."},
    {"nombre":"Línea del Destino","simbolo":"⭐","color":"dorado","puntos":[[x,y],...],"observacion":"...","lectura":"..."}
  ],
  "montes": "1-2 frases sobre los montes (Venus, Júpiter, Apolo) y la forma de la mano",
  "consejos": ["consejo breve 1 sobre el tema elegido", "consejo breve 2", "consejo breve 3 (opcional)"],
  "cierre": "1 frase de cierre inspirador, en tu estilo"
}`;
  // Refuerzo: tratado de quiromancia (public/docs/quiromancia.txt) como referencia ampliada.
  const guia = guiaTratado();
  const ref = guia
    ? `\n\n=== TRATADO DE QUIROMANCIA (referencia ampliada) ===\nApóyate en este tratado para INTERPRETAR con más profundidad, precisión y vocabulario variado lo que observas en la palma (montes, llanos y líneas). Respeta SIEMPRE las reglas de formato, brevedad y ENFOQUE POR TEMA de arriba; NO copies frases literales del tratado: úsalo como conocimiento para variar y enriquecer cada lectura.\n\n${guia}`
    : '';
  return base + ref;
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
  // Tema de enfoque elegido en la botonera (después de la foto).
  const TEMAS = {
    amor: 'el AMOR y las relaciones', dinero: 'el DINERO y la prosperidad',
    trabajo: 'el TRABAJO y la vocación', familia: 'la FAMILIA y los vínculos',
    salud: 'la SALUD y la energía vital'
  };
  // Cómo conectar CADA línea con el tema, para que la lectura SÍ hable del tema.
  const ENFOQUE_LINEAS = {
    amor: 'Vida→tu vitalidad y pasión en los vínculos; Corazón→tu manera de amar y de ser amada(o); Cabeza→cómo piensas y decides en pareja; Destino→con quién y hacia dónde va tu vida sentimental.',
    dinero: 'Vida→tu empuje y energía para trabajar y generar ingresos; Corazón→tu relación emocional con el dinero (gastar, compartir, buscar seguridad); Cabeza→cómo tomas decisiones financieras y tu mentalidad de abundancia; Destino→tu camino profesional, tus negocios, tu fortuna y prosperidad.',
    trabajo: 'Vida→tu energía y disciplina laboral; Corazón→tu pasión y motivación por lo que haces; Cabeza→tus talentos, lógica y forma de resolver; Destino→tu carrera, ascensos, vocación y propósito.',
    familia: 'Vida→tus raíces y energía en el hogar; Corazón→tus lazos afectivos con los tuyos; Cabeza→cómo equilibras razón y familia; Destino→el peso de la familia en tu camino y tu hogar futuro.',
    salud: 'Vida→tu vitalidad, resistencia y energía física; Corazón→tu bienestar emocional; Cabeza→tu mente, el estrés y el descanso; Destino→tus hábitos y el rumbo de tu bienestar.'
  };
  const temaKey = (body.tema || '').toLowerCase().trim();
  const temaTxt = TEMAS[temaKey];
  const enfoque = temaTxt
    ? ` TEMA ELEGIDO: ${temaTxt}. ESTO ES LO MÁS IMPORTANTE: la lectura DEBE girar en torno a ${temaTxt}. Interpreta CADA una de las 4 líneas conectándola con ese tema así → ${ENFOQUE_LINEAS[temaKey]} La "lectura" de CADA línea TIENE QUE mencionar EXPLÍCITAMENTE ${temaTxt} (no de forma genérica), y TODOS los "consejos" deben ser sobre ${temaTxt}. Si una lectura no habla del tema, está MAL.`
    : ` La persona quiere una visión GENERAL: reparte el enfoque entre vitalidad, amor, mente y destino, con consejos generales para la vida.`;
  const intro = `Persona: ${body.nombre || 'anónima'}.`
    + ` Mano fotografiada: ${manoTxt}.`
    + (edad != null ? ` Edad aproximada: ${edad} años — ${etapaVida(edad)}.` : '')
    + enfoque
    + ` Analiza con detalle ESTA fotografía de la palma siguiendo el protocolo de observación: mide la forma de la mano y los dedos, sigue el recorrido REAL de cada línea y devuelve sus "puntos" sobre la foto. Haz una lectura ÚNICA y PERSONAL —usa su nombre y su etapa de vida— basada en lo que de verdad ves aquí (otra persona debe recibir una lectura distinta). Responde en formato JSON.`;

  const cuerpo = {
    model: MODELO,
    max_tokens: 2600,
    temperature: cfg.temperatura,
    // Penaliza repetir las mismas palabras → menos frases hechas y más variedad real.
    frequency_penalty: 0.4,
    presence_penalty: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: construirSystemLectura(modo) },
      { role: 'user', content: [
        { type: 'text', text: intro },
        // detail:'high' → OpenAI analiza la palma en alta resolución (ve líneas finas).
        { type: 'image_url', image_url: { url: body.dataUrl, detail: 'high' } }
      ] }
    ]
  };

  // Hasta 3 intentos: si la API falla (lentitud, límite, error transitorio) o la
  // respuesta viene vacía, reintentamos. NUNCA bloqueamos: tras los intentos
  // devolvemos lo que tengamos (aunque sea vacío) y el front rellena las 4 líneas
  // y SIEMPRE muestra una lectura. El aviso de "repetir foto" queda solo para que
  // el navegador no pueda llegar al servidor (error de red real).
  let lectura = null;
  for (let intento = 1; intento <= 3 && !lectura; intento++) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey()}` },
        body: JSON.stringify(cuerpo)
      });
      if (!r.ok) continue;   // error de la API → reintenta
      const data = await r.json();
      let txt = (data.choices?.[0]?.message?.content || '').trim();
      txt = txt.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
      let parsed = null;
      try { parsed = JSON.parse(txt); }
      catch (e) { const mm = txt.match(/\{[\s\S]*\}/); if (mm) { try { parsed = JSON.parse(mm[0]); } catch (_) {} } }
      if (parsed && Array.isArray(parsed.lineas) && parsed.lineas.length) { lectura = parsed; break; }
      if (parsed && typeof parsed === 'object') lectura = lectura || parsed; // guarda algo por si todos fallan
    } catch (e) { /* error de red hacia OpenAI → reintenta */ }
  }
  // Para depurar si la API está caída (clave/saldo): queda en los logs, no se muestra.
  if (!lectura || !Array.isArray(lectura.lineas) || !lectura.lineas.length) {
    try { console.warn('handleLectura: sin líneas tras 3 intentos (¿API/saldo de OpenAI?).'); } catch (e) {}
  }
  // Siempre 200 con una lectura (real, parcial o vacía → el front la completa).
  return { status: 200, data: { lectura: lectura || {} } };
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
