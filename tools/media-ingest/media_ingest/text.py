"""Text comparison between what a clip should say and what a transcript or ASR says."""

import functools
import re
import unicodedata

import zhconv
from pypinyin import Style, lazy_pinyin

DIGITS = "零一二三四五六七八九"


def comparable(s: str) -> str:
    """`s` with punctuation, symbols and spaces removed, and width and case folded."""
    folded = unicodedata.normalize("NFKC", s).lower()
    return "".join(ch for ch in folded if unicodedata.category(ch)[0] in "LN")


def matches_transcript(display: str, transcript: str) -> bool:
    """True when display text says the same as the transcript, ignoring punctuation and spaces."""
    return comparable(display) == comparable(transcript)


def spoken_form(s: str) -> str:
    """`comparable`, plus simplified characters and digits read out, for comparing with ASR."""
    return comparable(_digits_to_hanzi(zhconv.convert(s, "zh-cn")))


def _number_to_hanzi(n: int) -> str:
    if n < 10:
        return DIGITS[n]
    if n < 20:
        return "十" + (DIGITS[n % 10] if n % 10 else "")
    out, zero = "", False
    for unit, name in ((100000000, "亿"), (10000, "万"), (1000, "千"), (100, "百"), (10, "十")):
        count, n = divmod(n, unit)
        if count:
            if zero and out:
                out += "零"
            out += (_number_to_hanzi(count) if count >= 10 else DIGITS[count]) + name
            zero = False
        elif out:
            zero = True
    if n:
        out += ("零" if zero else "") + DIGITS[n]
    return out


def _digits_to_hanzi(s: str) -> str:
    def read_out(m: re.Match) -> str:
        digits = m.group(0)
        is_year = len(digits) == 4 and s[m.end():m.end() + 1] == "年"
        if is_year or len(digits) > 8:
            return "".join(DIGITS[int(c)] for c in digits)
        return _number_to_hanzi(int(digits))
    return re.sub(r"\d+", read_out, s)


@functools.lru_cache(maxsize=None)
def _toneless(ch: str) -> str:
    return lazy_pinyin(ch, style=Style.NORMAL)[0]


def _levenshtein(a: list | str, b: list | str) -> int:
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return prev[-1]


def cer(reference: str, heard: str) -> float:
    """Character error rate over spoken forms."""
    ref, hyp = spoken_form(reference), spoken_form(heard)
    return _levenshtein(ref, hyp) / max(1, len(ref))


def per(reference: str, heard: str) -> float:
    """Toneless pinyin error rate over spoken forms, so homophones count as correct."""
    ref = [_toneless(c) for c in spoken_form(reference)]
    hyp = [_toneless(c) for c in spoken_form(heard)]
    return _levenshtein(ref, hyp) / max(1, len(ref))
