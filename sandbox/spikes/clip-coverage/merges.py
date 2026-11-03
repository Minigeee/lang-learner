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
 "1.5-a+b 这个/这些": ["1.5-a","1.5-b"], "1.12-a+b 会/能": ["1.12-a","1.12-b"],
 "1.13-a+c+d shopping": ["1.13-a","1.13-c","1.13-d"], "1.16-a+b whether": ["1.16-a","1.16-b"],
 "2.4-a+c simultaneous": ["2.4-a","2.4-c"], "2.16-a+b+c comparing": ["2.16-a","2.16-b","2.16-c"],
 "2.13-a+d existential": ["2.13-a","2.13-d"], "2.13-b+2.22-a 来/去": ["2.13-b","2.22-a"],
 "2.20-a+b+c how long": ["2.20-a","2.20-b","2.20-c"], "2.10-b+c 的 clauses": ["2.10-b","2.10-c"],
 "2.14-a+b 从/离": ["2.14-a","2.14-b"], "2.17-b+c+d 又/越": ["2.17-b","2.17-c","2.17-d"],
 "2.25-a+b potential": ["2.25-a","2.25-b"], "2.23-a+b+c 得 how well": ["2.23-a","2.23-b","2.23-c"],
 "2.29-a+b+d 把": ["2.29-a","2.29-b","2.29-d"], "2.8-b+c 给": ["2.8-b","2.8-c"],
 "2.27-b+c 只要/只有": ["2.27-b","2.27-c"], "2.28-c+d": ["2.28-c","2.28-d"],
 "2.6-c+b 得děi/应该": ["2.6-b","2.6-c"], "2.19-d+1.13-c 或者/还是": ["2.19-d","1.13-c"],
 "2.31-c+b particles": ["2.31-b","2.31-c"],
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
