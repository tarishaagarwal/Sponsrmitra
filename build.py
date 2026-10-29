#!/usr/bin/env python3
"""Builds the app from src/ into two single-file outputs.

  public/index.html            the real app (no sample data), deployed to the web
  demo/sponsrmitra-demo.html   a presentation build with made-up sample data, never deployed

Run:  python3 scripts/build.py
"""
import os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
ORDER = ['data.js', 'ui.js', 'backend.js', 'auth.js', 'fest.js', 'fest2.js', 'brand.js', 'admin.js', 'main.js']

js = '\n'.join(open(os.path.join(SRC, f), encoding='utf-8').read() for f in ORDER)
css = open(os.path.join(SRC, 'style.css'), encoding='utf-8').read()

# syntax check when node is available
tmp = os.path.join(ROOT, '.build-check.js')
open(tmp, 'w', encoding='utf-8').write(js)
try:
    subprocess.run(['node', '--check', tmp], check=True)
except FileNotFoundError:
    print('node not found, skipping the syntax check')
finally:
    os.remove(tmp)

js = js.replace('</script>', '<\\/script>')
live_js = re.sub(r'/\*SEED_START\*/.*?/\*SEED_END\*/', 'function seed() { return emptyState(); }', js, flags=re.S)
for name in ['Cloudnest', 'Aditi', 'Kalpana', 'Brewline', 'Rohan Mehta', 'Sunrise Institute']:
    assert name not in live_js, 'sample data leaked into the real build: ' + name

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
LIVE_TAGS = ('<script src="config.js"></script>\n'
             '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>\n')

def page(extra_head, body_js):
    return (HEAD + extra_head + '<style>\n' + css + '\n</style>\n</head>\n<body>\n<div id="app"></div>\n<script>\n'
            + body_js + '\n</script>\n</body>\n</html>\n')

os.makedirs(os.path.join(ROOT, 'public'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'demo'), exist_ok=True)
open(os.path.join(ROOT, 'public', 'index.html'), 'w', encoding='utf-8').write(page(LIVE_TAGS, live_js))
open(os.path.join(ROOT, 'demo', 'sponsrmitra-demo.html'), 'w', encoding='utf-8').write(page('', 'window.SPONSRMITRA_DEMO = true;\n' + js))

cfg = os.path.join(ROOT, 'public', 'config.js')
if not os.path.exists(cfg):
    open(cfg, 'w', encoding='utf-8').write('''// Fill these in after you create your Supabase project (see docs/SETUP.md).
// While supabaseUrl and supabaseAnonKey are empty, visitors see a plain "opening soon" page.
// The anon key is meant to be public. Never put the service_role key here.
window.SPONSRMITRA_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  termsUrl: '',
  privacyUrl: '',
  contactEmail: ''
};
''')
print('built public/index.html and demo/sponsrmitra-demo.html')
