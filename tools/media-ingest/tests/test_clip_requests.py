import pytest

from media_ingest.clip_requests import CorpusLine, RequestsError, Syllable, SynthLine, Word, parse_requests

LESSONS = ["zh:les:greetings"]


def entry(**fields):
    return {"id": "clip:x", "lessons": LESSONS, **fields}


def test_every_source_shape_parses_to_its_type():
    parsed = parse_requests([
        {**entry(source="aishell3", utt="SSB00050001", zh="我是学生。"), "id": "clip:ai3-a"},
        {**entry(source="aishell1", utt="BAC009S0724W0121", zh="你好"), "id": "clip:ai1-a"},
        {**entry(source="audio-cmn", syllable="ma1"), "id": "clip:ac-ma1"},
        {**entry(source="audio-cmn", word="老师"), "id": "clip:ac-w-laoshi"},
        {**entry(source="yoyo", syllable="lv4"), "id": "clip:yo-lv4"},
        {**entry(source="elevenlabs", text="他是老师吗？", voice="ByhETIclHirOlWnWKhHc"), "id": "clip:tts-a"},
    ])
    assert [type(r) for r in parsed] == [CorpusLine, CorpusLine, Syllable, Word, Syllable, SynthLine]
    assert parsed[0].lessons == tuple(LESSONS)
    assert parsed[3].zh == "老师"
    assert parsed[2].zh is None


def test_empty_document_is_no_requests():
    assert parse_requests(None) == []


@pytest.mark.parametrize("bad, expected", [
    (entry(source="nope", zh="x"), "unknown source"),
    (entry(source="aishell3", utt="SSB00050001"), "zh"),
    (entry(source="aishell3", utt="BAC009S0724W0121", zh="x"), "utt"),
    (entry(source="aishell1", utt="SSB00050001", zh="x"), "utt"),
    (entry(source="audio-cmn", syllable="ma"), "syllable"),
    (entry(source="audio-cmn", syllable="ma1", word="妈"), "unexpected fields"),
    (entry(source="yoyo", word="妈"), "unexpected fields"),
    (entry(source="elevenlabs", text="x"), "voice"),
    (entry(source="elevenlabs", text="x", voice="short"), "voice"),
    ({**entry(source="yoyo", syllable="ma1"), "id": "clip:Has Caps"}, "clip:<slug>"),
    ({**entry(source="yoyo", syllable="ma1"), "lessons": []}, "lessons"),
    ({**entry(source="yoyo", syllable="ma1"), "lessons": ["bad"]}, "lesson"),
])
def test_invalid_entries_are_rejected_with_a_reason(bad, expected):
    with pytest.raises(RequestsError) as caught:
        parse_requests([bad])
    assert expected in str(caught.value)


def test_every_problem_is_reported_at_once():
    with pytest.raises(RequestsError) as caught:
        parse_requests([entry(source="nope"), entry(source="yoyo")])
    assert len(caught.value.problems) == 2


def test_duplicate_ids_are_rejected():
    same = entry(source="yoyo", syllable="ma1")
    with pytest.raises(RequestsError, match="duplicate id"):
        parse_requests([same, same])


def test_document_must_be_a_list():
    with pytest.raises(RequestsError):
        parse_requests({"id": "clip:x"})
