# Word frequency

- `zh_cn_50k.txt`: OpenSubtitles 2018 Simplified Chinese word counts, from [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (content CC BY-SA 4.0; downloaded, not committed: fetch `content/2018/zh_cn/zh_cn_50k.txt` from that repo into this folder). Film and TV subtitles: the closest open match to drama input, though mostly translated Western films.
- `make_gaps.py`: converts traditional forms to simplified and merges counts, drops tokens that are not CC-CEDICT entries and subtitle-file artifacts, takes the top N (default 1,200), and removes every word already in `../hsk2025/words-l1-3.tsv`.
- `gaps-top1200.tsv`: the frequent words HSK 2025 L1-3 misses. Rows with empty `flags` are the ones to place. `glued` marks a segmenter join of two known words (不是, 一个); `proper noun` marks names. `blended_rank` is the word's rank in wordfreq's blended list (subtitles plus written sources), for telling everyday speech from written register.

Generated 2026-11-03.
- `gaps-core.tsv`: the core subset chosen for placement on 2026-11-03: unflagged rows of `gaps-top1200.tsv` that are also in wordfreq's blended top 2,000 (frequent in both subtitles and general text).
