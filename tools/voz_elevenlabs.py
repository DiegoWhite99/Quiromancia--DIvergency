#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Voz del oráculo · Divergency · Quiromancia AI  ──  Probador de ElevenLabs (Python SDK)
=====================================================================================
Script INDEPENDIENTE para generar/probar la voz mística desde tu PC.
(La app web usa el backend Node /api/voz; esto es solo una herramienta de prueba.)

Requisitos:
    pip install elevenlabs

Uso:
    # Genera un MP3 con el texto de prueba (lee la clave de .env o de la variable de entorno)
    python tools/voz_elevenlabs.py --text "Bienvenida, viajera. Las brumas se despejan ante mí."

    # Elige otra voz y archivo de salida
    python tools/voz_elevenlabs.py --text "Hola" --voice pFZP5JQG7iQjIQuC4Bku --out voz.mp3

    # Lista tus voces disponibles (para copiar el id de la 'anciana adivinadora')
    python tools/voz_elevenlabs.py --list

    # También puedes pasar la clave directamente (si no está en .env)
    python tools/voz_elevenlabs.py --text "Hola" --key sk_...

La clave se busca en este orden:  --key  >  variable de entorno ELEVENLABS_API_KEY  >  .env
"""

import argparse
import os
import sys
from pathlib import Path

# Voz por defecto: mujer madura/mística (adivinadora). Cámbiala con --voice o ELEVENLABS_VOICE_ID.
#   Lily (madura, áspera):  pFZP5JQG7iQjIQuC4Bku
#   Glinda (bruja):         z9fAnlkpzviPz146aGWa
#   Matilda (cálida):       XrExE9yKIg1WjnnlVkGX
#   Serena (madura, suave): pMsXgVXv3BLzUgSXRplE
VOZ_DEFECTO = "pFZP5JQG7iQjIQuC4Bku"
MODELO = "eleven_multilingual_v2"  # buen español, expresivo

RAIZ = Path(__file__).resolve().parent.parent  # carpeta del proyecto


def cargar_env():
    """Lee .env del proyecto y mete las claves en os.environ (sin pisar las ya existentes)."""
    env = RAIZ / ".env"
    if not env.exists():
        return
    for linea in env.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        k, v = linea.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        os.environ.setdefault(k, v)


def obtener_clave(arg_key):
    return arg_key or os.environ.get("ELEVENLABS_API_KEY")


def main():
    cargar_env()

    p = argparse.ArgumentParser(description="Genera/prueba la voz del oráculo con ElevenLabs.")
    p.add_argument("--text", help="Texto a narrar.")
    p.add_argument("--voice", default=os.environ.get("ELEVENLABS_VOICE_ID", VOZ_DEFECTO),
                   help="ID de la voz (por defecto: voz mística).")
    p.add_argument("--out", default="voz.mp3", help="Archivo MP3 de salida (por defecto: voz.mp3).")
    p.add_argument("--key", help="API key de ElevenLabs (si no está en .env/entorno).")
    p.add_argument("--list", action="store_true", help="Lista tus voces disponibles y sale.")
    args = p.parse_args()

    clave = obtener_clave(args.key)
    if not clave:
        sys.exit("✗ Falta la API key. Ponla en .env (ELEVENLABS_API_KEY=...) o pásala con --key.")

    try:
        from elevenlabs.client import ElevenLabs
        from elevenlabs import VoiceSettings
    except ImportError:
        sys.exit("✗ Falta el paquete. Instálalo con:  pip install elevenlabs")

    client = ElevenLabs(api_key=clave)

    # --- Listar voces ---
    if args.list:
        try:
            voces = client.voices.get_all()
        except Exception as e:
            sys.exit(f"✗ No se pudieron listar las voces: {e}\n  (¿la clave tiene permiso 'voices_read'?)")
        print("\n  Voces disponibles:\n")
        for v in voces.voices:
            etiquetas = getattr(v, "labels", None) or {}
            extra = ", ".join(f"{k}:{val}" for k, val in etiquetas.items())
            print(f"  • {v.name:<22} {v.voice_id}   {extra}")
        print()
        return

    if not args.text:
        sys.exit("✗ Indica el texto con --text \"...\"  (o usa --list para ver tus voces).")

    # --- Generar voz (respuesta RAW para leer cabeceras: coste, ids de depuración) ---
    try:
        response = client.text_to_speech.with_raw_response.convert(
            text=args.text,
            voice_id=args.voice,
            model_id=MODELO,
            output_format="mp3_44100_128",
            # Tono místico de adivinadora: expresivo, cálido, algo pausado.
            voice_settings=VoiceSettings(
                stability=0.45, similarity_boost=0.8, style=0.35, use_speaker_boost=True
            ),
        )
    except Exception as e:
        sys.exit(f"✗ Error al generar la voz: {e}\n  (¿la clave tiene permiso 'text_to_speech'?)")

    # Cabeceras de depuración (como en tu snippet)
    char_cost = response.headers.get("character-cost")
    request_id = response.headers.get("request-id")
    trace_id = response.headers.get("x-trace-id")

    # Guardar el audio (response.data puede ser un iterador de chunks o bytes)
    audio = response.data
    with open(args.out, "wb") as f:
        if isinstance(audio, (bytes, bytearray)):
            f.write(audio)
        else:
            for chunk in audio:
                if chunk:
                    f.write(chunk)

    print(f"\n  ✓ Audio guardado en: {args.out}")
    print(f"    voz: {args.voice}  ·  modelo: {MODELO}")
    print(f"    coste (caracteres): {char_cost}")
    print(f"    request-id: {request_id}  ·  x-trace-id: {trace_id}\n")


if __name__ == "__main__":
    main()
