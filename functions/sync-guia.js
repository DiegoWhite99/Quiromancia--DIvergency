// Copia la guía canónica (public/docs/quiromancia.txt) dentro de functions/ para que
// la Cloud Function la tenga al desplegar: en producción la carpeta public/ NO viaja
// con la función. Se ejecuta solo (npm run sync-guia) y como "predeploy" de Firebase.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'public', 'docs', 'quiromancia.txt');
const dst = path.join(__dirname, 'quiromancia.txt');

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log('sync-guia: quiromancia.txt copiado a functions/ ✓');
  } else {
    console.log('sync-guia: no se encontró', src, '→ la función usará el resumen embebido.');
  }
} catch (e) {
  console.warn('sync-guia: no se pudo copiar:', e.message);
}
