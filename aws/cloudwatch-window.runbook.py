#!/usr/bin/env python3
"""
CloudWatch Logs – Relative Window Fetcher
Author  : Andrios @ hoopdev
Purpose : Pull events from a log group for a preset relative window
          (5 m … 4 w), matching the AWS console buttons.
Requires: boto3, AWS creds with logs:FilterLogEvents
"""

import boto3
import time
import datetime as dt
import os
import re
import sys

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

def window_to_seconds(win: str) -> int:
    """Convert fixed option like '15m' / '3h' / '2w' → seconds."""
    match = re.fullmatch(r"(\d+)([mhdw])", win)
    if not match:
        sys.exit(f"❌ Unsupported window: {win}")
    val, unit = int(match.group(1)), match.group(2)
    factor = {"m": 60, "h": 3600, "d": 86400, "w": 604800}[unit]
    return val * factor


def main():
    now_ms = int(time.time() * 1000)
    start_ms = now_ms - window_to_seconds(relative_window) * 1000

    client = boto3.client("logs")
    params = {
        "logGroupName": log_group_name,
        "startTime": start_ms,
        "endTime": now_ms,
    }

    print(
        f"⏱️  Window : last {relative_window}  "
        f"({dt.datetime.utcfromtimestamp(start_ms/1000):%Y-%m-%d %H:%M:%S}Z → "
        f"{dt.datetime.utcfromtimestamp(now_ms/1000):%Y-%m-%d %H:%M:%S}Z)\n"
        f"📒 Group  : {log_group_name}\n"
        "🔍 Pattern: (none)\n"
    )

    events, token = [], None
    while True:
        resp = client.filter_log_events(**params, nextToken=token) if token else client.filter_log_events(**params)
        events.extend(resp.get("events", []))
        token = resp.get("nextToken")
        if not token:
            break

    print(f"✅ {len(events)} event(s) retrieved\n-----\n")
    for ev in events:
        ts = dt.datetime.utcfromtimestamp(ev["timestamp"] / 1000).isoformat() + "Z"
        print(f"[{ts}] {ev['message'].rstrip()}")


if __name__ == "__main__":
    main()
