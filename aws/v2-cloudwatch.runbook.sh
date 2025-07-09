#!/usr/bin/env bash

set -euo pipefail

# {{ .relativeWindow | type "select" | description "Time window duration" | options "5m" "10m" "15m" "30m" "45m" "1h" "2h" "3h" "6h" "8h" "12h" "1d" "2d" "3d" "4d" "5d" "6d" "1w" "2w" "3w" "4w" | default "5m" | asenv "RELATIVE_WINDOW" }}
# {{ .specificMonth | type "select" | description "Month (optional - leave as 'current' for relative mode)" | options "current" "January" "February" "March" "April" "May" "June" "July" "August" "September" "October" "November" "December" | default "current" | asenv "SPECIFIC_MONTH" }}
# {{ .specificDay | type "select" | description "Day of month (optional - use with month selection)" | options "current" "1" "2" "3" "4" "5" "6" "7" "8" "9" "10" "11" "12" "13" "14" "15" "16" "17" "18" "19" "20" "21" "22" "23" "24" "25" "26" "27" "28" "29" "30" "31" | default "current" | asenv "SPECIFIC_DAY" }}

# Check if LOG_GROUP_NAME is empty
if [[ -z "$LOG_GROUP_NAME" ]]; then
    echo "ERROR: LOG_GROUP_NAME environment variable is not set or is empty!"
    echo
    echo "Please select a log group in the left pane to set the LOG_GROUP_NAME environment variable."
    echo
    echo "Available log groups:"
    echo "  - /aws/containerinsights/hoop-prod/application"
    echo "  - /aws/containerinsights/hoop-prod/dataplane"
    echo "  - /aws/eks/hoop-prod/cluster"
    echo "  - /aws/lambda/logdna_cloudwatch"
    echo "  - /aws/rds/instance/hoopdb/postgresql"
    exit 1
fi

RELATIVE_WINDOW="${RELATIVE_WINDOW:-5m}"
SPECIFIC_MONTH="${SPECIFIC_MONTH:-current}"
SPECIFIC_DAY="${SPECIFIC_DAY:-current}"

window_to_seconds() {
    local win="$1"
    local num="${win%[mhdw]}"
    local unit="${win#${num}}"
    
    case "$unit" in
        m) echo $((num * 60)) ;;
        h) echo $((num * 3600)) ;;
        d) echo $((num * 86400)) ;;
        w) echo $((num * 604800)) ;;
    esac
}

month_to_number() {
    case "${1,,}" in
        january) echo 1 ;;
        february) echo 2 ;;
        march) echo 3 ;;
        april) echo 4 ;;
        may) echo 5 ;;
        june) echo 6 ;;
        july) echo 7 ;;
        august) echo 8 ;;
        september) echo 9 ;;
        october) echo 10 ;;
        november) echo 11 ;;
        december) echo 12 ;;
    esac
}

now_ms=$(($(date +%s) * 1000))
window_seconds=$(window_to_seconds "$RELATIVE_WINDOW")

if [[ "$SPECIFIC_MONTH" != "current" || "$SPECIFIC_DAY" != "current" ]]; then
    year=$(date +%Y)
    month=$([[ "$SPECIFIC_MONTH" != "current" ]] && month_to_number "$SPECIFIC_MONTH" || date +%m)
    day=$([[ "$SPECIFIC_DAY" != "current" ]] && echo "$SPECIFIC_DAY" || date +%d)
    
    end_date="${year}-$(printf "%02d" "$month")-$(printf "%02d" "$day") 23:59:59"
    end_ms=$(($(date -d "$end_date" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$end_date" +%s) * 1000))
    [[ $end_ms -gt $now_ms ]] && end_ms=$now_ms
    start_ms=$((end_ms - (window_seconds * 1000)))
else
    end_ms=$now_ms
    start_ms=$((end_ms - (window_seconds * 1000)))
fi

echo "# Log Group: $LOG_GROUP_NAME"
echo "# Window: $RELATIVE_WINDOW ($(date -d @$((start_ms/1000)) -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -r $((start_ms/1000)) -u +%Y-%m-%dT%H:%M:%SZ) to $(date -d @$((end_ms/1000)) -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -r $((end_ms/1000)) -u +%Y-%m-%dT%H:%M:%SZ))"
[[ "$SPECIFIC_MONTH" != "current" || "$SPECIFIC_DAY" != "current" ]] && echo "# Date: $SPECIFIC_MONTH $SPECIFIC_DAY"
echo

next_token=""
while true; do
    cmd=(aws logs filter-log-events --log-group-name "$LOG_GROUP_NAME" --start-time "$start_ms" --end-time "$end_ms" --output json)
    [[ -n "$next_token" ]] && cmd+=(--next-token "$next_token")
    
    response=$("${cmd[@]}")
    echo "$response" | jq -r '.events[] | "\(.timestamp) \(.message)"'
    
    next_token=$(echo "$response" | jq -r '.nextToken // empty')
    [[ -z "$next_token" ]] && break
done
