"""Save a few AISHELL-3 clips to listen to, streaming only the start of the archive.

Usage:  python -I -X utf8 sandbox/data/sample_aishell3.py [speakers=8] [per_speaker=2]

Writes openslr/aishell3-samples/<utt>.wav plus samples.tsv (utt, speaker, sentence) using the
transcripts from fetch_openslr_transcripts.py. Stops downloading as soon as it has enough.
"""

import csv
import sys
import tarfile
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
URL = "https://openslr.elda.org/resources/93/data_aishell3.tgz"
OUT = HERE / "openslr" / "aishell3-samples"


def main():
    speakers, per_speaker = (int(a) for a in (sys.argv[1:3] + ["8", "2"][len(sys.argv[1:3]):]))
    text = {}
    with open(HERE / "openslr" / "aishell3.tsv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE, escapechar="\\"):
            text[row["utt"]] = row["sentence"]
    OUT.mkdir(parents=True, exist_ok=True)
    saved, per = [], {}
    req = urllib.request.Request(URL, headers={"User-Agent": "lang-learner-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r, tarfile.open(fileobj=r, mode="r|gz") as tar:
        for m in tar:
            if not (m.isfile() and m.name.endswith(".wav")):
                continue
            utt = m.name.rsplit("/", 1)[1].removesuffix(".wav")
            spk = utt[:7]
            if per.get(spk, 0) >= per_speaker or (spk not in per and len(per) >= speakers):
                if len(per) >= speakers and all(n >= per_speaker for n in per.values()):
                    break
                continue
            (OUT / f"{utt}.wav").write_bytes(tar.extractfile(m).read())  # flat name: never trusts archive paths
            per[spk] = per.get(spk, 0) + 1
            saved.append((utt, spk, text.get(utt, "")))
            print(utt, text.get(utt, ""), flush=True)
    with open(OUT / "samples.tsv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter="\t")
        w.writerow(["utt", "speaker", "sentence"])
        w.writerows(saved)


if __name__ == "__main__":
    main()
