#!/bin/bash
# Runs every test. Needs: pip install -r tests/requirements.txt && playwright install chromium
set -e
cd "$(dirname "$0")/.."
# The built files in public/ and demo/ are committed and published as they are,
# so stop here if they do not match a fresh build of src/.
python3 scripts/build.py --check
for t in test_sql test_team_cap test_live test_holding test_landing test_demo test_demo_routes; do
  echo "=== $t ==="
  python3 tests/$t.py | grep -E "FAIL|FAILS|errors|none|ok  |PASS" | grep -v "^PASS" || true
done
