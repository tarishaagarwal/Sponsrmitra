#!/bin/bash
# Runs every test. Needs: pip install -r tests/requirements.txt && playwright install chromium
set -e
cd "$(dirname "$0")/.."
python3 scripts/build.py
for t in test_sql test_live test_holding test_demo test_demo_routes; do
  echo "=== $t ==="
  python3 tests/$t.py | grep -E "FAIL|FAILS|errors|none|ok  |PASS" | grep -v "^PASS" || true
done
