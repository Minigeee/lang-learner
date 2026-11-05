import json

import yaml

from media_ingest import gate, sources, synth
from media_ingest.audio import Rendered
from media_ingest.clip_requests import CorpusLine, Syllable, SynthLine, Word
from media_ingest.workspace import Workspace, write_atomic

LESSON = ("zh:les:x",)
RENDERED = Rendered(b"opus-bytes", 3.5, -20.01, -1.5, 1.234)
SIGNAL = {"speech_regions": 1, "edge_start_db": -40.0, "edge_end_db": -40.0}


def line(utt="SSB00050353", clip_id="clip:ai3-a"):
    return CorpusLine(clip_id, "aishell3", LESSON, utt, "深交所副总经理周明指出。")


def synth_line(text="你好", voice="ByhETIclHirOlWnWKhHc"):
    return SynthLine("clip:tts-a", "elevenlabs", LESSON, text, voice)


def test_corpus_record_shape():
    record = gate.clip_record(line(), {"signal": SIGNAL, "heard": "深交所副总经理周明指出"}, RENDERED)
    assert list(record) == ["id", "source", "zh", "speaker", "media", "file", "lufs", "gainDb",
                            "validation", "warnings", "rights", "ingest"]
    short = record["file"]["sha256"][:16]
    assert record["media"] == f"media:{short}"
    assert record["file"]["key"] == f"media/{short}.opus"
    assert record["file"]["bytes"] == len(RENDERED.data)
    assert record["speaker"] == "spk:aishell3-ssb0005"
    assert record["validation"]["method"] == "asr-roundtrip"
    assert record["validation"]["transcriptMatch"] is True
    assert record["rights"]["license"] == "lic:apache-2-0"
    assert "at" not in record["ingest"]


def test_syllable_record_is_signal_only_with_no_zh():
    request = Syllable("clip:ac-ma1", "audio-cmn", LESSON, "ma1")
    record = gate.clip_record(request, {"signal": SIGNAL}, RENDERED)
    assert "zh" not in record
    assert record["syllable"] == "ma1"
    assert record["validation"]["method"] == "signal-only"
    assert record["speaker"] == "spk:audio-cmn"
    assert record["rights"]["source"].endswith("64k/syllabs/cmn-ma1.mp3")


def test_yoyo_rights_are_private():
    record = gate.clip_record(Syllable("clip:yo-ma1", "yoyo", LESSON, "ma1"), {"signal": SIGNAL}, RENDERED)
    assert record["rights"]["license"] == "lic:personal-use"
    assert record["rights"]["restriction"] == "personal-use-private-bucket"
    assert record["speaker"] == "spk:yoyo"


def test_word_record_says_which_validator_passed():
    request = Word("clip:ac-w-a", "audio-cmn", LESSON, "老师")
    assert gate.clip_record(request, {"signal": SIGNAL, "heard": "老师"}, RENDERED)["validation"]["method"] == "asr-toneless"
    forced = {"signal": SIGNAL, "heard": "coffee", "forced": {"老师": -1.2}}
    assert gate.clip_record(request, forced, RENDERED)["validation"]["forcedLogp"] == -1.2


def test_synth_speaker_is_a_lowercase_slug_of_the_voice():
    assert sources.speaker_id(synth_line()) == "spk:elevenlabs-byheti"


def tone_grade(accuracy, syllables):
    return {"accuracy": accuracy, "scored": len(syllables), "syllables": syllables}


def syllable(char, tone, heard, p=0.9):
    return {"char": char, "tone": tone, "accept": [tone], "heard": heard, "p": p}


def test_tone_grader_only_warns_and_never_rejects():
    grade = tone_grade(0.0, [syllable("骂", 4, 1)])
    record = gate.clip_record(synth_line("骂"), {"signal": SIGNAL, "heard": "骂", "tone": {"骂": grade}}, RENDERED)
    assert any("under the native floor" in w for w in record["warnings"])
    assert any("骂 expected 4, heard 1" in w for w in record["warnings"])


def test_tone_warnings_skip_what_the_classifier_gets_wrong_on_native_speech():
    syllables = [syllable("马", 3, 4), syllable("麻", 2, 1), syllable("骂", 4, 3), syllable("吗", 5, 1),
                 syllable("妈", 1, 4, p=0.5), syllable("好", 4, 4)]
    assert gate.tone_warnings(tone_grade(0.6, syllables)) == []


def test_an_ungraded_clip_gets_a_warning_not_a_rejection():
    assert gate.tone_warnings({"error": "too short"}) == ["tone: not graded (too short)"]


def test_media_is_sorted_by_code_point_and_stable(tmp_path):
    records = [gate.clip_record(line(clip_id=c), {"signal": SIGNAL, "heard": "x"}, RENDERED)
               for c in ("clip:b", "clip:a", "clip:B")]
    path = tmp_path / "media.yaml"
    gate.write_media(records, path)
    first = path.read_bytes()
    gate.write_media(list(reversed(records)), path)
    assert path.read_bytes() == first
    assert [r["id"] for r in yaml.safe_load(first)] == ["clip:B", "clip:a", "clip:b"]
    assert "深交所".encode("utf-8") in first


def test_empty_media_is_an_empty_list(tmp_path):
    path = tmp_path / "media.yaml"
    gate.write_media([], path)
    assert yaml.safe_load(path.read_text(encoding="utf-8")) == []


def test_write_atomic_leaves_no_temp_files(tmp_path):
    target = tmp_path / "deep" / "file.txt"
    write_atomic(target, b"one")
    write_atomic(target, b"two")
    assert target.read_bytes() == b"two"
    assert [p.name for p in target.parent.iterdir()] == ["file.txt"]


def test_synth_cache_key_tracks_everything_that_shapes_the_audio():
    base = synth.cache_key("你好", "voice1")
    assert base == synth.cache_key("你好", "voice1")
    assert base != synth.cache_key("你好吗", "voice1")
    assert base != synth.cache_key("你好", "voice2")
    assert base != synth.cache_key("你好", "voice1", model="other")
    assert base != synth.cache_key("你好", "voice1", settings={"language_code": "en"})


def test_synth_cached_audio_costs_no_call_and_usage_counts_lessons(tmp_path, monkeypatch):
    ws = Workspace(tool_root=tmp_path, repo_root=tmp_path)
    shared = SynthLine("clip:a", "elevenlabs", ("zh:les:one", "zh:les:two"), "你好", "ByhETIclHirOlWnWKhHc")
    same_audio = SynthLine("clip:b", "elevenlabs", ("zh:les:two",), "你好", "ByhETIclHirOlWnWKhHc")
    write_atomic(synth.audio_path(shared, ws), b"mp3")
    write_atomic(synth.audio_path(shared, ws).with_suffix(".json"), json.dumps({"characterCost": 7}).encode())

    def no_calls(*_):
        raise AssertionError("cached audio must not reach the API")

    monkeypatch.setattr(synth, "_call_api", no_calls)
    assert synth.synth_all([shared, same_audio], ws) == []
    usage = json.loads(ws.usage_file.read_text(encoding="utf-8"))
    assert usage["totalCharacters"] == 7
    assert usage["lessons"] == {"zh:les:one": 7, "zh:les:two": 14}


def test_synth_without_a_key_fails_that_clip_without_calling(tmp_path, monkeypatch):
    monkeypatch.delenv(synth.API_KEY_SETTING, raising=False)
    ws = Workspace(tool_root=tmp_path, repo_root=tmp_path)
    failures = synth.synth_all([synth_line()], ws)
    assert len(failures) == 1 and synth.API_KEY_SETTING in failures[0]


def test_settings_prefer_the_environment_then_the_env_file(tmp_path, monkeypatch):
    (tmp_path / ".env.development.local").write_text('A_SETTING="from-file"\n', encoding="utf-8")
    ws = Workspace(tool_root=tmp_path, repo_root=tmp_path)
    monkeypatch.delenv("A_SETTING", raising=False)
    assert ws.setting("A_SETTING") == "from-file"
    monkeypatch.setenv("A_SETTING", "from-env")
    assert ws.setting("A_SETTING") == "from-env"
    assert ws.setting("MISSING_SETTING") is None


def test_git_blob_sha1_matches_git():
    assert sources.git_blob_sha1(b"hello\n") == "ce013625030ba8dba906f756967f9e9ca394464a"


def test_audio_cmn_paths_cover_underscored_and_missing_syllables():
    assert sources.audio_cmn_path(Syllable("clip:a", "audio-cmn", LESSON, "hm1")) == "64k/syllabs/cmn-_hm1.mp3"
    assert sources.audio_cmn_path(Syllable("clip:a", "audio-cmn", LESSON, "zzz1")) is None
    assert sources.audio_cmn_path(Word("clip:a", "audio-cmn", LESSON, "老师")) == "64k/hsk/cmn-老师.mp3"
