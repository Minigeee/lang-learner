"""Stream Apache-2.0 Mandarin speech corpora from OpenSLR and keep only their transcripts.

Usage:  python -I sandbox/data/fetch_openslr_transcripts.py [aishell1 aishell3 thchs30]

The audio is read past and discarded, so this downloads each archive once but writes only
openslr/<corpus>.tsv (utt, speaker, sentence). Nothing is extracted to disk. A corpus whose
TSV already exists is skipped; delete it to fetch again.
"""

import csv
import sys
import tarfile
import time
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent / "openslr"
USER_AGENT = "lang-learner-fetch/1.0"
MIRROR = "https://www.openslr.org/resources"


def aishell1(name, f):
    # data_aishell/transcript/aishell_transcript_v0.8.txt: "BAC009S0002W0122 而 对 楼市 ..." (speaker S0002)
    if not name.endswith("aishell_transcript_v0.8.txt"):
        return
    for line in f.read().decode("utf-8").splitlines():
        utt, _, text = line.partition(" ")
        if text:
            yield utt, utt[6:11], text.replace(" ", "")


def aishell3(name, f):
    # data_aishell3/{train,test}/content.txt: "SSB00050001.wav\t广 guang3 州 zhou1 ..." (speaker SSB0005)
    if not name.endswith("/content.txt"):
        return
    for line in f.read().decode("utf-8").splitlines():
        wav, _, rest = line.partition("\t")
        tokens = rest.split()
        if tokens:
            yield wav.removesuffix(".wav"), wav[:7], "".join(tokens[0::2])


def thchs30(name, f):
    # data_thchs30/data/A2_0.wav.trn: line 1 is the words, line 2 pinyin, line 3 phones (speaker A2)
    if "/data/" not in name or not name.endswith(".wav.trn"):
        return
    first = f.read().decode("utf-8").splitlines()[0]
    utt = name.rsplit("/", 1)[1].removesuffix(".wav.trn")
    yield utt, utt.split("_")[0], first.replace(" ", "")


CORPORA = {
    "aishell1": (f"{MIRROR}/33/data_aishell.tgz", aishell1, 1),
    "aishell3": (f"{MIRROR}/93/data_aishell3.tgz", aishell3, 2),
    "thchs30": (f"{MIRROR}/18/data_thchs30.tgz", thchs30, None),
}


class Counting:
    """Wraps the response so progress can be logged while tarfile reads it."""

    def __init__(self, raw, total):
        self.raw, self.total, self.n, self.last = raw, total, 0, time.time()

    def read(self, size=-1):
        b = self.raw.read(size)
        self.n += len(b)
        if time.time() - self.last > 60:
            print(time.strftime("%H:%M:%S"), f"  {self.n / 1e9:.2f} / {self.total / 1e9:.2f} GB", flush=True)
            self.last = time.time()
        return b


def fetch(corpus):
    url, parse, wanted = CORPORA[corpus]
    dest = OUT / f"{corpus}.tsv"
    if dest.exists():
        print(f"{corpus}: {dest} exists, skipping", flush=True)
        return
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    rows, found = [], 0
    with urllib.request.urlopen(req, timeout=120) as r:
        stream = Counting(r, int(r.headers.get("Content-Length", 0)))
        print(time.strftime("%H:%M:%S"), f"{corpus}: streaming {stream.total / 1e9:.1f} GB", flush=True)
        with tarfile.open(fileobj=stream, mode="r|gz") as tar:
            for member in tar:
                if not member.isfile() or member.size > 50_000_000:
                    continue
                got = list(parse(member.name, tar.extractfile(member))) if member.name.endswith((".txt", ".trn")) else []
                if got:
                    rows += got
                    found += 1
                    if wanted and found >= wanted:
                        break  # every transcript file this corpus has; skip the rest of the audio
    OUT.mkdir(exist_ok=True)
    tmp = dest.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_NONE, escapechar="\\")
        w.writerow(["utt", "speaker", "sentence"])
        w.writerows(rows)
    tmp.replace(dest)
    print(time.strftime("%H:%M:%S"), f"{corpus}: {len(rows)} utterances, {len({s for _, s, _ in rows})} speakers -> {dest.name}", flush=True)


if __name__ == "__main__":
    for c in sys.argv[1:] or list(CORPORA):
        fetch(c)
