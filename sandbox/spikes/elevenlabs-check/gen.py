"""Generate the test clips with ElevenLabs: each script file, once per voice.

Usage:  python -I -X utf8 gen.py models          # list models that can do TTS (free call)
        python -I -X utf8 gen.py <model_id> <voice_id>...

Reads ELEVENLABS_API_KEY from the repo-root .env.development.local. Writes audio/<a|b>-<model>-<voice>.mp3
and skips any file that already exists, so a rerun never spends credits twice.
"""

import json
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV = HERE.parents[2] / ".env.development.local"
API = "https://api.elevenlabs.io/v1"
SCRIPTS = {"a": HERE / "a-sentences.txt", "b": HERE / "b-syllables.txt"}


def key():
    for line in ENV.read_text(encoding="utf-8").splitlines():
        name, _, value = line.partition("=")
        if name.strip() == "ELEVENLABS_API_KEY":
            return value.strip().strip('"').strip("'")
    sys.exit("ELEVENLABS_API_KEY missing from .env.development.local")


def request(path, body=None):
    req = urllib.request.Request(f"{API}{path}", data=json.dumps(body).encode() if body else None,
                                 method="POST" if body else "GET",
                                 headers={"xi-api-key": key(), "Content-Type": "application/json", "User-Agent": "lang-learner/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read(), dict(r.headers)


def main():
    if sys.argv[1:] == ["models"]:
        data, _ = request("/models")
        for m in json.loads(data):
            zh = any(l.get("language_id") == "zh" for l in m.get("languages", []))
            print(m["model_id"], "tts" if m.get("can_do_text_to_speech") else "-", "zh" if zh else "", m.get("character_cost_multiplier", ""))
        return
    if sys.argv[1] == "say":  # gen.py say <model> <voice> <out.mp3> <text>
        _, model, voice, out, text = sys.argv[1:]
        out = Path(out)
        if out.exists():
            print("exists, skipping:", out.name)
            return
        audio, headers = request(f"/text-to-speech/{voice}?output_format=mp3_44100_128", {"text": text, "model_id": model, "language_code": "zh"})
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(audio)
        print(f"{out.name}: {len(text)} chars, reported cost {headers.get('character-cost', '?')}")
        return
    model, voices = sys.argv[1], sys.argv[2:]
    (HERE / "audio").mkdir(exist_ok=True)
    for voice in voices:
        for kind, script in SCRIPTS.items():
            out = HERE / "audio" / f"{kind}-{model}-{voice}.mp3"
            if out.exists():
                print("exists, skipping:", out.name)
                continue
            text = script.read_text(encoding="utf-8").strip()
            audio, headers = request(f"/text-to-speech/{voice}?output_format=mp3_44100_128",
                                     {"text": text, "model_id": model, "language_code": "zh"})
            out.write_bytes(audio)
            cost = headers.get("character-cost") or headers.get("x-character-count") or "?"
            print(f"{out.name}: {len(text)} chars, {len(audio) // 1024} KB, reported cost {cost}")


if __name__ == "__main__":
    main()
