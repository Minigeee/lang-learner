from media_ingest.text import cer, comparable, matches_transcript, per, spoken_form


def test_punctuation_and_spaces_are_ignored():
    assert matches_transcript("你好，世界！", "你好世界")
    assert matches_transcript("“他 是 老师吗？”", "他是老师吗")
    assert matches_transcript("Ａｂ c。", "abc")


def test_different_words_do_not_match():
    assert not matches_transcript("他是老师吗？", "她是老师吗")
    assert not matches_transcript("你好", "你好吗")


def test_digits_are_not_equated_with_read_out_numbers_in_display_text():
    assert not matches_transcript("3个", "三个")
    assert comparable("3个") == "3个"


def test_spoken_form_reads_digits_and_simplifies():
    assert spoken_form("2008年") == "二零零八年"
    assert spoken_form("25個。") == "二十五个"


def test_homophones_cost_character_errors_but_no_pinyin_errors():
    assert cer("他是老师", "她是老师") == 0.25
    assert per("他是老师", "她是老师") == 0.0


def test_per_counts_real_differences():
    assert per("你好", "再见") == 1.0


def test_error_rates_survive_empty_reference():
    assert cer("", "") == 0.0
