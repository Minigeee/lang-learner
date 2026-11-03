"""Download the approved spike data into data/ (untrusted). Run: python -I fetch.py <data_dir>

audio-cmn: a seeded subset of 64k syllables and HSK2012 L1-3 words.
Global Storybooks zh: story page HTML (text + credits), full narration mp3, per-page mp3s.
Writes <data_dir>/downloads.json with every URL and byte count.
"""
import json, os, random, sys, time, urllib.request, urllib.parse, re

DATA = os.path.abspath(sys.argv[1])
CMN_RAW = "https://raw.githubusercontent.com/hugolpz/audio-cmn/master/"
GS_PAGE = "https://raw.githubusercontent.com/global-asp/storybooks-minnesota/master/stories/zh/{id}/index.html"
GS_AUDIO = "https://globalstorybooks.net/media/audio/zh/{id}/"
STORIES = {"0087": "read", "0337": "wax", "0110": "wangari", "0262": "magozwe"}
N_SYL, N_WORD, SEED = 300, 300, 42

log = []


def get(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        log.append({"url": url, "bytes": os.path.getsize(dest), "path": os.path.relpath(dest, DATA)})
        return True
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                body = r.read()
            with open(dest, "wb") as f:
                f.write(body)
            log.append({"url": url, "bytes": len(body), "path": os.path.relpath(dest, DATA)})
            return True
        except urllib.error.HTTPError as e:
            if e.code == 404:
                log.append({"url": url, "bytes": 0, "error": 404})
                return False
            time.sleep(1 + attempt)
        except Exception:
            time.sleep(1 + attempt)
    log.append({"url": url, "bytes": 0, "error": "failed"})
    return False


def audio_cmn():
    tree = json.load(open(os.path.join(DATA, "audio-cmn", "tree.json"), encoding="utf-8"))
    paths = [e["path"] for e in tree["tree"] if e["type"] == "blob"]
    syl = sorted(p for p in paths if p.startswith("64k/syllabs/") and p.endswith(".mp3"))
    hsk = {p[len("64k/hsk/cmn-"):-4]: p for p in paths if p.startswith("64k/hsk/") and p.endswith(".mp3")}
    words = []
    for lvl in (1, 2, 3):
        dest = os.path.join(DATA, "audio-cmn", "lists", f"HSK2012_{lvl}.txt")
        get(CMN_RAW + f"lists/HSK2012_{lvl}.txt", dest)
        for w in open(dest, encoding="utf-8").read().split():
            if w in hsk and w not in words:
                words.append(w)
    rnd = random.Random(SEED)
    pick_syl = rnd.sample(syl, N_SYL)
    pick_words = words[:N_WORD]
    for p in pick_syl + [hsk[w] for w in pick_words]:
        get(CMN_RAW + urllib.parse.quote(p), os.path.join(DATA, "audio-cmn", p))


def storybooks():
    for sid, short in STORIES.items():
        d = os.path.join(DATA, "storybooks", sid)
        page = os.path.join(d, "index.html")
        get(GS_PAGE.format(id=sid), page)
        get(GS_AUDIO.format(id=sid) + f"zh-{sid}_{short}.mp3", os.path.join(d, "full.mp3"))
        n_pages = len(re.findall(r'<audio id="audio\d+"', open(page, encoding="utf-8").read()))
        for i in range(1, n_pages + 1):
            get(GS_AUDIO.format(id=sid) + f"mp3/{i:02d}.mp3", os.path.join(d, "pages", f"{i:02d}.mp3"))


if __name__ == "__main__":
    audio_cmn()
    storybooks()
    get("https://raw.githubusercontent.com/global-asp/gsn-audio/master/README.md",
        os.path.join(DATA, "storybooks", "gsn-audio-README.md"))
    json.dump(log, open(os.path.join(DATA, "downloads.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    ok = [e for e in log if e.get("bytes")]
    print(f"{len(ok)} files, {sum(e['bytes'] for e in ok)/1e6:.1f} MB; errors: {[e['url'] for e in log if 'error' in e]}")
