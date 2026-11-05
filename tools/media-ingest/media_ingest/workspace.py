"""Where the tool reads and writes, and how it reads local settings.

Every path the stages use comes from `Workspace`, so tests can point a whole run at a temp folder.
"""

import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

TOOL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOL_ROOT.parents[1]
ENV_FILE_NAME = ".env.development.local"


@dataclass(frozen=True)
class Workspace:
    tool_root: Path = TOOL_ROOT
    repo_root: Path = REPO_ROOT

    @property
    def cache(self) -> Path:
        return self.tool_root / ".cache"

    @property
    def out_dir(self) -> Path:
        """Finished Opus files, named `<sha16>.opus`. Node uploads from here."""
        return self.cache / "out"

    @property
    def metrics_dir(self) -> Path:
        return self.cache / "metrics"

    @property
    def transcripts_dir(self) -> Path:
        return self.cache / "transcripts"

    @property
    def models_dir(self) -> Path:
        return self.cache / "models"

    def raw_dir(self, source: str) -> Path:
        return self.cache / "raw" / source

    @property
    def quarantine_file(self) -> Path:
        return self.tool_root / "quarantine.json"

    @property
    def usage_file(self) -> Path:
        return self.tool_root / "usage.json"

    @property
    def default_requests(self) -> Path:
        return self.repo_root / "content" / "zh" / "media" / "requests.yaml"

    @property
    def default_media(self) -> Path:
        return self.repo_root / "content" / "zh" / "media" / "media.yaml"

    def setting(self, name: str) -> str | None:
        """A process environment value, else one from the repo-root env file, else None."""
        if os.environ.get(name):
            return os.environ[name]
        env_file = self.repo_root / ENV_FILE_NAME
        if not env_file.exists():
            return None
        for line in env_file.read_text(encoding="utf-8").splitlines():
            key, _, value = line.partition("=")
            if key.strip() == name:
                return value.strip().strip('"').strip("'") or None
        return None


def write_atomic(path: Path, data: bytes) -> None:
    """Replaces `path` in one step, creating parent folders. A crash leaves the old file or none."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name, suffix=".part")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise
