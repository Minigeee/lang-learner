"""Count lesson-eligible example sentences per S1/S2 lesson idea.

Run from this folder with the spike venv, isolated:
    .venv/Scripts/python -I coverage.py

Reads patterns.yaml and the downloaded exports in data/ (see FINDINGS.md for
where each came from). Writes out/lessons.csv, out/units.csv, out/words.csv,
out/sources.csv and out/samples.txt.

Status per lesson idea, against the target of >= 5 sentences and >= 4 voices:
  green   met today from audio we can already legitimately hold
          (Tatoeba rows with a license + Global Storybooks pages)
  yellow  met only once Common Voice clips are pulled (account needed), assuming
          each candidate sentence yields at least one validated, distinct voice
  red     not met even with Common Voice candidates

When the full CV dataset is present (sandbox/data/fetch_common_voice.py), the
status_measured columns replace that assumption with real recordings: distinct
voices are distinct client_ids on clips of the matched sentences.
  green          met with validated clips
  green_checked  met only by also using unvalidated ("other") clips, which need
                 an automated ASR agreement check before use
  red            not met

When Apache-2.0 OpenSLR transcripts are present (sandbox/data/fetch_openslr_transcripts.py),
status_plus adds AISHELL-1, AISHELL-3 and THCHS-30 recordings to the validated CV clips.
"""

import csv
import html
import pathlib
import re
import sys
from collections import defaultdict

import yaml
from opencc import OpenCC

HERE = pathlib.Path(__file__).resolve().parent
DATA = HERE / "data"
CV_FULL = HERE.parents[1] / "data" / "common-voice-zh-CN"
OPENSLR = HERE.parents[1] / "data" / "openslr"
OUT = HERE / "out"
TARGET_SENTENCES = 5
TARGET_VOICES = 4
HANZI = re.compile(r"[一-鿿]")
LATIN = re.compile(r"[A-Za-z]")
t2s = OpenCC("t2s")


def norm(text):
    return t2s.convert(re.sub(r"\s+", "", text.strip()))


def load_hsk():
    """Return {level: set(words)} for HSK 2025 levels 1-3."""
    words = defaultdict(set)
    for n in (1, 2, 3):
        for line in (DATA / "hsk" / f"words_L{n}.txt").read_text(encoding="utf-8").splitlines():
            cols = line.split("\t")
            if len(cols) > 4 and cols[0]:
                words[n].add(cols[0])
    return words


def load_tatoeba():
    """Return (sentences {id: text}, audio {id: [(user, license)]}) for cmn."""
    sents = {}
    with open(DATA / "tatoeba" / "cmn_sentences.tsv", encoding="utf-8") as f:
        for line in f:
            sid, lang, text = line.rstrip("\n").split("\t", 2)
            sents[sid] = norm(text)
    audio = defaultdict(list)
    with open(DATA / "tatoeba" / "sentences_with_audio.csv", encoding="utf-8") as f:
        for line in f:
            cols = line.rstrip("\n").split("\t")
            if cols[0] in sents:
                audio[cols[0]].append((cols[2], cols[3] if len(cols) > 3 else ""))
    return sents, audio


def load_cv():
    """Return {text: origin file} for the zh-CN sentence text in the CV repo."""
    out = {}
    for name in ("cn.txt", "sentence-collector.txt", "wiki.zh-cn.txt"):
        for line in (DATA / "cv" / name).read_text(encoding="utf-8").splitlines():
            if line.strip():
                out.setdefault(norm(line), name)
    return out


def load_cv_clips():
    """Return {text: {"validated": set(client_id), "other": set(client_id)}} from the full dataset, or None."""
    if not (CV_FULL / ".complete").exists():
        return None
    clips = defaultdict(lambda: {"validated": set(), "other": set()})
    for pool in ("validated", "other"):
        path = next(CV_FULL.rglob(f"{pool}.tsv"))
        with open(path, encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE):
                clips[norm(row["sentence"])][pool].add(row["client_id"])
    return clips


def load_openslr():
    """Return {corpus: {text: set(speaker)}} for each fetched OpenSLR transcript file."""
    out = {}
    for path in sorted(OPENSLR.glob("*.tsv")) if OPENSLR.exists() else []:
        texts = defaultdict(set)
        with open(path, encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE, escapechar="\\"):
                texts[norm(row["sentence"])].add(row["speaker"])
        out[path.stem] = texts
    return out


def load_gs():
    """Return [(story, level, sentence)] from the Global Storybooks zh pages."""
    rows = []
    for path in sorted((DATA / "gs").glob("zh_*.html")):
        page = path.read_text(encoding="utf-8")
        level = re.search(r'level(\d)-txt def', page)
        level = int(level.group(1)) if level else 0
        for block in re.findall(r'level\d-txt def"><h3>(.*?)</h3>', page, re.S):
            text = html.unescape(re.sub(r"<[^>]+>", "", block))
            for s in re.findall(r"[^。！？!?]+[。！？!?]?", norm(text)):
                if HANZI.search(s):
                    rows.append((path.stem, level, s))
    return rows


def load_ac_words():
    import json
    tree = json.loads((DATA / "ac" / "tree.json").read_text(encoding="utf-8"))
    words = set()
    for item in tree["tree"]:
        m = re.match(r"64k/hsk/cmn-(.+)\.mp3$", item["path"])
        if m:
            words.add(m.group(1).split("_")[0])
    return words


def make_fit(settings, hsk):
    """Build the learner-fit predicate for each stage from patterns.yaml settings."""
    names = settings.get("known_names", [])
    fits = {}
    for stage in ("S1", "S2"):
        cfg = settings[stage]
        chars = set()
        for lvl in cfg["allowed_levels"]:
            for w in hsk[lvl]:
                chars.update(w)

        def fit(text, cfg=cfg, chars=chars):
            if LATIN.search(text):
                return False
            for n in names:
                text = text.replace(n, "")
            hz = HANZI.findall(text)
            if not hz or len(hz) > cfg["max_hanzi"]:
                return False
            return sum(1 for c in hz if c not in chars) <= cfg["max_unknown_chars"]

        fits[stage] = fit
    return fits


def main():
    spec = yaml.safe_load((HERE / "patterns.yaml").read_text(encoding="utf-8"))
    hsk = load_hsk()
    fits = make_fit(spec["settings"], hsk)
    tb_sents, tb_audio = load_tatoeba()
    cv = load_cv()
    cv_clips = load_cv_clips()
    print("CV dataset:", f"{len(cv_clips)} sentences with clips" if cv_clips else "not present, measured columns skipped")
    openslr = load_openslr()
    print("OpenSLR:", {c: len(t) for c, t in openslr.items()} or "not present")
    # Learner-fit first: the fit rule is cheaper than running every pattern over every sentence.
    openslr_fit = {st: {c: [t for t in texts if fits[st](t)] for c, texts in openslr.items()} for st in ("S1", "S2")}
    gs = load_gs()
    ac_words = load_ac_words()

    # Dedupe Tatoeba by text, keeping the union of its recordings.
    tb_by_text = defaultdict(list)
    for sid, text in tb_sents.items():
        tb_by_text[text].extend(tb_audio.get(sid, []))

    lessons = [(u, l) for u in spec["units"] for l in u["lessons"]]
    by_id = {l["id"]: l for _, l in lessons}
    matches = {}  # lesson id -> {source: set(text)}

    def match(lesson, stage):
        if lesson["id"] in matches:
            return matches[lesson["id"]]
        res = defaultdict(set)
        if lesson.get("union"):
            for ref in lesson["union"]:
                for k, v in match(by_id[ref], stage).items():
                    res[k] |= v
        elif lesson.get("re"):
            rx = re.compile(lesson["re"])
            fit = fits[stage]
            for text, recs in tb_by_text.items():
                if rx.search(text):
                    res["tb_raw"].add(text)
                    if fit(text):
                        lic = [r for r in recs if r[1]]
                        if lic:
                            res["tb_lic"].add(text)
                        elif recs:
                            res["tb_unlic"].add(text)
                        else:
                            res["tb_text"].add(text)
            for text, origin in cv.items():
                if rx.search(text):
                    res["cv_raw"].add(text)
                    if fit(text):
                        res["cv"].add(text)
                        res["cv_" + origin.split(".")[0]].add(text)
            for text, voices in (cv_clips or {}).items():
                if rx.search(text) and fit(text):
                    res["cvm_" + ("validated" if voices["validated"] else "other")].add(text)
                    if cv.get(text, "").startswith("wiki"):
                        res["cvm_wiki"].add(text)
            for corpus, texts in openslr_fit[stage].items():
                for text in texts:
                    if rx.search(text):
                        res["os_" + corpus].add(text)
            for story, level, text in gs:
                if rx.search(text):
                    res["gs_raw"].add(text)
                    if fit(text):
                        res["gs"].add(text)
        matches[lesson["id"]] = res
        return res

    OUT.mkdir(exist_ok=True)
    rows = []
    samples = []
    for unit, lesson in lessons:
        stage = "S1" if unit["unit"].startswith("1") else "S2"
        m = match(lesson, stage)
        tb_users = sorted({u for t in m["tb_lic"] for u, lic in tb_by_text[t] if lic})
        now_sent = len(m["tb_lic"]) + len(m["gs"])
        now_voices = len(tb_users) + (1 if m["gs"] else 0)  # all GS stories: one narrator
        cv_n = len(m["cv"])
        proj_sent = now_sent + cv_n
        proj_voices = now_voices + cv_n  # conservative: >= 1 distinct voice per CV sentence
        if lesson.get("no_text"):
            status = "red"
        elif now_sent >= TARGET_SENTENCES and now_voices >= TARGET_VOICES:
            status = "green"
        elif proj_sent >= TARGET_SENTENCES and proj_voices >= TARGET_VOICES:
            status = "yellow"
        else:
            status = "red"
        # Scenario columns, same thresholds:
        #   strict: CV candidates from Wikipedia text excluded (often fragments)
        #   relicensed: Tatoeba's unlicensed cmn recorders add a license
        cv_strict = len(m["cv"] - m["cv_wiki"])
        strict_ok = (now_sent + cv_strict >= TARGET_SENTENCES
                     and now_voices + cv_strict >= TARGET_VOICES)
        all_users = sorted({u for t in m["tb_lic"] | m["tb_unlic"] for u, _ in tb_by_text[t]})
        rel_sent = now_sent + len(m["tb_unlic"])
        rel_voices = len(all_users) + (1 if m["gs"] else 0)
        if lesson.get("no_text"):
            strict, relicensed = "red", "red"
        else:
            strict = status if status == "green" else ("yellow" if strict_ok else "red")
            relicensed = ("green" if rel_sent >= TARGET_SENTENCES and rel_voices >= TARGET_VOICES
                          else "not_green")
        measured = {}
        if cv_clips is not None:
            def meets(texts, pools):
                ids = {c for t in texts for p in pools for c in cv_clips[t][p]}
                return (now_sent + len(texts) >= TARGET_SENTENCES
                        and now_voices + len(ids) >= TARGET_VOICES), len(ids)

            def measure(exclude):
                v = m["cvm_validated"] - exclude
                ok_v, _ = meets(v, ("validated",))
                ok_all, _ = meets(v | (m["cvm_other"] - exclude), ("validated", "other"))
                if lesson.get("no_text"):
                    return "red"
                return "green" if status == "green" or ok_v else ("green_checked" if ok_all else "red")

            _, v_voices = meets(m["cvm_validated"], ("validated",))
            measured = {
                "cv_validated_fit": len(m["cvm_validated"]), "cv_validated_voices": v_voices,
                "cv_other_only_fit": len(m["cvm_other"]),
                "status_measured": measure(set()),
                "status_measured_no_wiki": measure(m["cvm_wiki"]),
            }
        if cv_clips is not None and openslr:
            texts = set(m["cvm_validated"])
            ids = {c for t in m["cvm_validated"] for c in cv_clips[t]["validated"]}
            for corpus, corpus_texts in openslr.items():
                fit_here = m["os_" + corpus]
                measured[f"{corpus}_fit"] = len(fit_here)
                texts |= fit_here
                ids |= {f"{corpus}:{s}" for t in fit_here for s in corpus_texts[t]}
            ok = now_sent + len(texts) >= TARGET_SENTENCES and now_voices + len(ids) >= TARGET_VOICES
            measured["plus_sentences"] = now_sent + len(texts)
            measured["status_plus"] = "red" if lesson.get("no_text") else ("green" if measured["status_measured"] == "green" or ok else measured["status_measured"])
        words = lesson.get("words") or []
        rows.append({
            "stage": stage, "unit": unit["unit"], "unit_title": unit["title"],
            "lesson": lesson["id"], "idea": lesson["idea"],
            "kind": "no_text" if lesson.get("no_text") else ("clip" if lesson.get("clip") else
                    ("contrast" if lesson.get("union") else "pattern")),
            "tb_licensed_fit": len(m["tb_lic"]), "tb_licensed_users": len(tb_users),
            "tb_unlicensed_audio_fit": len(m["tb_unlic"]), "tb_text_only_fit": len(m["tb_text"]),
            "tb_raw": len(m["tb_raw"]),
            "gs_fit": len(m["gs"]), "gs_raw": len(m["gs_raw"]),
            "cv_fit": cv_n, "cv_fit_conversational": len(m["cv_cn"]),
            "cv_fit_collector": len(m["cv_sentence-collector"]), "cv_fit_wiki": len(m["cv_wiki"]),
            "cv_raw": len(m["cv_raw"]),
            "now_sentences": now_sent, "now_voices": now_voices,
            "projected_sentences_with_cv": proj_sent,
            "text_only_needing_audio": len(m["tb_text"]) + len(m["tb_unlic"]),
            "words": len(words), "words_with_ac_audio": sum(1 for w in words if w in ac_words),
            "status": status, "status_strict_cv": strict,
            "relicensed_sentences": rel_sent, "relicensed_voices": rel_voices,
            "status_if_tatoeba_relicensed": relicensed,
            **measured,
        })
        samples.append(f"## {lesson['id']} {lesson['idea']}  [{status}]")
        for src in ("tb_lic", "gs", "cvm_validated", "cv", "tb_text"):
            ex = sorted(m[src], key=len)[:4]
            if ex:
                samples.append(f"  {src}: " + " | ".join(ex))

    with open(OUT / "lessons.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    (OUT / "samples.txt").write_text("\n".join(samples) + "\n", encoding="utf-8")

    units = {}
    for r in rows:
        u = units.setdefault(r["unit"], {"stage": r["stage"], "unit": r["unit"], "title": r["unit_title"],
                                         "lessons": 0, "green": 0, "yellow": 0, "red": 0,
                                         "min_cv_fit": 10**9, "min_now_sentences": 10**9})
        u["lessons"] += 1
        u[r["status"]] += 1
        u["min_cv_fit"] = min(u["min_cv_fit"], r["cv_fit"])
        u["min_now_sentences"] = min(u["min_now_sentences"], r["now_sentences"])
    with open(OUT / "units.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(next(iter(units.values()))))
        w.writeheader()
        w.writerows(units.values())

    # HSK 2025 word audio coverage from audio-cmn (two voices, HSK 2.0 based).
    with open(OUT / "words.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["hsk_level", "words", "with_ac_audio", "share"])
        for lvl in (1, 2, 3):
            n = len(hsk[lvl]); k = sum(1 for x in hsk[lvl] if x in ac_words)
            w.writerow([lvl, n, k, f"{k / n:.3f}"])
        missing = sorted(x for lvl in (1, 2, 3) for x in hsk[lvl] if x not in ac_words)
    (OUT / "words_missing_ac.txt").write_text("\n".join(missing) + "\n", encoding="utf-8")

    # Source-level totals, for the FINDINGS source table.
    lic = defaultdict(int)
    for recs in tb_audio.values():
        for user, l in recs:
            lic[(user, l or "(none)")] += 1
    fit_any = fits["S2"]
    with open(OUT / "sources.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["source", "item", "count"])
        w.writerow(["tatoeba", "cmn sentences (unique text)", len(tb_by_text)])
        w.writerow(["tatoeba", "cmn sentences learner-fit (S2 rule)", sum(1 for t in tb_by_text if fit_any(t))])
        for (user, l), n in sorted(lic.items(), key=lambda kv: -kv[1]):
            w.writerow(["tatoeba", f"cmn recordings by {user} license={l}", n])
        w.writerow(["cv-repo", "zh-CN sentences (unique)", len(cv)])
        for name in ("cn", "sentence-collector", "wiki"):
            w.writerow(["cv-repo", f"from {name}", sum(1 for o in cv.values() if o.startswith(name))])
        w.writerow(["cv-repo", "learner-fit (S2 rule)", sum(1 for t in cv if fit_any(t))])
        w.writerow(["cv-repo", "learner-fit (S1 rule)", sum(1 for t in cv if fits["S1"](t))])
        w.writerow(["gs", "stories", len({s for s, _, _ in gs})])
        w.writerow(["gs", "sentences", len(gs)])
        w.writerow(["gs", "learner-fit (S2 rule)", sum(1 for _, _, t in gs if fit_any(t))])
        w.writerow(["audio-cmn", "HSK word files (unique words)", len(ac_words)])

    if cv_clips is not None:
        with open(OUT / "sources.csv", "a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["cv-full", "sentences with a validated clip", sum(1 for v in cv_clips.values() if v["validated"])])
            w.writerow(["cv-full", "sentences with only unvalidated clips", sum(1 for v in cv_clips.values() if not v["validated"])])
            w.writerow(["cv-full", "learner-fit with a validated clip (S2 rule)",
                        sum(1 for t, v in cv_clips.items() if v["validated"] and fit_any(t))])
            w.writerow(["cv-full", "learner-fit with a validated clip (S1 rule)",
                        sum(1 for t, v in cv_clips.items() if v["validated"] and fits["S1"](t))])
            w.writerow(["cv-full", "distinct voices (validated)", len({c for v in cv_clips.values() for c in v["validated"]})])

    if openslr:
        with open(OUT / "sources.csv", "a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            for corpus, texts in openslr.items():
                w.writerow([f"openslr-{corpus}", "unique sentences", len(texts)])
                w.writerow([f"openslr-{corpus}", "speakers", len({s for v in texts.values() for s in v})])
                w.writerow([f"openslr-{corpus}", "learner-fit (S1 rule)", len(openslr_fit["S1"][corpus])])
                w.writerow([f"openslr-{corpus}", "learner-fit (S2 rule)", len(openslr_fit["S2"][corpus])])

    cols = ["status", "status_strict_cv", "status_if_tatoeba_relicensed"]
    if cv_clips is not None:
        cols += ["status_measured", "status_measured_no_wiki"]
    if cv_clips is not None and openslr:
        cols += ["status_plus"]
        flipped = [r["lesson"] for r in rows if r["status_measured"] != "green" and r["status_plus"] == "green"]
        print("red or checked -> green with OpenSLR:", flipped)
    for col in cols:
        tally = defaultdict(int)
        for r in rows:
            tally[(r["stage"], r[col])] += 1
        print(col, dict(sorted(tally.items())))
    print("lessons:", len(rows))


if __name__ == "__main__":
    sys.exit(main())
