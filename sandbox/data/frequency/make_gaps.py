"""Frequent words that HSK 2025 L1-3 misses: the top N subtitle words, deduplicated against the HSK list.

Usage (needs hsk30, wordfreq[cjk] and opencc-python-reimplemented):  python -I -X utf8 make_gaps.py [N=1200]

Rank comes from OpenSubtitles 2018 zh_cn (hermitdave/FrequencyWords, CC BY-SA 4.0): film and TV subtitles,
the closest open match to drama input, though mostly translated Western films. Traditional forms are converted
to simplified and their counts merged. Tokens that aren't CC-CEDICT entries are dropped as segmenter or
subtitle-file artifacts. Writes gaps-top<N>.tsv with only the words not already in ../hsk2025/words-l1-3.tsv;
rows with an empty `flags` column are the ones to place.
"""
import collections
import csv
import re
import sys
from pathlib import Path

import hsk30
import wordfreq
from opencc import OpenCC

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
N = int(sys.argv[1]) if len(sys.argv) > 1 else 1200
HAN = re.compile(r"^[一-鿿]+$")
t2s = OpenCC("t2s")
# Subtitle-file furniture that survives as tokens (font foundries and names, credits).
ARTIFACTS = {"方正", "黑体", "宋体", "楷体", "字幕", "字幕组", "翻译", "校对", "时间轴", "片源", "压制", "特效", "后期"}
# A token made of a pronoun, negation, modal, number or measure plus a known word is a segmenter join, not a new word.
GLUE_FIRST = set("不没我你他她它这那很要会能想一两几每有别再还也都就才")
GLUE_LAST = set("个了的们吗吧呢着过次种件位只条张本天年")

hsk = set()
with open(REPO / "sandbox/data/hsk2025/words-l1-3.tsv", encoding="utf-8") as f:
    for r in csv.DictReader(f, delimiter="\t"):
        hsk.add(r["word"])
glosses = collections.defaultdict(list)  # simplified headword -> one gloss string per CC-CEDICT entry
with open(REPO / "sandbox/spikes/authoring-format/data/cedict/cedict.txt", encoding="utf-8") as f:
    for line in f:
        m = re.match(r"\S+ (\S+) \[[^\]]*\] /(.*)/", line)
        if m and not line.startswith("#"):
            glosses[m.group(1)].append(m.group(2))
official = hsk30.words("2025")
blended = {w: i + 1 for i, w in enumerate(wordfreq.top_n_list("zh", 5000))}


def glued(w):
    return len(w) >= 2 and any(
        w[:i] in hsk and w[i:] in hsk and (w[:i] in GLUE_FIRST or w[i:] in GLUE_LAST)
        for i in range(1, len(w)))


def proper(w):
    """Every gloss of every entry is a name: capitalized (not an exclamation like 'Good night!'), or a surname."""
    def name(g):
        return (re.match(r"^[A-Z]", g) and not g.rstrip().endswith("!")) or re.search(r"\b(surname|\(name\))", g)
    return bool(glosses[w]) and all(all(name(g) for g in e.split("/") if g) for e in glosses[w])


counts = collections.Counter()
for line in (HERE / "zh_cn_50k.txt").read_text(encoding="utf-8").splitlines():
    word, count = line.rsplit(" ", 1)
    if HAN.match(word):
        counts[t2s.convert(word)] += int(count)

rows, rank = [], 0
for word, count in counts.most_common():
    if word not in glosses or word in ARTIFACTS:
        continue
    rank += 1
    if rank > N:
        break
    if word in hsk:
        continue
    flags = [f for f, hit in (("glued", glued(word)), ("proper noun", proper(word))) if hit]
    rows.append({"word": word, "subtitle_rank": rank, "subtitle_count": count, "blended_rank": blended.get(word, ""),
                 "hsk2025_level": official.get(word, ""), "wordfreq_zipf": round(wordfreq.zipf_frequency(word, "zh"), 2),
                 "flags": ", ".join(flags)})
out = HERE / f"gaps-top{N}.tsv"
with open(out, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0]), delimiter="\t")
    w.writeheader()
    w.writerows(rows)
place = [r for r in rows if not r["flags"]]
print(f"top {N} subtitle words: {len(rows)} not in HSK 2025 L1-3; {len(place)} to place "
      f"({sum(1 for r in place if r['hsk2025_level'])} are HSK 4+); flagged: "
      f"{sum(1 for r in rows if 'glued' in r['flags'])} glued, {sum(1 for r in rows if 'proper noun' in r['flags'])} proper nouns -> {out.name}")
print("proper nouns:", " ".join(r["word"] for r in rows if "proper noun" in r["flags"]))
