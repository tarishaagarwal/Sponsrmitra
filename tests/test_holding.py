"""The real build must show no sample data and no demo people when it is not connected."""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'public' / 'index.html').read_text(encoding='utf-8').lower()
names = ['aditi', 'kalpana', 'cloudnest', 'brewline', 'neha kulkarni', 'rohan mehta', 'sunrise institute', 'finara', 'zestly', 'printkart', '.example']
leaked = [n for n in names if n in html]
print('PASS no sample names in the real build' if not leaked else 'FAIL sample names found: %s' % leaked)
fails = list(leaked)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/supabase.js', lambda r: r.abort()); pg.route('**/fonts.g*', lambda r: r.abort())
    pg.goto('file://' + str(ROOT / 'public' / 'index.html')); pg.wait_for_timeout(500)
    text = pg.inner_text('#app')
    ok = pg.locator('.persona').count() == 0 and 'opening soon' in text and not errs and pg.evaluate("()=>Object.keys(localStorage).length") == 0
    print('PASS holding page, no personas, nothing stored' if ok else 'FAIL holding page: %s %s' % (text[:100], errs))
    if not ok: fails.append('holding')
    b.close()
print('FAILS:', fails)
