"""Estimate daily SRS review time across S0-S2 with a Monte Carlo FSRS simulation.

Scheduler: FSRS-4.5 formulas with its published default parameters, desired retention 0.90 (doc 02's
default). The app will run FSRS-7 through ts-fsrs, whose defaults differ, so treat the output as an
order-of-magnitude estimate, not a forecast. Each review recalls with probability R (the model's own
retrievability), so the learner is assumed to match the default model. A lapse costs one same-day
relearning step. Reviews are only counted from the day after a card is introduced; meeting it in the
lesson counts as lesson time.

Usage: python -I -X utf8 sim.py [retention=0.90] [word_sec=10] [skill_sec=15] [--pace=MIN_PER_DAY]
"""
import math
import random
import statistics
import sys

W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461,
     2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755]
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
RETENTION = float(ARGS[0]) if ARGS else 0.90
F, C = 19 / 81, -0.5
SEC = {"word": int(ARGS[1]) if len(ARGS) > 1 else 10, "skill": int(ARGS[2]) if len(ARGS) > 2 else 15}  # seconds per review, including a lapse's relearning step

# (name, lesson minutes, word cards, skill cards). Cards are introduced evenly across the stage's days.
CARDS = [("S0", 250, 0, 30), ("S1", 415, 449, 56), ("S2", 914, 952, 95)]
# Stage length: doc 03's calendar, or --pace N (lesson minutes a day), where a stage lasts as long as its lessons take.
PACE = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--pace=")), None)
CALENDAR = {"S0": 14, "S1": 56, "S2": 91}
STAGES = [(n, math.ceil(m / PACE) if PACE else CALENDAR[n], w, k) for n, m, w, k in CARDS] + [("post-S2", 60, 208, 0)]
POST_S2_FEED_DAYS = 30  # the 208 post-S2 words feed over the first 30 days, then reviews only


def retrievability(t, s):
    return (1 + F * t / s) ** C


def interval(s):
    return max(1, round(s / F * (RETENTION ** (1 / C) - 1)))


def d0(g):
    return min(10, max(1, W[4] - (g - 3) * W[5]))


def review(s, d, t, recalled):
    r = retrievability(t, s)
    if recalled:  # graded Good
        s = s * (math.exp(W[8]) * (11 - d) * s ** -W[9] * (math.exp(W[10] * (1 - r)) - 1) + 1)
        g = 3
    else:  # graded Again
        s = W[11] * d ** -W[12] * ((s + 1) ** W[13] - 1) * math.exp(W[14] * (1 - r))
        g = 1
    d = d - W[6] * (g - 3)
    d = min(10, max(1, W[7] * d0(3) + (1 - W[7]) * d))
    return s, d


def run(seed):
    rng = random.Random(seed)
    total_days = sum(days for _, days, _, _ in STAGES)
    secs = [0.0] * total_days
    due = {}
    day0 = 0
    for name, days, words, skills in STAGES:
        feed = POST_S2_FEED_DAYS if name == "post-S2" else days
        for kind, n in (("word", words), ("skill", skills)):
            for i in range(n):
                day = day0 + int(i * feed / n) if n else day0
                s, d = W[2], d0(3)  # first meeting graded Good in the lesson
                due.setdefault(day + interval(s), []).append((kind, s, d, day))
        day0 += days
    for today in range(total_days):
        for kind, s, d, last in due.pop(today, []):
            t = today - last
            recalled = rng.random() < retrievability(t, s)
            secs[today] += SEC[kind] * (1 if recalled else 2)
            s, d = review(s, d, t, recalled)
            due.setdefault(today + interval(s), []).append((kind, s, d, today))
    return secs


runs = [run(seed) for seed in range(20)]
daily = [statistics.mean(r[i] for r in runs) / 60 for i in range(len(runs[0]))]
start = 0
print(f"{'stage':8} {'days':>4} {'new/day':>8} {'avg min/day':>12} {'peak min/day':>13} {'total h':>8}")
for name, days, words, skills in STAGES:
    seg = daily[start:start + days]
    feed = POST_S2_FEED_DAYS if name == "post-S2" else days
    print(f"{name:8} {days:>4} {(words + skills) / feed:>8.1f} {statistics.mean(seg):>12.1f} {max(seg):>13.1f} {sum(seg) / 60:>8.1f}")
    start += days
print(f"{'all':8} {len(daily):>4} {'':>8} {statistics.mean(daily):>12.1f} {max(daily):>13.1f} {sum(daily) / 60:>8.1f}")
