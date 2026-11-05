"""The requests.yaml contract: what clips the content wants.

`load_requests` is the only way in. Each source's request is its own type, so a field combination
that the file format forbids can't reach a stage. Anything wrong with the file raises
`RequestsError` listing every problem at once.
"""

import re
from dataclasses import dataclass
from pathlib import Path

import yaml

SLUG = r"[a-z0-9][a-z0-9-]*"
CLIP_ID = re.compile(rf"clip:{SLUG}")
LESSON_ID = re.compile(rf"[a-z]{{2,3}}:les:{SLUG}")
SYLLABLE = re.compile(r"[a-z]+[1-5]")  # toned pinyin, with v for ü
VOICE = re.compile(r"[A-Za-z0-9]{6,}")
UTTERANCE = {"aishell3": re.compile(r"SSB\d{8}"), "aishell1": re.compile(r"BAC009S\d{4}W\d{4}")}


@dataclass(frozen=True)
class CorpusLine:
    """A sentence from a corpus. `zh` is display text; punctuation may differ from the transcript."""
    id: str
    source: str
    lessons: tuple[str, ...]
    utt: str
    zh: str
    kind = "sentence"

    @property
    def speech(self) -> str:
        return self.zh


@dataclass(frozen=True)
class Syllable:
    id: str
    source: str
    lessons: tuple[str, ...]
    syllable: str
    kind = "syllable"
    zh = None


@dataclass(frozen=True)
class Word:
    id: str
    source: str
    lessons: tuple[str, ...]
    word: str
    kind = "word"

    @property
    def zh(self) -> str:
        return self.word

    @property
    def speech(self) -> str:
        return self.word


@dataclass(frozen=True)
class SynthLine:
    id: str
    source: str
    lessons: tuple[str, ...]
    text: str
    voice: str
    kind = "sentence"

    @property
    def zh(self) -> str:
        return self.text

    @property
    def speech(self) -> str:
        return self.text


ClipRequest = CorpusLine | Syllable | Word | SynthLine

_MAX_WORD_HANZI = 3


def spoken_word(request: ClipRequest) -> str | None:
    """The word a clip says on its own, or None. Whisper can't transcribe an isolated word reliably,
    so these validate as words, whatever their source."""
    if isinstance(request, Word):
        return request.word
    if isinstance(request, SynthLine):
        hanzi = "".join(ch for ch in request.text if "\u4e00" <= ch <= "\u9fff")
        return hanzi if len(hanzi) <= _MAX_WORD_HANZI else None
    return None


class RequestsError(Exception):
    def __init__(self, problems: list[str]):
        super().__init__("\n".join(problems))
        self.problems = problems


def load_requests(path: Path) -> list[ClipRequest]:
    if not path.exists():
        raise RequestsError([f"{path}: file not found"])
    return parse_requests(yaml.safe_load(path.read_text(encoding="utf-8")))


def parse_requests(data: object) -> list[ClipRequest]:
    """Requests in file order. An empty document is an empty list."""
    if data is None:
        return []
    if not isinstance(data, list):
        raise RequestsError(["requests file must be a list of entries"])
    problems: list[str] = []
    requests: list[ClipRequest] = []
    seen: set[str] = set()
    for index, entry in enumerate(data):
        label = entry.get("id", f"entry {index}") if isinstance(entry, dict) else f"entry {index}"
        errors: list[str] = []
        request = _parse_entry(entry, errors)
        if request is not None and request.id in seen:
            errors.append("duplicate id")
        problems += [f"{label}: {e}" for e in errors]
        if request is not None and not errors:
            seen.add(request.id)
            requests.append(request)
    if problems:
        raise RequestsError(problems)
    return requests


def _parse_entry(entry: object, errors: list[str]) -> ClipRequest | None:
    if not isinstance(entry, dict):
        errors.append("entry must be a mapping")
        return None
    source = entry.get("source")
    if source in UTTERANCE:
        fields = _fields(entry, ("utt", "zh"), errors)
        if fields:
            _match(UTTERANCE[source], fields["utt"], "utt", errors)
            return _build(CorpusLine, entry, fields, errors)
    elif source == "elevenlabs":
        fields = _fields(entry, ("text", "voice"), errors)
        if fields:
            _match(VOICE, fields["voice"], "voice", errors)
            return _build(SynthLine, entry, fields, errors)
    elif source == "yoyo":
        fields = _fields(entry, ("syllable",), errors)
        if fields:
            _match(SYLLABLE, fields["syllable"], "syllable", errors)
            return _build(Syllable, entry, fields, errors)
    elif source == "audio-cmn":
        shape = ("word",) if "word" in entry else ("syllable",)
        fields = _fields(entry, shape, errors)
        if fields and "syllable" in fields:
            _match(SYLLABLE, fields["syllable"], "syllable", errors)
            return _build(Syllable, entry, fields, errors)
        if fields:
            return _build(Word, entry, fields, errors)
    else:
        errors.append(f"unknown source {source!r}")
    return None


def _fields(entry: dict, names: tuple[str, ...], errors: list[str]) -> dict[str, str] | None:
    """The source-specific string fields, or None after recording why they're unusable."""
    extra = sorted(set(entry) - {"id", "source", "lessons", *names})
    missing = [n for n in names if not (isinstance(entry.get(n), str) and entry[n].strip())]
    if extra:
        errors.append(f"unexpected fields for this source: {', '.join(extra)}")
    if missing:
        errors.append(f"needs non-empty text in: {', '.join(missing)}")
    return None if extra or missing else {n: entry[n] for n in names}


def _build(kind: type, entry: dict, fields: dict[str, str], errors: list[str]) -> ClipRequest | None:
    clip_id, lessons = entry.get("id"), entry.get("lessons")
    if not isinstance(clip_id, str) or not CLIP_ID.fullmatch(clip_id):
        errors.append("id must look like clip:<slug>")
    if not isinstance(lessons, list) or not lessons:
        errors.append("lessons must be a non-empty list")
    elif not all(isinstance(lesson, str) and LESSON_ID.fullmatch(lesson) for lesson in lessons):
        errors.append("each lesson must look like <lang>:les:<slug>")
    if errors:
        return None
    return kind(id=clip_id, source=entry["source"], lessons=tuple(lessons), **fields)


def _match(pattern: re.Pattern, value: str, name: str, errors: list[str]) -> None:
    if not pattern.fullmatch(value):
        errors.append(f"{name} {value!r} is not valid")
