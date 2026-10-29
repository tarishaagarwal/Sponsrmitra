import json, os, shutil, tempfile, time
from playwright.sync_api import sync_playwright
import pgenv
from pgenv import Client, ROOT

conn = pgenv.start(); U = pgenv.uri(); cur = conn.cursor()
site = tempfile.mkdtemp()
shutil.copy(str(ROOT / 'public' / 'index.html'), site + '/index.html')
open(site + '/config.js', 'w').write("window.SPONSRMITRA_CONFIG={supabaseUrl:'http://fake.local',supabaseAnonKey:'anon-key'};")
fails = []; errors = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + ((' :: ' + str(extra)) if (not cond and extra) else ''))
    if not cond: fails.append(name)

uids = {}
def ensure_user(email):
    if email not in uids:
        uids[email] = pgenv.new_user(conn, email)
    return uids[email]
def pg_user(email): return ensure_user(email)
def pg_rpc(uid, name, args_json):
    args = json.loads(args_json) if args_json else None
    if args == {} : args = None
    anon = uid is None
    cl = Client(U, uid)
    data, err = cl.rpc(name, args, anon=anon)
    return json.dumps({'data': data, 'error': ({'message': err} if err else None)})

FAKE = """
window.supabase = { createClient: () => ({
  auth: {
    getSession: async () => { if (!window.__S) { try { window.__S = JSON.parse(localStorage.getItem('fake_session')); } catch (e) {} } return { data: { session: window.__S || null } }; },
    onAuthStateChange: (cb) => { window.__cb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithOtp: async ({ email }) => ({ error: null }),
    verifyOtp: async ({ email, token }) => { if (token !== '123456') return { error: { message: 'bad code' } }; const uid = await window.pgUser(email); window.__S = { user: { id: uid } }; localStorage.setItem('fake_session', JSON.stringify(window.__S)); return { data: { session: window.__S }, error: null }; },
    signOut: async () => { window.__S = null; localStorage.removeItem('fake_session'); if (window.__cb) window.__cb('SIGNED_OUT', null); return { error: null }; }
  },
  rpc: async (name, args) => { const r = await window.pgRpc(window.__S ? window.__S.user.id : null, name, JSON.stringify(args || null)); return JSON.parse(r); }
}) };
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    def new_page():
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        ctx.expose_function('pgRpc', pg_rpc); ctx.expose_function('pgUser', pg_user)
        ctx.add_init_script(FAKE)
        ctx.route('**/supabase.js', lambda r: r.abort())
        ctx.route('**/fonts.g*', lambda r: r.abort())
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
        pg.on('console', lambda m: errors.append('CONSOLE ' + m.text) if m.type == 'error' and 'ERR_' not in m.text and 'Failed to load' not in m.text else None)
        pg.goto('file://' + site + '/index.html'); pg.wait_for_timeout(500)
        return pg
    def login(pg, email):
        pg.fill('[data-bind="au.email"]', email); pg.click('[data-act="sbSendCode"]'); pg.wait_for_selector('[data-bind="au.code"]')
        pg.fill('[data-bind="au.code"]', '123456'); pg.click('[data-act="sbVerify"]'); pg.wait_for_timeout(700)
    def ev(pg, js, *a): return pg.evaluate(js, *a)
    def sync(pg): pg.wait_for_timeout(500); ev(pg, "async () => { await SYNC.chain.catch(()=>{}); await refresh(); }"); pg.wait_for_timeout(200)
    def go(pg, h): ev(pg, "h=>{location.hash=h}", h); pg.wait_for_timeout(250)
    def fill_sheet(pg, vals):
        for k, v in vals.items(): pg.fill('[data-bind="%s"]' % k, v)

    # ---- operator: make admin ----
    ensure_user('admin@t.test'); cur.execute("select public.make_admin('admin@t.test')")
    admin = new_page()
    check('sign-in screen shows email step', admin.locator('[data-act="sbSendCode"]').count() == 1)
    admin.fill('[data-bind="au.email"]', 'admin@t.test'); admin.click('[data-act="sbSendCode"]'); admin.wait_for_selector('[data-bind="au.code"]')
    admin.fill('[data-bind="au.code"]', '000000'); admin.click('[data-act="sbVerify"]'); admin.wait_for_timeout(400)
    check('wrong code keeps you on the code step', admin.locator('[data-bind="au.code"]').count() == 1)
    admin.fill('[data-bind="au.code"]', '123456'); admin.click('[data-act="sbVerify"]'); admin.wait_for_timeout(800)
    check('admin lands on the verification desk', 'Verification desk' in admin.inner_text('#app'), admin.inner_text('#app')[:200])

    # ---- admin adds companies and a benchmark through the UI ----
    for nm, cat, city, cn, ce, lo, hi, n in [('Cloudnest', 'tech', 'Bengaluru', 'Neha K', 'neha@cloudnest.example', '1.5', '3', '9'), ('Brewline', 'bev', 'Mumbai', 'Sana Q', 'sana@brewline.example', '', '', '')]:
        admin.click('[data-act="adAddCompany"]'); admin.wait_for_selector('[data-bind="ac.name"]')
        fill_sheet(admin, {'ac.name': nm, 'ac.city': city, 'ac.cn': cn, 'ac.ce': ce, 'ac.lo': lo, 'ac.hi': hi, 'ac.n': n}); admin.select_option('[data-bind="ac.cat"]', cat)
        admin.click('[data-act="adCompanyGo"]'); admin.wait_for_timeout(600)
    sync(admin)
    check('two companies exist and are verified', len([c for c in ev(admin, "()=>S.companies") if c['status'] == 'verified']) == 2)
    go(admin, '#/ad/insights'); admin.click('[data-act="adBench"]'); admin.wait_for_selector('[data-bind="bm.hi"]')
    fill_sheet(admin, {'bm.lo': '6.5', 'bm.hi': '14', 'bm.n': '12'}); admin.click('[data-act="adBenchGo"]'); admin.wait_for_timeout(600)
    check('benchmark saved', len(ev(admin, "()=>Object.keys(S.benchmarks)")) == 1)

    # ---- fest lead onboarding ----
    lead = new_page(); login(lead, 'lead@t.test')
    check('new user is asked who they are', 'Tell us who you are' in lead.inner_text('#app'))
    lead.click('[data-act="openReg"][data-v="fest"]'); lead.wait_for_selector('[data-bind="reg.fest"]')
    fill_sheet(lead, {'reg.name': 'Aditi Sharma', 'reg.fest': 'Kalpana Fest 2027', 'reg.college': 'Sunrise Institute', 'reg.city': 'Pune'})
    lead.click('[data-act="regFest"]'); lead.wait_for_timeout(900)
    check('lead lands on home with pending banner', 'Waiting for verification' in lead.inner_text('#app'), lead.inner_text('#app')[:200])
    check('lead sees team code', ev(lead, "()=>!!myFest().joinCode"))

    # ---- alumnus onboarding ----
    alum = new_page(); login(alum, 'rohan@t.test')
    # no verified fest yet => college list empty; admin verifies the fest first
    go(admin, '#/ad/verify'); sync(admin)
    check('admin sees the pending fest', 'Kalpana Fest 2027' in admin.inner_text('#app'))
    admin.locator('[data-act="adVerify"][data-t="fest"]').first.click(); admin.wait_for_timeout(600)
    sync(lead); check('lead is now verified', ev(lead, "()=>myFest().status") == 'verified')
    alum.click('[data-act="openReg"][data-v="alumni"]'); alum.wait_for_selector('[data-bind="reg.role"]')
    check('alumni sign-up lists the verified college and companies', 'Sunrise Institute' in alum.inner_text('.sheet') and 'Cloudnest' in alum.inner_text('.sheet'), alum.inner_text('.sheet')[:200])
    alum.fill('[data-bind="reg.name"]', 'Rohan Mehta'); alum.fill('[data-bind="reg.role"]', 'Product Manager'); alum.fill('[data-bind="reg.cohort"]', '2019')
    alum.select_option('[data-bind="reg.company"]', label='Cloudnest')
    alum.click('[data-act="regAlumni"]'); alum.wait_for_timeout(900)
    check('alumnus is pending until verified', 'Waiting for verification' in alum.inner_text('#app'))
    go(admin, '#/ad/verify'); sync(admin); admin.locator('[data-act="adVerify"][data-t="alumni"]').first.click(); admin.wait_for_timeout(600)
    sync(lead)
    check('lead now sees the verified alumnus (same college only)', len(ev(lead, "()=>S.alumni")) == 1)

    # ---- the intro flow, end to end ----
    cloud = [c for c in ev(lead, "()=>S.companies") if c['name'] == 'Cloudnest'][0]
    check('email hidden before outreach', 'email' not in cloud['contact'])
    go(lead, '#/intro/' + cloud['id']); lead.wait_for_selector('[data-act="sendIntro"]')
    lead.click('[data-act="sendIntro"]'); lead.wait_for_timeout(300)   # warns (proof incomplete)
    check('first tap only warns', len(ev(lead, "()=>S.intros")) == 0)
    lead.click('[data-act="sendIntro"]'); lead.wait_for_timeout(900)
    check('intro stored on the server and lead is on the pipeline', len(ev(lead, "()=>S.intros")) == 1 and ev(lead, "()=>location.hash") == '#/pipeline', ev(lead, "()=>location.hash"))
    check('pipeline item created in stage intro', ev(lead, "()=>S.pipeline.map(p=>p.stage)") == ['intro'])
    sync(lead)
    cloud2 = [c for c in ev(lead, "()=>S.companies") if c['name'] == 'Cloudnest'][0]
    check('email revealed after outreach', cloud2['contact'].get('email') == 'neha@cloudnest.example')
    # alumnus sees it, accepts
    sync(alum); go(alum, '#/a/inbox'); alum.wait_for_timeout(300)
    check('alumnus sees the request', alum.locator('[data-act="aAccept"]').count() == 1)
    alum.click('[data-act="aAccept"]'); alum.wait_for_timeout(900)
    sync(lead)
    check('lead sees acceptance and notification', ev(lead, "()=>S.intros[0].status") == 'accepted' and any('accepted' in n['text'] for n in ev(lead, "()=>S.notifs")))

    # ---- brand: register, verify, receive a pitch, decline ----
    brand = new_page(); login(brand, 'neha@zestly.t')
    brand.click('[data-act="openReg"][data-v="brand"]'); brand.wait_for_selector('[data-bind="reg.company"]')
    fill_sheet(brand, {'reg.name': 'Neha Kulkarni', 'reg.role': 'Marketing Lead', 'reg.company': 'Zestly', 'reg.city': 'Pune', 'reg.email': 'neha@zestly.example'})
    brand.click('[data-act="regBrand"]'); brand.wait_for_timeout(900)
    go(admin, '#/ad/verify'); sync(admin); admin.locator('[data-act="adVerify"][data-t="company"]').first.click(); admin.wait_for_timeout(600)
    sync(lead); zid = [c for c in ev(lead, "()=>S.companies") if c['name'] == 'Zestly']
    check('verified brand appears in the directory', len(zid) == 1)
    go(lead, '#/company/' + zid[0]['id']); lead.click('[data-act="openPitch"]'); lead.wait_for_selector('[data-act="sendPitch"]'); lead.click('[data-act="sendPitch"]'); lead.wait_for_timeout(900)
    check('pitch request created', len(ev(lead, "()=>S.requests")) == 1)
    sync(brand); go(brand, '#/b/inbox'); brand.wait_for_timeout(300)
    check('brand sees the request', brand.locator('[data-act="bDecline"]').count() == 1)
    brand.click('[data-act="bDecline"]'); brand.wait_for_selector('[data-act="bDeclineGo"]'); brand.click('[data-act="bDeclineGo"]'); brand.wait_for_timeout(900)
    sync(lead)
    zp = [x for x in ev(lead, "()=>S.pipeline") if x['companyId'] == zid[0]['id']][0]
    check('fest sees the decline reason in its pipeline', zp['stage'] == 'declined' and zp['decline'], zp['stage'])

    # ---- edits sync (and teammates, conflicts, read-only) ----
    ev(lead, "()=>{ const f=myFest(); mutate(()=>{ f.target=1200000; }); }"); sync(lead)
    check('lead target persisted on the server', cur.execute("select data->>'target' from entities where kind='fests' limit 1") or cur.fetchone()[0] == '1200000')
    code = ev(lead, "()=>myFest().joinCode"); vcode = ev(lead, "()=>myFest().viewCode")
    member = new_page(); login(member, 'kabir@t.test'); member.click('[data-act="openReg"][data-v="join"]'); member.wait_for_selector('[data-bind="reg.code"]')
    fill_sheet(member, {'reg.name': 'Kabir Mehra', 'reg.code': code}); member.click('[data-act="joinFest"]'); member.wait_for_timeout(900)
    check('teammate joined with the code', ev(member, "()=>me().festRole") == 'member' and len(ev(member, "()=>S.users")) == 2)
    check('member cannot see team codes', ev(member, "()=>myFest().joinCode") is None)
    conv = new_page(); login(conv, 'ishaan@t.test'); conv.click('[data-act="openReg"][data-v="join"]'); conv.wait_for_selector('[data-bind="reg.code"]')
    fill_sheet(conv, {'reg.name': 'Ishaan Nair', 'reg.code': vcode}); conv.click('[data-act="joinFest"]'); conv.wait_for_timeout(900)
    check('convenor is view only', ev(conv, "()=>canEdit()") is False)
    err = ev(conv, "async()=>{ try{ await rpcCall('apply_changes',{changes:[{kind:'fests',id:myFest().id,op:'upsert',baseV:myFest()._v,data:Object.assign({},myFest(),{target:5})}]}); return 'allowed'; }catch(e){ return e.message; } }")
    check('server blocks a convenor even if the app is bypassed', err != 'allowed', err)
    # shortlist added by member shows up for the lead
    ev(member, "()=>{ mutate(()=>{ S.shortlists.push({id:uid('sl'),festId:myFest().id,name:'Tech',companyIds:[]}); }); }"); sync(member); sync(lead)
    check('teammate change reaches the lead', len(ev(lead, "()=>S.shortlists")) == 1)
    # two people edit the same pipeline item: second gets a conflict and is refreshed
    pid = ev(lead, "()=>S.pipeline.find(p=>p.stage==='intro').id")
    sync(member)
    ev(lead, "(id)=>{ mutate(()=>{ P(id).ask = 111111; }); }", pid); lead.wait_for_timeout(700)
    ev(member, "(id)=>{ mutate(()=>{ P(id).ask = 222222; }); }", pid); member.wait_for_timeout(900); sync(member); sync(lead)
    check('conflicting edit is rejected and refreshed', ev(lead, "(id)=>P(id).ask", pid) == ev(member, "(id)=>P(id).ask", pid) == 111111, (ev(lead, "(id)=>P(id).ask", pid), ev(member, "(id)=>P(id).ask", pid)))

    # ---- deal, sponsor page with token, archive ----
    ev(lead, """(id)=>{ ui.forms.cm={id,amount:'150000',kind:'cash',split:'half',later:toDateInput(Date.now()+60*86400000),items:{banner:true,stall:true,social:true,mention:false,report:true}}; }""", pid)
    ev(lead, "()=>openSheet('commit',{})"); lead.click('[data-act="saveCommit"]'); lead.wait_for_timeout(900); sync(lead)
    deal = ev(lead, "(id)=>P(id)", pid)
    check('deal recorded with payments and a server-issued share token', deal['stage'] == 'committed' and len(deal['payments']) == 2 and len(deal.get('shareToken', '')) > 20, deal['stage'])
    anon = new_page()
    anon.goto('file://' + site + '/index.html#/sponsor/' + deal['shareToken']); anon.wait_for_timeout(300); anon.reload(); anon.wait_for_timeout(900)
    t = anon.inner_text('#app')
    check('public sponsor page loads without signing in', 'Kalpana Fest' in t and 'Cloudnest' in t and 'Deliverables' in t, t[:200])
    check('public page hides private data', 'Aditi' not in t and 'neha@cloudnest' not in t)
    anon.goto('file://' + site + '/index.html#/sponsor/' + 'f' * 36); anon.wait_for_timeout(900)
    check('wrong token shows not-found', 'Link not found' in anon.inner_text('#app'))
    ev(lead, "()=>{ go('#/archive'); }"); lead.wait_for_selector('[data-act="archiveEdition"]'); lead.click('[data-act="archiveEdition"]'); lead.wait_for_timeout(900); sync(lead)
    check('edition archived on the server', len(ev(lead, "()=>S.archive")) == 1)

    # ---- notifications, sign out, persistence across reload ----
    check('alumnus got a notification about the request', any('asked you' in n['text'] for n in ev(alum, "()=>S.notifs")))
    lead.reload(); lead.wait_for_timeout(1200)
    check('session survives a reload (data reloaded from the server)', ev(lead, "()=>!!me() && S.pipeline.length>=2"))
    ev(lead, "()=>sb.auth.signOut()"); lead.wait_for_timeout(500)
    check('sign out returns to the sign-in screen', lead.locator('[data-act="sbSendCode"]').count() == 1)
    print('--- errors ---'); print('\n'.join(errors) or 'none')
    print('FAILS:', fails)
    b.close()
