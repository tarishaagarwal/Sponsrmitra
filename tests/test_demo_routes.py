import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
DEMO = str(Path(__file__).resolve().parents[1] / 'demo' / 'sponsrmitra-demo.html')
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=1)
    pg=ctx.new_page()
    pg.on('pageerror', lambda e: errors.append('PAGEERROR '+str(e)))
    pg.on('console', lambda m: errors.append('CONSOLE '+m.text) if m.type=='error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('file://' + DEMO + '')
    pg.wait_for_timeout(400)
    print('login has personas:', pg.locator('.persona').count())
    pg.click('[data-id="u_aditi"]')
    pg.wait_for_timeout(200)
    print('home title:', pg.locator('.h1').first.inner_text())
    routes=['#/home','#/find','#/company/c_cloudnest','#/intro/c_cloudnest','#/pipeline','#/pipe/p_devlane','#/deal/p_finara','#/alumni','#/profile','#/planner','#/shortlists','#/proof','#/packages','#/templates','#/deck','#/archive','#/report/p_finara','#/sponsor/p_finara']
    for r in routes:
        pg.evaluate("h=>{location.hash=h}", r)
        pg.wait_for_timeout(120)
        txt=pg.locator('#app').inner_text()
        bad = 'Something went wrong' in txt
        print(('FAIL ' if bad else 'ok   ')+r, len(txt))
        if bad: print(txt[:300])
    print('--- errors ---'); print('\n'.join(errors) or 'none')
    b.close()
