# Historial de cambios · Quiromancia AI

Se anota lo que cambia de cara al usuario y lo que hay que saber para no romperlo
después. Lo más reciente arriba.

---

## 1.4.0 — 2026-08-18 · Instructivo de la máquina al iniciar

Hasta ahora, quien llegaba al kiosco veía la portada y tenía que adivinar qué hacer, o
alguien se lo explicaba turno a turno. Esta versión mete un **instructivo en video** al
principio del recorrido.

### Pantalla nueva: el tutorial

El recorrido pasa a ser:

```
portada → TUTORIAL → home → formulario → cámara → enfoque → análisis → resultado
```

- Pantalla `pantalla-tutorial`, dentro del mismo `public/index.html`.
- Video: `public/video/tutorial-maquina.mp4` (15 s, apaisado 752×416, **sin audio**).
  Se ve la máquina real: la tablet en el brazo articulado y el soporte gris donde la
  persona apoya el antebrazo y pone la palma abierta.
- Como el video es mudo, la explicación va en **cuatro pasos escritos** que se encienden
  solos siguiendo el avance del video:
  1. Cuéntanos de ti · 2. Apoya tu palma · 3. Elige tu tema · 4. Recibe tu lectura
- Se repite con el botón ↺, y se puede repasar desde la portada con
  **"Ver otra vez cómo funciona"**.
- Si el mp4 faltara o el navegador no pudiera reproducirlo, el tutorial **no se rompe**:
  se ocultan el marco y la barra, quedan los pasos escritos y el botón sigue llevando al
  home.

### Responsive

Verificado con capturas reales en 12 tamaños (kiosco vertical 1080×1920, kiosco 16:9,
portátil, tablets en las dos orientaciones y móviles hasta 320×568). En todos: sin scroll,
sin desbordes y con el botón principal visible y sin nada encima.

Hay tres formas según la pantalla:

| Pantalla | Cómo se ve |
|---|---|
| Alta o normal | Video arriba y los 4 pasos en fila debajo |
| Angosta (≤ 620 px) | Pasos en 2×2 |
| Apaisada y baja (≥ 700 px de ancho, ≤ 820 px de alto) | Video a la izquierda, pasos en lista a la derecha |

En pantallas muy bajas se ocultan solos los textos secundarios; en el kiosco vertical el
video crece hasta 860 px para no dejar hueco.

### Arreglos que hicieron falta

- **El aviso de versión tapaba el botón.** `#pie-version` es `position:fixed` y en móviles
  pequeños se partía en tres líneas justo encima de "Ya entendí, comenzar". Ahora se oculta
  mientras el instructivo está a la vista
  (`body:has(#pantalla-tutorial.activo)`, más una guarda en `mostrarPie()`).
- **El servidor local no sabía servir video.** `dev-server.mjs` no tenía el MIME de `.mp4`
  y respondía siempre 200 con el archivo entero; sin respuestas **206 por `Range`** algunos
  navegadores (Safari/iOS) se niegan a reproducir. Añadidos MIME de video y streaming por
  rangos, con 416 para rangos inválidos.
- **Caché en producción**: `firebase.json` ahora cachea también `.mp4` y `.webm` 24 h.

### Icono de la app

Nuevo `public/img/icono.svg`: una bola de cristal en la paleta de Divergency (navy + oro),
usada como icono de pestaña (`rel="icon"`) y de pantalla de inicio (`apple-touch-icon`),
en lugar del contorno de mano anterior. Revisada a 16, 32, 64 y 128 px.

### Modo kiosco

`reiniciarSesion()` pausa el video, lo rebobina y apaga los pasos, para que el siguiente
visitante lo vea desde cero. `mostrar()` pausa el video en cuanto se cambia de pantalla,
venga el cambio de donde venga.

### Documentación

README rehecho: portada con el icono, capturas reales de la app, diagrama del recorrido,
tabla de funcionalidades y el aviso de cuál es la versión estable. Se corrigieron cosas que
habían quedado desactualizadas (ya no hay tres personalidades, ni chat con preguntas por
voz, ni envío por correo con Google: la entrega es por WhatsApp). Capturas en `docs/img/`.

### Si hay que tocarlo después

- Cambiar el video → reemplazar `public/video/tutorial-maquina.mp4` con ese mismo nombre.
- Cambiar el ritmo de los pasos → constante `TUTO_MARCAS` en el bloque `TUTORIAL` de
  `public/index.html`. Van en **fracciones del video** (`[0, 0.28, 0.55, 0.78]`), no en
  segundos, para que sigan cuadrando si el video nuevo dura otra cosa.
- Cambiar los textos de los pasos → misma sección, HTML de `.tuto-paso`.
