/* ===== Live backend (Supabase) ===== */
let sb = null;
const SYNC = { chain: Promise.resolve(), pending: 0, vers: {}, sig: '' };
const SYNC_KINDS = ['fests', 'companies', 'alumni', 'pipeline', 'shortlists', 'archive', 'reports'];
const SNAP_KEYS = ['fests', 'companies', 'alumni', 'pipeline', 'shortlists', 'intros', 'requests', 'archive', 'reports', 'audit'];

function friendly(err) {
  const m = String((err && err.message) || err || 'Something went wrong');
  if (m === 'conflict') return 'Someone else just changed this. We refreshed it for you.';
  if (/jwt|expired|not authenticated|Sign in first/i.test(m)) return 'Please sign in again.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No connection. Check your internet and try again.';
  return m;
}
function stripV(o) { const c = Object.assign({}, o); delete c._v; return c; }
function syncSnapshot() {
  const m = {};
  SYNC_KINDS.forEach((k) => (S[k] || []).forEach((x) => { m[k + '|' + x.id] = JSON.stringify(stripV(x)); }));
  return m;
}
function pushChanges(before) {
  const after = syncSnapshot(), byKey = {}, changes = [];
  SYNC_KINDS.forEach((k) => (S[k] || []).forEach((x) => { byKey[k + '|' + x.id] = x; }));
  Object.keys(after).forEach((key) => {
    if (before[key] !== after[key]) { const p = key.split('|'); changes.push({ kind: p[0], id: p[1], op: 'upsert', data: stripV(byKey[key]) }); }
  });
  Object.keys(before).forEach((key) => {
    if (!(key in after)) { const p = key.split('|'); changes.push({ kind: p[0], id: p[1], op: 'delete' }); }
  });
  if (!changes.length) return;
  SYNC.pending++;
  SYNC.chain = SYNC.chain.then(() => sendChanges(changes)).catch(() => {}).then(() => { SYNC.pending--; if (SYNC.pending === 0) refresh(); });
}
async function sendChanges(changes) {
  const payload = changes.map((c) => ({ kind: c.kind, id: c.id, op: c.op, data: c.data, baseV: SYNC.vers[c.kind + '|' + c.id] || 0 }));
  const res = await sb.rpc('apply_changes', { changes: payload });
  if (res.error) { toast(friendly(res.error)); throw res.error; }
  const v = (res.data && res.data.versions) || {};
  Object.keys(v).forEach((k) => { if (v[k] === 0) delete SYNC.vers[k]; else SYNC.vers[k] = v[k]; });
}
async function rpcCall(name, args) {
  await SYNC.chain.catch(() => {});
  const res = await sb.rpc(name, args || {});
  if (res.error) throw res.error;
  return res.data;
}
/* run a server action, then refresh and report */
async function serverDo(name, args, okMsg, after) {
  try {
    const data = await rpcCall(name, args);
    await refresh();
    if (okMsg) toast(okMsg);
    if (after) after(data);
    return data;
  } catch (e) { toast(friendly(e)); await refresh(true); return null; }
}
async function serverRegister(name, p, okMsg) {
  try {
    await rpcCall(name, { p });
    ui.sheet = null; await refresh();
    toast(okMsg); go(defaultHash(me()));
  } catch (e) { toast(friendly(e)); }
}
function clearServerState() {
  SNAP_KEYS.forEach((k) => { S[k] = []; });
  S.users = []; S.notifs = []; S.benchmarks = {}; S.session.userId = null; SYNC.vers = {}; SYNC.sig = ''; ui.noProfile = false;
}
function applySnapshot(d) {
  if (!d || !d.profile) { clearServerState(); ui.noProfile = true; return; }
  ui.noProfile = false;
  S.session.userId = d.profile.id;
  S.users = (d.users || []).slice();
  if (!S.users.some((u) => u.id === d.profile.id)) S.users.push(d.profile);
  SNAP_KEYS.forEach((k) => { S[k] = d[k] || []; });
  S.notifs = d.notifs || [];
  S.benchmarks = {};
  (d.benchmarks || []).forEach((b) => { S.benchmarks[b.type + '|' + b.size + '|' + b.cat] = b; });
  SYNC.vers = {};
  SYNC_KINDS.forEach((k) => S[k].forEach((x) => { SYNC.vers[k + '|' + x.id] = x._v; }));
}
async function refresh(quiet) {
  if (!sb || !ui.sbSession) return;
  if (quiet && SYNC.pending > 0) return;
  const res = await sb.rpc('bootstrap');
  if (res.error) { if (!quiet || /jwt|expired/i.test(res.error.message || '')) toast(friendly(res.error)); return; }
  const sig = JSON.stringify(res.data, (k, v) => (k === 'serverTime' ? undefined : v));
  if (quiet && sig === SYNC.sig) return;
  if (SYNC.pending > 0) return;
  SYNC.sig = sig;
  applySnapshot(res.data);
  render();
}

/* ---------- sign-in by emailed code ---------- */
V.loginServer = () => {
  if (ui.bootError) return '<div class="hero"><div class="brand"><i></i>SponsrMitra</div><div class="empty"><div class="h2">We could not connect</div><div class="note">' + esc(ui.bootError) + '</div><button class="btn primary mt16" onclick="location.reload()">Try again</button></div></div>';
  if (ui.sbSession && ui.noProfile) {
    return '<div class="hero"><div class="brand"><i></i>SponsrMitra</div><h1 class="h1 mt20" style="font-size:30px">Tell us who you are</h1><p class="note mt12" style="font-size:16px">Pick the option that fits. The verification desk checks every fest, brand and alumnus before they appear to others.</p></div>' +
      '<div class="pad"><button class="persona" data-act="openReg" data-v="fest">' + avatar('F', 'lg') + '<div class="f1"><div class="sg" style="font-weight:700;font-size:16px">I run sponsorship for a fest</div><div class="note">Register your fest and get a team code</div></div>' + ico('chev', 18) + '</button>' +
      '<button class="persona" data-act="openReg" data-v="join">' + avatar('T', 'lg') + '<div class="f1"><div class="sg" style="font-weight:700;font-size:16px">I’m joining a fest team</div><div class="note">Use the team code your lead shared</div></div>' + ico('chev', 18) + '</button>' +
      '<button class="persona" data-act="openReg" data-v="brand">' + avatar('B', 'lg') + '<div class="f1"><div class="sg" style="font-weight:700;font-size:16px">I represent a brand</div><div class="note">Receive verified sponsorship requests</div></div>' + ico('chev', 18) + '</button>' +
      '<button class="persona" data-act="openReg" data-v="alumni">' + avatar('A', 'lg') + '<div class="f1"><div class="sg" style="font-weight:700;font-size:16px">I’m an alumnus</div><div class="note">Help juniors with warm introductions</div></div>' + ico('chev', 18) + '</button>' +
      '<button class="btn ghost sm mt20" data-act="signout">Sign out</button></div>';
  }
  const a = ui.auth || { step: 'email', email: '' };
  return '<div class="hero"><div class="brand"><i></i>SponsrMitra</div><h1 class="h1" style="font-size:34px;margin-top:22px">Sponsorship, sorted for college fests.</h1>' +
    '<p class="note mt12" style="font-size:16px">Verified companies, real benchmarks and warm introductions through your own alumni.</p></div><div class="pad">' +
    (a.step === 'code'
      ? '<div class="card mt16"><div class="h3">Check your email</div><p class="note mt8">We sent a code to <b class="sg" style="color:var(--ink)">' + esc(a.email) + '</b>. Enter it below.</p>' + fld('Code', inp('au.code', { ph: '123456' })) +
        '<button class="btn primary mt16 ' + (a.busy ? 'off' : '') + '" data-act="sbVerify">Sign in</button><button class="btn ghost mt12" data-act="sbBack">Use a different email</button></div>'
      : '<div class="card mt16"><div class="h3">Sign in or create an account</div><p class="note mt8">No password. We email you a short code.</p>' + fld('Email', inp('au.email', { type: 'email', ph: 'you@college.edu' })) +
        '<button class="btn primary mt16 ' + (a.busy ? 'off' : '') + '" data-act="sbSendCode">Email me a code</button></div>') +
    '<p class="note mt16">By continuing you agree to the <a href="' + esc(CFG.termsUrl || '#') + '" style="text-decoration:underline">terms</a> and <a href="' + esc(CFG.privacyUrl || '#') + '" style="text-decoration:underline">privacy policy</a>.</p></div>';
};
ACT.sbSendCode = async () => {
  const email = (fv('au.email') || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Enter a valid email address');
  ui.auth = { step: 'email', email, busy: true }; render();
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) { ui.auth = { step: 'email', email }; render(); return toast(friendly(error)); }
  ui.auth = { step: 'code', email }; setPath(ui.forms, 'au.code', ''); render(); toast('We emailed you a code');
};
ACT.sbBack = () => { ui.auth = { step: 'email', email: ui.auth ? ui.auth.email : '' }; render(); };
ACT.sbVerify = async () => {
  const token = (fv('au.code') || '').replace(/\s/g, '');
  if (token.length < 4) return toast('Enter the code from your email');
  const { error } = await sb.auth.verifyOtp({ email: ui.auth.email, token, type: 'email' });
  if (error) return toast('That code did not work. Check it and try again.');
  ui.sbSession = true; ui.auth = null;
  await refresh();
  if (me()) location.hash = defaultHash(me()); else location.hash = '#/';
  render();
};
ACT.joinFest = () => {
  const r = ui.forms.reg || {};
  if (!need(r, ['name', 'code'])) return toast('Enter your name and the team code');
  serverRegister('join_fest', { name: r.name, code: r.code }, 'Welcome to the team.');
};

/* ---------- team codes (fest lead) ---------- */
ACT.inviteTeam = () => {
  if (!SERVER) return copyText(location.href.split('#')[0]).then((ok) => toast(ok ? 'Invite link copied' : 'Copy the page address to invite teammates'));
  openSheet('team');
};
SHEETS.team = () => {
  const f = myFest(), lead = me().festRole === 'lead';
  if (!lead) return '<div class="h2">Invite your team</div><p class="note mt8">Ask the sponsorship lead for the team codes.</p><button class="btn ghost mt16" data-act="closeSheet">Close</button>';
  return '<div class="h2">Invite your team</div><p class="note mt8">Share the app link and one of these codes. They sign in, choose “I’m joining a fest team” and enter the code.</p>' +
    '<div class="card mt16"><div class="cap">Team member code (can edit)</div><div class="big sm mt4" style="letter-spacing:.08em">' + esc(f.joinCode || '') + '</div><button class="btn ghost sm mt12" data-act="copyCode" data-v="' + esc(f.joinCode || '') + '">Copy code</button></div>' +
    '<div class="card mt12"><div class="cap">Convenor or faculty code (view only)</div><div class="big sm mt4" style="letter-spacing:.08em">' + esc(f.viewCode || '') + '</div><button class="btn ghost sm mt12" data-act="copyCode" data-v="' + esc(f.viewCode || '') + '">Copy code</button></div>' +
    '<button class="btn ghost mt16" data-act="closeSheet">Done</button>';
};
ACT.copyCode = (el) => copyText(el.dataset.v).then((ok) => toast(ok ? 'Code copied' : 'Select the code and copy it'));

/* ---------- public sponsor page ---------- */
function loadSponsor(token) {
  ui.view.sp = ui.view.sp || {};
  ui.view.sp[token] = 'loading';
  sb.rpc('public_sponsor', { token }).then((res) => { ui.view.sp[token] = res.error || !res.data ? null : res.data; render(); });
}

/* ---------- start ---------- */
async function initServer() {
  ui.booting = true; render();
  try {
    if (!window.supabase || !window.supabase.createClient) throw new Error('The connection library did not load. Check your internet connection.');
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const got = await sb.auth.getSession();
    ui.sbSession = !!(got && got.data && got.data.session);
    sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { ui.sbSession = false; clearServerState(); location.hash = '#/'; render(); } });
    if (ui.sbSession) await refresh();
  } catch (e) { ui.bootError = e.message; }
  ui.booting = false;
  onRoute();
  setInterval(() => { if (!document.hidden && ui.sbSession && SYNC.pending === 0) refresh(true); }, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ui.sbSession) refresh(true); });
}
