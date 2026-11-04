#!/usr/bin/env python3
"""Builds the site from src/.

  public/index.html            the landing page (from src/landing.html)
  public/404.html              the "page not found" page (from src/404.html)
  public/app/index.html        the real app (no sample data)
  demo/sponsrmitra-demo.html   a presentation build with made-up sample data, never deployed

Run:  python3 scripts/build.py           build into public/ and demo/
      python3 scripts/build.py --check   build into a temporary folder and fail if the
                                         committed files in public/ and demo/ are out of date
"""
import filecmp, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
ORDER = ['data.js', 'ui.js', 'backend.js', 'auth.js', 'fest.js', 'fest2.js', 'brand.js', 'admin.js', 'main.js']
OUTPUTS = ['public/index.html', 'public/404.html', 'public/app/index.html', 'demo/sponsrmitra-demo.html']

SAMPLE_NAMES = ['Cloudnest', 'Aditi', 'Kalpana', 'Brewline', 'Rohan Mehta', 'Sunrise Institute']
# Claims the marketing pages must never make: invented statistics, or that colleges already use the product.
BANNED = ['9 in 10', '4+ months', 'as seen in', 'trusted by', 'used by', 'colleges use', 'fests use', 'testimonial']
EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}')

HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="SponsrMitra is a verified sponsorship marketplace for Indian college fests: real contacts, real benchmarks and warm introductions through alumni.">
<meta name="theme-color" content="#F4EDDD">
<title>SponsrMitra</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%8C%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">
'''
LIVE_TAGS = ('<script src="../config.js"></script>\n'
             '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>\n')

CONFIG_TEMPLATE = '''// Fill these in after you create your Supabase project (see docs/SETUP.md).
// While supabaseUrl and supabaseAnonKey are empty, /app/ shows a plain "opening soon" page.
// As soon as both are set, /app/ works and people can sign in.
// The anon key is meant to be public. Never put the service_role key here.
//
// appOpen only controls the buttons on the landing page (sponsrmitra.live/):
//   false: they say "Request early access" and lead to the email card.
//   true:  they say "Open the app" and lead to /app/.
// It does not switch the app itself on or off.
window.SPONSRMITRA_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  termsUrl: '',
  privacyUrl: '',
  contactEmail: '',
  appOpen: false
};
'''


def read(*parts):
    return open(os.path.join(*parts), encoding='utf-8').read()


def build(out):
    js = '\n'.join(read(SRC, f) for f in ORDER)
    css = read(SRC, 'style.css')

    # syntax check when node is available
    fd, tmp = tempfile.mkstemp(suffix='.js')
    os.close(fd)
    open(tmp, 'w', encoding='utf-8').write(js)
    try:
        subprocess.run(['node', '--check', tmp], check=True)
    except FileNotFoundError:
        print('node not found, skipping the syntax check')
    finally:
        os.remove(tmp)

    js = js.replace('</script>', '<\\/script>')
    live_js = re.sub(r'/\*SEED_START\*/.*?/\*SEED_END\*/', 'function seed() { return emptyState(); }', js, flags=re.S)

    def page(extra_head, body_js):
        return (HEAD + extra_head + '<style>\n' + css + '\n</style>\n</head>\n<body>\n<div id="app"></div>\n<script>\n'
                + body_js + '\n</script>\n</body>\n</html>\n')

    files = {
        'public/index.html': read(SRC, 'landing.html'),
        'public/404.html': read(SRC, '404.html'),
        'public/app/index.html': page(LIVE_TAGS, live_js),
        'demo/sponsrmitra-demo.html': page('', 'window.SPONSRMITRA_DEMO = true;\n' + js),
    }
    for name, text in files.items():
        if not name.startswith('public/'):
            continue
        for s in SAMPLE_NAMES:
            assert s not in text, 'sample data leaked into %s: %s' % (name, s)
        if name in ('public/index.html', 'public/404.html'):
            low = text.lower()
            for b in BANNED:
                assert b not in low, 'banned claim in %s: %s' % (name, b)
        found = EMAIL.findall(text)
        assert not found, 'email address written into %s (it must come from config.js): %s' % (name, found)

    for name, text in files.items():
        path = os.path.join(out, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'w', encoding='utf-8').write(text)


if '--check' in sys.argv:
    tmp = tempfile.mkdtemp()
    build(tmp)
    stale = [n for n in OUTPUTS if not os.path.exists(os.path.join(ROOT, n))
             or not filecmp.cmp(os.path.join(tmp, n), os.path.join(ROOT, n), shallow=False)]
    if not os.path.exists(os.path.join(ROOT, 'public', 'og.png')):
        stale.append('public/og.png (run: node scripts/make-og.js)')
    if stale:
        print('FAIL the committed build is out of date: ' + ', '.join(stale))
        print('     Run python3 scripts/build.py and commit the result.')
        sys.exit(1)
    print('PASS committed build matches src/')
    sys.exit(0)

build(ROOT)
cfg = os.path.join(ROOT, 'public', 'config.js')
if not os.path.exists(cfg):
    open(cfg, 'w', encoding='utf-8').write(CONFIG_TEMPLATE)
print('built public/index.html, public/404.html, public/app/index.html and demo/sponsrmitra-demo.html')
