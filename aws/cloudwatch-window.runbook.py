#!/usr/bin/env python3
"""
CloudWatch Logs – Relative Window Fetcher
Author  : Andrios @ hoopdev
Purpose : Pull events from a log group for a preset relative window
          (5 m … 4 w), matching the AWS-console buttons – and print them
          in a console-like, columnar format.
Requires: boto3, AWS creds with logs:FilterLogEvents
Optional : colorama  (for faint/bright colourisation)
"""

import boto3
import time
import datetime as dt
import os
import re
import sys
import json
from textwrap import shorten
from datetime import timezone

# ───────── UI parameters (no free-text numbers) ─────────
log_group_name = '''
{{ .logGroupName | type "select"
                 | description "Choose CloudWatch log group"
                 | options "/aws/containerinsights/hoop-prod/application"
                           "/aws/containerinsights/hoop-prod/dataplane"
                           "/aws/eks/hoop-prod/cluster"
                           "/aws/lambda/logdna_cloudwatch"
                           "/aws/rds/instance/hoopdb/postgresql" }}
'''.strip()

relative_window = '''
{{ .relativeWindow | type "select"
                  | description "Time window (relative to now)"
                  | options "5m" "10m" "15m" "30m" "45m"
                            "1h" "2h" "3h" "6h" "8h" "12h"
                            "1d" "2d" "3d" "4d" "5d" "6d"
                            "1w" "2w" "3w" "4w"
                  | default "5m" }}
'''.strip()
# ────────────────────────────────────────────────────────

# Allow an environment variable to override the UI-chosen log group
env_log_group = os.getenv("LOG_GROUP_NAME")
if env_log_group:
    log_group_name = env_log_group

# ────────── optional colours (falls back gracefully) ──────────
try:
    from colorama import Fore, Style, init as _init_colour
    _init_colour()
    _USE_COLOURS = True
except ImportError:                       # keep running if colour not present
    class _Faux:                          # dummy attrs so references still work
        def __getattr__(self, _n): return ""
    Fore = Style = _Faux()
    _USE_COLOURS = False

_DIM   = Fore.LIGHTBLACK_EX if _USE_COLOURS else ""
_BOLD  = Fore.WHITE          if _USE_COLOURS else ""
_HEAD  = Fore.CYAN           if _USE_COLOURS else ""

def _c(text: str, colour: str) -> str:
    """Wrap `text` in `colour` if colour output enabled."""
    return f"{colour}{text}{Style.RESET_ALL}" if _USE_COLOURS else text

# ───────────────────────── helpers ────────────────────────────
def window_to_seconds(win: str) -> int:
    """Convert a window like '15m' / '3h' / '2w' → seconds."""
    m = re.fullmatch(r"(\d+)([mhdw])", win)
    if not m:
        sys.exit(f"❌ Unsupported window: {win}")
    n, unit = int(m.group(1)), m.group(2)
    return n * {"m": 60, "h": 3600, "d": 86_400, "w": 604_800}[unit]

def _extract_msg(raw: str) -> str:
    """
    If `raw` is JSON, show its 'log'/'message'/'msg' field;
    otherwise return the string as-is (trimmed).
    """
    raw = raw.strip()
    if raw.startswith("{") and raw.endswith("}"):
        try:
            payload = json.loads(raw)
            for k in ("log", "message", "msg"):
                if k in payload:
                    return str(payload[k]).rstrip()
        except json.JSONDecodeError:
            pass
        return shorten(raw, width=120, placeholder=" … ")
    return raw

# ─────────────────────────  main  ─────────────────────────────
def main() -> None:
    now_ms   = int(time.time() * 1000)
    start_ms = now_ms - window_to_seconds(relative_window) * 1000

    client = boto3.client("logs")
    params = dict(
        logGroupName = log_group_name,
        startTime    = start_ms,
        endTime      = now_ms,
    )

    print(
        f"⏱️  Window : last {relative_window}  "
        f"({dt.datetime.utcfromtimestamp(start_ms/1000):%Y-%m-%d %H:%M:%S}Z → "
        f"{dt.datetime.utcfromtimestamp(now_ms/1000):%Y-%m-%d %H:%M:%S}Z)\n"
        f"📒 Group  : {log_group_name}\n"
        "🔍 Pattern: (none)\n"
    )

    events, token = [], None
    while True:
        resp   = client.filter_log_events(**params, nextToken=token) if token else client.filter_log_events(**params)
        events.extend(resp.get("events", []))
        token  = resp.get("nextToken")
        if not token:
            break

    print(f"✅ {len(events)} event(s) retrieved\n")

    # — AWS-console-style table header —
    print(_c(f"{'Event time':<24} {'Ingestion':<24} Message", _HEAD))

    for ev in events:
        ts_event = dt.datetime.fromtimestamp(ev["timestamp"]      / 1000, tz=timezone.utc)
        ts_ing   = dt.datetime.fromtimestamp(ev["ingestionTime"]  / 1000, tz=timezone.utc) \
                   if "ingestionTime" in ev else None

        col_event = ts_event.isoformat(timespec="milliseconds").replace("+00:00", "Z")
        col_ing   = ts_ing.isoformat(timespec="milliseconds").replace("+00:00", "Z") if ts_ing else ""

        print(
            f"{_c(f'{col_event:<24}', _DIM)} "
            f"{_c(f'{col_ing:<24}',   _DIM)} "
            f"{_c(_extract_msg(ev['message']), _BOLD)}"
        )

if __name__ == "__main__":
    main()
