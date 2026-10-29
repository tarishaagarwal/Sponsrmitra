/* ===== Sign-in, registration, notifications, reports ===== */
const ROLE_LABEL = { fest: 'Fest team', brand: 'Brand', alumni: 'Alumnus', admin: 'Verification desk' };
const COLORS = ['#1F5C56', '#A83A2D', '#3F5A78', '#6B3A6B', '#8A5A0B', '#4F6D3A', '#2C6E8F', '#555B6E'];

V.login = () => (SERVER ? V.loginServer() : DEMO_OK ? V.loginDemo() : V.holding());
V.holding = () => '<div class="hero"><div class="brand"><i></i>SponsrMitra</div><h1 class="h1" style="font-size:34px;margin-top:22px">Sponsorship, sorted for college fests.</h1>' +
  '<p class="note mt12" style="font-size:16px">Verified companies, real benchmarks and warm introductions through your own alumni.</p></div>' +
  '<div class="pad"><div class="card mt16"><div class="h3">We’re opening soon</div><p class="note mt8">SponsrMitra is being set up for its first fests. ' + (CFG.contactEmail ? 'To be among the first, write to <a href="mailto:' + esc(CFG.contactEmail) + '" style="text-decoration:underline">' + esc(CFG.contactEmail) + '</a>.' : 'Please check back shortly.') + '</p></div></div>';
V.loginDemo = () => {
  const personas = S.users.map((u) => '<button class="persona" data-act="signin" data-id="' + u.id + '">' + avatar(u.initials, 'lg') +
    '<div class="f1"><div class="sg" style="font-weight:700;font-size:16px">' + esc(u.name) + '</div><div class="note">' + esc(ROLE_LABEL[u.role]) + '. ' + esc(u.title) + '</div></div>' + ico('chev', 18, 'currentColor', 2) + '</button>').join('');
  return '<div class="hero"><div class="brand"><i></i>SponsrMitra</div>' +
    '<h1 class="h1" style="font-size:34px;margin-top:22px">Sponsorship, sorted for college fests.</h1>' +
    '<p class="note mt12" style="font-size:16px">Verified companies, real benchmarks and warm introductions through your own alumni. Pick a person to explore the product from their side.</p></div>' +
    '<div class="pad"><div class="cap mt16">Explore as</div>' + personas +
    '<div class="sec"><div class="h3">Create an account</div></div>' +
    '<div class="row wrap"><button class="btn ghost sm" data-act="openReg" data-v="fest">Register a fest</button><button class="btn ghost sm" data-act="openReg" data-v="brand">Register a brand</button><button class="btn ghost sm" data-act="openReg" data-v="alumni">Join as alumnus</button></div>' +
    '<p class="note mt20">This is a working demo. Data is saved in this browser only. Use the person switcher at the top to see how a request moves between fest, alumnus, brand and verification desk.</p></div>';
};
ACT.signin = (el) => { S.session.userId = el.dataset.id; save(); go(defaultHash(me())); };
ACT.signout = () => { if (SERVER) { ui.sheet = null; sb.auth.signOut(); return; } S.session.userId = null; save(); ui.sheet = null; location.hash = '#/'; render(); };
ACT.resetDemo = () => { resetAll(); ui.sheet = null; ui.forms = {}; location.hash = '#/'; render(); toast('Demo data reset'); };
ACT.closeSheet = () => closeSheet();
ACT.overlay = () => closeSheet();

/* persona switcher */
ACT.openPersona = () => openSheet('persona');
SHEETS.persona = () => {
  const cur = me();
  if (SERVER) return '<div class="h2">Your account</div><div class="card mt12"><div class="row">' + avatar(cur.initials, 'lg') + '<div class="f1"><div class="sg" style="font-weight:700">' + esc(cur.name) + '</div><div class="note">' + esc(ROLE_LABEL[cur.role]) + (cur.role === 'fest' ? ', ' + esc(cur.festRole) : '') + '</div><div class="cap">' + esc(cur.email || '') + '</div></div></div></div><div class="row mt16"><button class="btn ghost" data-act="signout">Sign out</button><button class="btn ghost" data-act="closeSheet">Close</button></div>';
  return '<div class="h2">Switch person</div><p class="note mt8">See the same data from another side of the product.</p>' +
    S.users.map((u) => '<button class="persona" data-act="signin" data-id="' + u.id + '"' + (u.id === cur.id ? ' style="border-color:var(--mari)"' : '') + '>' + avatar(u.initials) +
      '<div class="f1"><div class="sg" style="font-weight:700;font-size:15px">' + esc(u.name) + '</div><div class="note">' + esc(ROLE_LABEL[u.role]) + (u.role === 'fest' ? ', ' + esc(u.festRole) : '') + '</div></div>' + (u.id === cur.id ? pill('You', 'teal') : '') + '</button>').join('') +
    '<div class="row mt16"><button class="btn ghost" data-act="signout">Sign out</button><button class="btn danger" data-act="resetDemo">Reset demo data</button></div>';
};

/* notifications */
ACT.openNotifs = () => { openSheet('notifs'); S.notifs.filter((n) => n.userId === S.session.userId && !n.read).forEach((n) => { n.read = true; }); save(); if (SERVER) rpcCall('mark_notifs_read').catch(() => {}); };
SHEETS.notifs = () => {
  const u = me();
  const items = S.notifs.filter((n) => n.userId === u.id).slice(0, 25);
  return '<div class="h2">Notifications</div>' +
    (items.length ? '<div class="card mt12" style="padding:6px 16px">' + items.map((n) => '<a class="lr" href="' + esc(n.link || '#/') + '"><div class="t"><b style="font-weight:600">' + esc(n.text) + '</b><span>' + agoText(n.ts) + '</span></div>' + ico('chev', 16, 'currentColor', 2) + '</a>').join('') + '</div>' : empty('Nothing yet', 'Replies, intro responses and due tasks show up here.')) +
    (u.role === 'fest' ? '<button class="btn ghost mt16" data-act="digest">Preview this week’s digest</button><p class="note mt8">In the live product this goes to email and WhatsApp.</p>' : '') +
    '<button class="btn ghost mt12" data-act="closeSheet">Close</button>';
};
ACT.digest = () => {
  const f = myFest(); const t = totals(f.id);
  const open = festPipeline(f.id).filter((p) => !['committed', 'declined'].includes(p.stage));
  const due = open.filter((p) => p.followUp && p.followUp <= Date.now() + 2 * DAY);
  showText('Weekly digest for ' + f.name,
    'Hello team,\n\nThis week on ' + f.name + ':\n- Confirmed: ' + money(t.confirmed) + ' of ' + money(f.target) + '\n- Likely: ' + money(t.likely) + '\n- Hoped for: ' + money(t.hoped) + '\n- Conversations in progress: ' + open.length +
    '\n- Follow-ups due in the next two days: ' + (due.length ? due.map((p) => C(p.companyId).name).join(', ') : 'none') + '\n\nOpen SponsrMitra to see the pipeline.');
};

/* registration */
ACT.openReg = (el) => {
  const v = el.dataset.v;
  if (SERVER) ui.forms.reg = ui.forms.reg || {};
  if (SERVER && v === 'alumni') {
    rpcCall('reg_options').then((o) => {
      ui.view.regOpts = o;
      ui.forms.reg = { cohort: '2020', help: 'introduce', cap: '3', company: (o.companies[0] || {}).id || '', college: o.colleges[0] || '__other' };
      openSheet('reg', { v });
    }).catch((e) => toast(friendly(e)));
    return;
  }
  ui.forms.reg = { type: 'Technical', visitors: '2000', cat: 'tech', city: '', help: 'introduce', cap: '3', band: 'Under 1L', college: ((S.fests[0] || {}).college || ''), cohort: '2020', company: ((S.companies.find((c) => c.status === 'verified') || {}).id || ''), start: toDateInput(ahead(90)), 'cash': true, 'inkind': false, hiring: false, prizes: false, stalls: false };
  openSheet('reg', { v });
};
SHEETS.reg = (p) => {
  if (p.v === 'fest') return '<div class="h2">Register your fest</div><p class="note mt8">You can browse straight away. Requests unlock once the verification desk confirms your fest.</p>' +
    fld('Your name', inp('reg.name', { ph: 'Your full name' })) + fld('Fest name', inp('reg.fest', { ph: 'Name of your fest' })) + fld('College', inp('reg.college')) + fld('City', inp('reg.city', { ph: 'Pune' })) +
    fld('Type of fest', sel('reg.type', FEST_TYPES)) + fld('Expected visitors', inp('reg.visitors', { type: 'number', min: 0 })) + fld('Start date', inp('reg.start', { type: 'date' })) +
    fld('Who attends', inp('reg.audience', { ph: 'Engineering undergraduates, 18 to 22' })) +
    '<button class="btn primary mt20" data-act="regFest">Create account</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
  if (p.v === 'brand') return '<div class="h2">Register your brand</div><p class="note mt8">Your listing appears to students after the verification desk checks your contact.</p>' +
    fld('Your name', inp('reg.name')) + fld('Your role', inp('reg.role', { ph: 'Campus Marketing Lead' })) + fld('Company', inp('reg.company')) +
    fld('Category', sel('reg.cat', CATS.filter((c) => !c.tier).map((c) => [c.k, c.label]))) + fld('City', inp('reg.city')) + fld('Work email', inp('reg.email', { type: 'email' })) +
    '<div class="cap mt12">What you can offer</div><div class="row wrap mt8">' + [['cash', 'Cash'], ['inkind', 'In-kind'], ['hiring', 'Hiring'], ['prizes', 'Prizes'], ['stalls', 'Stalls']].map((x) => '<button class="chip ' + (fv('reg.' + x[0]) ? 'on' : '') + '" data-act="regTog" data-k="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
    '<button class="btn primary mt20" data-act="regBrand">Create account</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
  if (p.v === 'join') return '<div class="h2">Join your fest team</div><p class="note mt8">Ask your sponsorship lead for the team code. It is on their Profile page under Team.</p>' +
    fld('Your name', inp('reg.name')) + fld('Team code', inp('reg.code', { ph: 'ABCD1234' })) + '<button class="btn primary mt20" data-act="joinFest">Join the team</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
  const opts = SERVER ? (ui.view.regOpts || { companies: [], colleges: [] }) : null;
  const colleges = SERVER ? opts.colleges.slice() : Array.from(new Set(S.fests.map((f) => f.college).concat(S.alumni.map((a) => a.college))));
  const collegeOpts = SERVER ? colleges.map((c) => [c, c]).concat([['__other', 'My college is not listed']]) : colleges;
  const companyOpts = SERVER ? opts.companies.map((c) => [c.id, c.name]) : S.companies.filter((c) => c.status === 'verified').map((c) => [c.id, c.name]);
  return '<div class="h2">Join as an alumnus</div><p class="note mt8">Help juniors from your college get a warm introduction. You choose how many requests you take each month.</p>' +
    fld('Your name', inp('reg.name')) + fld('College', sel('reg.college', collegeOpts, { rerender: true })) + (fv('reg.college') === '__other' ? fld('Your college', inp('reg.collegeOther')) : '') + fld('Class of', inp('reg.cohort', { type: 'number' })) +
    fld('Company', sel('reg.company', companyOpts)) + fld('Your role', inp('reg.role', { ph: 'Product Manager' })) +
    fld('How can you help', sel('reg.help', [['introduce', 'Introduce juniors'], ['advise', 'Advise only']])) + fld('Requests per month', sel('reg.cap', ['1', '2', '3', '5', '8'])) +
    '<button class="btn primary mt20" data-act="regAlumni">Create account</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
};
ACT.regTog = (el) => { ui.forms.reg[el.dataset.k] = !ui.forms.reg[el.dataset.k]; render(); };
const need = (o, keys) => keys.every((k) => String(o[k] || '').trim());
ACT.regFest = () => {
  const r = ui.forms.reg;
  if (!need(r, ['name', 'fest', 'college', 'city', 'visitors', 'start'])) return toast('Please fill in every field');
  if (SERVER) return serverRegister('register_fest', { name: r.name, fest: r.fest, college: r.college, city: r.city, type: r.type, visitors: +r.visitors, start: fromDateInput(r.start), audience: r.audience || '' }, 'Welcome. Your fest is waiting for verification.');
  const fid = uid('f_'), usr = uid('u_');
  mutate(() => {
    S.fests.push({ id: fid, name: r.fest.trim(), college: r.college.trim(), city: r.city.trim(), type: r.type, visitors: +r.visitors, start: fromDateInput(r.start), audience: (r.audience || '').trim() || 'Students of ' + r.college.trim(), pastSponsors: [], status: 'pending', verifiedOn: null, contributed: false, target: 0, packages: [], proof: { footfall: null, photos: [], logos: [], testimonials: [] }, handover: {} });
    S.users.push({ id: usr, name: r.name.trim(), initials: initials(r.name), role: 'fest', festRole: 'lead', entityId: fid, title: 'Sponsorship lead, ' + r.fest.trim() });
    notify(['u_admin'], r.fest.trim() + ' is waiting for fest verification', '#/ad/verify');
    S.session.userId = usr; ui.sheet = null;
  });
  toast('Welcome. Your fest is waiting for verification.'); go('#/home');
};
ACT.regBrand = () => {
  const r = ui.forms.reg;
  if (!need(r, ['name', 'role', 'company', 'city', 'email'])) return toast('Please fill in every field');
  if (SERVER) return serverRegister('register_brand', { name: r.name, role: r.role, company: r.company, cat: r.cat, city: r.city, email: r.email, sub: CAT_LABEL[r.cat], color: COLORS[Math.floor(Math.random() * COLORS.length)], tags: [['cash', 'Cash'], ['inkind', 'In-kind'], ['hiring', 'Hiring'], ['prizes', 'Prizes'], ['stalls', 'Stalls']].filter((x) => r[x[0]]).map((x) => x[1]) }, 'Welcome. Your listing goes live once verified.');
  const cid = uid('c_'), usr = uid('u_');
  const tags = [['cash', 'Cash'], ['inkind', 'In-kind'], ['hiring', 'Hiring'], ['prizes', 'Prizes'], ['stalls', 'Stalls']].filter((x) => r[x[0]]).map((x) => x[1]);
  mutate(() => {
    S.companies.push({ id: cid, name: r.company.trim(), sub: CAT_LABEL[r.cat], cat: r.cat, city: r.city.trim(), tags: tags.length ? tags : ['Cash'], band: 'Under 1L', color: COLORS[S.companies.length % COLORS.length], contact: { name: r.name.trim(), role: r.role.trim(), email: r.email.trim(), channel: 'Email', replyDays: 5 }, verifiedOn: null, status: 'pending', bench: { lo: 0.5, hi: 1.5, n: 5 }, past: [], inbound: { paused: false, weeklyCap: 6, types: FEST_TYPES.slice() }, visible: { email: false, band: true } });
    S.users.push({ id: usr, name: r.name.trim(), initials: initials(r.name), role: 'brand', entityId: cid, title: r.role.trim() + ', ' + r.company.trim() });
    notify(['u_admin'], r.company.trim() + ' is waiting for contact verification', '#/ad/verify');
    S.session.userId = usr; ui.sheet = null;
  });
  toast('Welcome. Your listing goes live once verified.'); go('#/b/dash');
};
ACT.regAlumni = () => {
  const r = ui.forms.reg;
  const college = r.college === '__other' ? (r.collegeOther || '') : r.college;
  if (!need(r, ['name', 'cohort', 'company', 'role']) || !college.trim()) return toast('Please fill in every field');
  if (SERVER) return serverRegister('register_alumnus', { name: r.name, college: college.trim(), cohort: +r.cohort, companyId: r.company, role: r.role, helps: r.help, cap: +r.cap }, 'Welcome. Juniors see you once you are verified.');
  const aid = uid('a_'), usr = uid('u_');
  mutate(() => {
    S.alumni.push({ id: aid, name: r.name.trim(), initials: initials(r.name), cohort: +r.cohort, companyId: r.company, role: r.role.trim(), helps: r.help, cap: +r.cap, college, status: 'pending', userId: usr });
    S.users.push({ id: usr, name: r.name.trim(), initials: initials(r.name), role: 'alumni', entityId: aid, title: 'Alumnus, ' + C(r.company).name });
    notify(['u_admin'], r.name.trim() + ' joined as alumnus and needs verification', '#/ad/verify');
    S.session.userId = usr; ui.sheet = null;
  });
  toast('Welcome. Juniors see you once you are verified.'); go('#/a/inbox');
};

/* problem reports */
ACT.openReport = (el) => {
  ui.forms.rep = { kind: 'Wrong contact', text: '', targetType: el.dataset.t, targetId: el.dataset.id };
  openSheet('report');
};
SHEETS.report = () => '<div class="h2">Report a problem</div><p class="note mt8">The verification desk reviews every report.</p>' +
  fld('What is wrong', sel('rep.kind', ['Wrong contact', 'Fake or suspicious listing', 'Abusive behaviour', 'Other'])) + fld('Details', txt('rep.text', { rows: 4 })) +
  '<button class="btn primary mt20" data-act="sendReport">Send report</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.sendReport = () => {
  const r = ui.forms.rep;
  if (!r.text.trim()) return toast('Add a few details first');
  mutate(() => {
    S.reports.unshift({ id: uid('rp'), kind: r.kind, targetType: r.targetType, targetId: r.targetId, by: S.session.userId, text: r.text.trim(), status: 'open', ts: Date.now() });
    notify(['u_admin'], 'New report: ' + r.kind, '#/ad/reports'); ui.sheet = null;
  });
  toast('Thank you. The desk will review this.');
};

/* privacy */
ACT.exportMine = () => {
  const u = me();
  const data = { person: u };
  if (u.role === 'fest') { data.fest = F(u.entityId); data.pipeline = festPipeline(u.entityId); data.shortlists = S.shortlists.filter((s) => s.festId === u.entityId); data.intros = S.intros.filter((i) => i.festId === u.entityId); }
  if (u.role === 'brand') { data.company = C(u.entityId); data.requests = S.requests.filter((r) => r.companyId === u.entityId); }
  if (u.role === 'alumni') { data.alumnus = A(u.entityId); data.requests = S.intros.filter((i) => i.alumnusId === u.entityId); }
  const copy = JSON.stringify(data, (k, v) => (typeof v === 'string' && v.startsWith('data:image') ? '[photo]' : v), 2);
  showText('Your data', copy, 'sponsrmitra-my-data.json');
};
ACT.deleteMe = () => {
  if (ui.forms.confirmDelete !== true) { ui.forms.confirmDelete = true; toast('Tap Delete account again to confirm'); return; }
  if (SERVER) { ui.forms.confirmDelete = false; return rpcCall('delete_account').then(() => { toast('Your account was deleted'); sb.auth.signOut(); }).catch((e) => toast(friendly(e))); }
  const id = S.session.userId;
  mutate(() => { S.users = S.users.filter((x) => x.id !== id); S.notifs = S.notifs.filter((n) => n.userId !== id); S.session.userId = null; });
  ui.forms.confirmDelete = false; location.hash = '#/'; toast('Your account was deleted');
};
ACT.toggleLite = () => mutate(() => { S.lite = !S.lite; });
const privacyCard = () => '<div class="card mt16"><div class="h3">Privacy and display</div>' +
  '<div class="row between mt12"><div class="f1"><div class="sg" style="font-weight:600;font-size:14.5px">Lite mode</div><div class="note">Lighter pages for slow connections</div></div>' + toggle(S.lite, 'toggleLite') + '</div>' +
  '<div class="row mt16 wrap"><button class="btn ghost sm" data-act="exportMine">Download my data</button><button class="btn danger sm" data-act="deleteMe">Delete account</button></div></div>';
