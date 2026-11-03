"""Coverage for proposed lesson merges (FINDINGS.md, recommendations).

Run: .venv/Scripts/python -I merges.py > out/merges.md
Same thresholds and sources as coverage.py; a merged lesson matches any member pattern.
"""
import sys, re, yaml, pathlib
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')
root = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(root))
import coverage as c
spec = yaml.safe_load((root/'patterns.yaml').read_text(encoding='utf-8'))
fits = c.make_fit(spec['settings'], c.load_hsk())
sents, audio = c.load_tatoeba(); cv = c.load_cv(); gs = c.load_gs()
tb = defaultdict(list)
for sid, t in sents.items(): tb[t].extend(audio.get(sid, []))
L = {l['id']: l for u in spec['units'] for l in u['lessons']}
merges = {
 "1.1-a+b 是/叫 intro": ["1.1-a","1.1-b"], "1.2-a+b 吗 & 你呢": ["1.2-a","1.2-b"],
 "1.4a-a+b 这个/这些": ["1.4a-a","1.4a-b"], "1.10a-a+b 会/能": ["1.10a-a","1.10a-b"],
 "1.11-a+c+d shopping": ["1.11-a","1.11-c","1.11-d"], "1.14-a+b whether": ["1.14-a","1.14-b"],
 "2.3-a+c simultaneous": ["2.3-a","2.3-c"], "2.4-a+b+c comparing": ["2.4-a","2.4-b","2.4-c"],
 "2.5-a+d existential": ["2.5-a","2.5-d"], "2.5-b+2.21-a 来/去": ["2.5-b","2.21-a"],
 "2.12-a+b+c how long": ["2.12-a","2.12-b","2.12-c"], "2.13-b+c 的 clauses": ["2.13-b","2.13-c"],
 "2.17-a+b 从/离": ["2.17-a","2.17-b"], "2.18-b+c+d 又/越": ["2.18-b","2.18-c","2.18-d"],
 "2.20-a+b potential": ["2.20-a","2.20-b"], "2.22-a+b+c 得 how well": ["2.22-a","2.22-b","2.22-c"],
 "2.24-a+b+d 把": ["2.24-a","2.24-b","2.24-d"], "2.27-b+c 给": ["2.27-b","2.27-c"],
 "2.28-b+c 只要/只有": ["2.28-b","2.28-c"], "2.29-c+d": ["2.29-c","2.29-d"],
 "2.7-c+b 得děi/应该": ["2.7-b","2.7-c"], "2.10-d+1.11-c 或者/还是": ["2.10-d","1.11-c"],
 "2.26-c+b particles": ["2.26-b","2.26-c"],
}
print("| Merge | Audio now (sent, voices) | CV candidates | Status |")
print("|---|---|---|---|")
for name, ids in merges.items():
    pats = [re.compile(L[i]['re']) for i in ids]
    st = 'S1' if ids[0].startswith('1') else 'S2'
    fit = fits[st]
    hit = lambda t: any(p.search(t) for p in pats)
    lic = {t for t, r in tb.items() if any(x[1] for x in r) and fit(t) and hit(t)}
    users = {u for t in lic for u, l in tb[t] if l}
    g = {t for _, _, t in gs if fit(t) and hit(t)}
    cvs = {t for t in cv if fit(t) and hit(t)}
    ns, nv = len(lic)+len(g), len(users)+(1 if g else 0)
    status = "green" if ns>=5 and nv>=4 else ("yellow" if ns+len(cvs)>=5 and nv+len(cvs)>=4 else "red")
    print(f"| {name} | {ns}, {nv} | {len(cvs)} | {status} |")
