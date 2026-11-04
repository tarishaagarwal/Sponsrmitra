"""The landing page (public/index.html) and the 404 page: honest content, the launch switch,
the email card built from config.js, no sideways scrolling and reduced motion."""
import re, shutil, struct, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / 'public'
fails = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + ((' :: ' + str(extra)) if (not cond and extra) else ''))
    if not cond: fails.append(name)

# ---- static checks on every published page ----
EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}')
pages = {p.relative_to(PUB).as_posix(): p.read_text(encoding='utf-8') for p in PUB.rglob('*.html')}
check('no email address written into any page', not any(EMAIL.search(t) for t in pages.values()),
      {k: EMAIL.findall(t) for k, t in pages.items() if EMAIL.search(t)})
landing = pages['index.html']
low = landing.lower()
banned = ['9 in 10', '4+ months', 'as seen in', 'trusted by', 'used by', 'colleges use', 'fests use', 'testimonial', 'join thousands', 'best ', 'leading']
check('no invented statistics or usage claims', not [b for b in banned if b in low], [b for b in banned if b in low])
for tag in ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card', 'rel="canonical"']:
    check('social tag ' + tag, tag in landing)
png = (PUB / 'og.png').read_bytes()
check('preview image is a 1200 x 630 PNG', png[:8] == b'\x89PNG\r\n\x1a\n' and struct.unpack('>II', png[16:24]) == (1200, 630))
check('preview image under 300 KB', len(png) < 300_000, len(png))

def site(cfg):
    """A copy of public/ with its own config.js."""
    d = Path(tempfile.mkdtemp())
    shutil.copytree(PUB, d, dirs_exist_ok=True)
    (d / 'config.js').write_text('window.SPONSRMITRA_CONFIG = ' + cfg + ';', encoding='utf-8')
    return d

EMAIL_CFG = "{supabaseUrl:'',supabaseAnonKey:'',contactEmail:'desk@sponsrmitra.test',appOpen:false}"
with sync_playwright() as p:
    b = p.chromium.launch()
    def open_page(d, path='index.html', **kw):
        ctx = b.new_context(**kw); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.route('**/fonts.g*', lambda r: r.abort()); pg.route('**/supabase.js', lambda r: r.abort())
        pg.goto('file://' + str(d / path)); pg.wait_for_timeout(300)
        return pg, errs

    # ---- before launch: early access ----
    d = site(EMAIL_CFG)
    pg, errs = open_page(d, viewport={'width': 390, 'height': 844})
    check('early access label shows while appOpen is false', pg.locator('main .ticket').first.is_visible())
    ctas = pg.locator('[data-cta]')
    check('both hero buttons say Request early access', [ctas.nth(i).inner_text() for i in range(2)] == ['Request early access'] * 2)
    check('hero buttons lead to the email card', all(ctas.nth(i).get_attribute('href') == '#early-access' for i in range(2)))
    check('header Open the app link hidden', not pg.locator('header [data-open]').is_visible())
    pg.click('[data-cta="fest"]'); pg.wait_for_timeout(100)
    check('fest button sets the fest mailto from config', pg.get_attribute('#mail', 'href') == 'mailto:desk@sponsrmitra.test?subject=Early%20access%3A%20fest%20team')
    pg.click('[data-cta="brand"]'); pg.wait_for_timeout(100)
    check('brand button sets the brand mailto from config', pg.get_attribute('#mail', 'href') == 'mailto:desk@sponsrmitra.test?subject=Early%20access%3A%20brand')
    check('Write to us button visible', pg.locator('#mail').is_visible())
    check('no console errors (early access)', not errs, errs)
    pg.context.close()

    # ---- no email set ----
    pg, errs = open_page(site("{appOpen:false}"), viewport={'width': 390, 'height': 844})
    check('without an email the card says opening soon', pg.locator('#no-mail').is_visible() and not pg.locator('#mail').is_visible())
    check('without an email there is no mailto link anywhere', pg.locator('a[href^="mailto:"]').count() == 0)
    pg.context.close()

    # ---- after launch ----
    pg, errs = open_page(site("{contactEmail:'desk@sponsrmitra.test',appOpen:true}"), viewport={'width': 1440, 'height': 900})
    check('early access label hidden once appOpen is true', not pg.locator('main .ticket').first.is_visible() and not pg.locator('header .ticket').is_visible())
    check('hero buttons say Open the app', [ctas_t for ctas_t in pg.locator('[data-cta]').all_inner_texts()] == ['Open the app'] * 2)
    check('hero buttons lead to /app/', all(h == 'app/' for h in [pg.locator('[data-cta]').nth(i).get_attribute('href') for i in range(2)]))
    check('header Open the app link shows', pg.locator('header [data-open]').is_visible())
    check('no console errors (open)', not errs, errs)
    pg.context.close()

    # ---- layout at phone and desktop widths, both themes ----
    for w, h in [(360, 740), (390, 844), (1440, 900)]:
        for scheme in ['light', 'dark']:
            pg, errs = open_page(d, viewport={'width': w, 'height': h}, color_scheme=scheme)
            sw = pg.evaluate('() => document.documentElement.scrollWidth')
            check('no sideways scroll at %d px %s' % (w, scheme), sw <= w, sw)
            pg.context.close()

    # ---- reduced motion ----
    pg, errs = open_page(d, viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    check('reduced motion: no reveal animation', not pg.evaluate("() => document.documentElement.classList.contains('js-reveal')"))
    check('reduced motion: every section visible', pg.evaluate("() => [...document.querySelectorAll('.rv')].every(e => getComputedStyle(e).opacity === '1')"))
    pg.context.close()

    # ---- old app links move to /app/ ----
    pg, errs = open_page(d, 'index.html#/sponsor/abc', viewport={'width': 390, 'height': 844}); pg.wait_for_timeout(300)
    check('old #/ links redirect to /app/', pg.url.endswith('/app/#/sponsor/abc'), pg.url)
    pg.context.close()

    # ---- 404 page ----
    pg, errs = open_page(d, '404.html', viewport={'width': 360, 'height': 740})
    check('404 page shows Page not found', 'Page not found' in pg.inner_text('h1'))
    check('404 page links home and to the app', pg.locator('a[href="/"]').count() >= 1 and pg.locator('a[href="/app/"]').count() == 1)
    check('no console errors (404)', not errs, errs)
    pg.context.close()
    b.close()
print('FAILS:', fails)
