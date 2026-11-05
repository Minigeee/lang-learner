"""ElevenLabs synthesis, which spends the owner's credits.

Audio is cached under a hash of everything that shapes it, so a rerun costs nothing. A sidecar keeps
each clip's character cost, which makes usage.json a pure function of the requests and the cache.
"""

import hashlib
import json
import urllib.request
from pathlib import Path

from .clip_requests import ClipRequest, SynthLine
from .workspace import Workspace, write_atomic

API = "https://api.elevenlabs.io/v1"
API_KEY_SETTING = "ELEVENLABS_API_KEY"
MODEL = "eleven_v4"
SETTINGS = {"language_code": "zh", "output_format": "mp3_44100_128"}


def cache_key(text: str, voice: str, model: str = MODEL, settings: dict = SETTINGS) -> str:
    identity = json.dumps({"text": text, "voice": voice, "model": model, "settings": settings},
                          ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()[:32]


def audio_path(request: SynthLine, ws: Workspace) -> Path:
    return ws.raw_dir("elevenlabs") / f"{cache_key(request.text, request.voice)}.mp3"


def _cost_path(request: SynthLine, ws: Workspace) -> Path:
    return audio_path(request, ws).with_suffix(".json")


def _call_api(request: SynthLine, api_key: str) -> tuple[bytes, int]:
    url = f"{API}/text-to-speech/{request.voice}?output_format={SETTINGS['output_format']}"
    body = {"text": request.text, "model_id": MODEL, "language_code": SETTINGS["language_code"]}
    http_request = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"), method="POST",
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "User-Agent": "lang-learner/1.0"})
    with urllib.request.urlopen(http_request, timeout=180) as response:
        audio = response.read()
        cost = response.headers.get("character-cost") or response.headers.get("x-character-count")
    return audio, int(cost) if cost else len(request.text)


def synth_all(requests: list[ClipRequest], ws: Workspace) -> list[str]:
    """Generates uncached lines and rewrites usage.json. Returns a failure line per miss.

    A failed call isn't retried, because a retry could be charged twice.
    """
    lines = [r for r in requests if isinstance(r, SynthLine)]
    failures: list[str] = []
    missing = [r for r in lines if not audio_path(r, ws).exists()]
    api_key = ws.setting(API_KEY_SETTING) if missing else None
    spent = 0
    for request in missing:
        if api_key is None:
            failures.append(f"{request.id}: {API_KEY_SETTING} isn't set")
            continue
        try:
            audio, cost = _call_api(request, api_key)
        except OSError as e:
            failures.append(f"{request.id}: ElevenLabs call failed: {e}")
            continue
        write_atomic(_cost_path(request, ws), json.dumps({"characterCost": cost}).encode("utf-8"))
        write_atomic(audio_path(request, ws), audio)
        spent += cost
        print(f"  {request.id}: {cost} characters", flush=True)
    if lines:
        print(f"synth: {len(lines) - len(missing)} cached, {len(missing)} new, {spent} characters spent", flush=True)
    write_atomic(ws.usage_file, json.dumps(usage_report(lines, ws), ensure_ascii=False, indent=2,
                                           sort_keys=True).encode("utf-8"))
    return failures


def usage_report(lines: list[SynthLine], ws: Workspace) -> dict:
    """Characters paid for the current requests.

    `lessons` shows each lesson the full cost of every clip it uses, so a shared clip counts in each
    of its lessons, while `totalCharacters` counts each distinct audio file once.
    """
    per_audio: dict[Path, int] = {}
    per_lesson: dict[str, int] = {}
    for request in lines:
        cost_file = _cost_path(request, ws)
        if not cost_file.exists():
            continue
        cost = json.loads(cost_file.read_text(encoding="utf-8"))["characterCost"]
        per_audio[cost_file] = cost
        for lesson in request.lessons:
            per_lesson[lesson] = per_lesson.get(lesson, 0) + cost
    return {"model": MODEL, "totalCharacters": sum(per_audio.values()), "lessons": per_lesson}
