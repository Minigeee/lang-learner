"""Command line: `python -I -X utf8 -m media_ingest fetch|synth|analyze|gate|run`.

Exit codes: 0 when every stage finished, including with quarantined clips; 1 when a stage reported
a failure; 2 when the requests file is invalid. Stages after a failed one still run, so a single
missing source doesn't hold back the rest.
"""

import argparse
import sys
from pathlib import Path

from .clip_requests import RequestsError, load_requests
from .workspace import Workspace


def _fetch(requests, ws, media):
    from . import models, sources
    return models.ensure_models(requests, ws) + sources.fetch_all(requests, ws)


def _synth(requests, ws, media):
    from . import synth
    return synth.synth_all(requests, ws)


def _analyze(requests, ws, media):
    from . import analyze
    return analyze.analyze_all(requests, ws)


def _gate(requests, ws, media):
    from . import gate
    return gate.gate_all(requests, ws, media)


STAGES = {"fetch": _fetch, "synth": _synth, "analyze": _analyze, "gate": _gate}


def main(argv: list[str] | None = None) -> int:
    ws = Workspace()
    parser = argparse.ArgumentParser(prog="media_ingest", description="Clip requests in, validated Opus out.")
    parser.add_argument("command", choices=[*STAGES, "run"])
    parser.add_argument("--requests", type=Path, default=ws.default_requests, help="requests.yaml to read")
    parser.add_argument("--media", type=Path, default=ws.default_media, help="media.yaml to write")
    args = parser.parse_args(argv)

    try:
        requests = load_requests(args.requests)
    except RequestsError as e:
        print(f"invalid requests:\n{e}", file=sys.stderr)
        return 2

    failures: list[str] = []
    for name in STAGES if args.command == "run" else [args.command]:
        failures += STAGES[name](requests, ws, args.media)
    for failure in failures:
        print(f"failed: {failure}", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
