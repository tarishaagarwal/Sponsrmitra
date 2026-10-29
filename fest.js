/* ===== Fest side: home, planner, find, company, intro, pitch ===== */
const ro = () => (canEdit() ? '' : '<div class="banner amber"><div>' + ico('alert', 18, 'currentColor', 2) + '</div><div class="note">You have view-only access as convenor. Ask the sponsorship lead to make changes.</div></div>');
const unverifiedBanner = (f) => (f.status === 'verified' ? '' : '<div class="banner amber"><div>' + ico('clock', 18, 'currentColor', 2) + '</div><div class="note"><b class="sg">Waiting for verification.</b> You can browse everything. Requests unlock once the verification desk confirms your fest.</div></div>');

function nextActions(f) {
  const out = [], ps = festPipeline(f.id), now = Date.now();
  ps.filter((p) => !['committed', 'declined'].includes(p.stage) && p.followUp && p.followUp <= now + DAY / 2).forEach((p) => {
    out.push({ cls: 'bk', icon: 'clock', title: 'Follow up with ' + C(p.companyId).name, sub: (p.followUp <= now ? 'Due today' : 'Due ' + inText(p.followUp)) + ', last touch ' + agoText(p.lastTouch), href: '#/pipe/' + p.id });
  });
  S.intros.filter((i) => i.festId === f.id && i.status === 'accepted').forEach((i) => {
    const p = stageOfFest(f.id, i.companyId);
    if (p && p.stage === 'intro' && !p.deckSent) out.push({ cls: 'tl', icon: 'check', title: C(i.companyId).name + ' intro accepted', sub: 'Send your deck to ' + C(i.companyId).contact.name, href: '#/pipe/' + p.id });
  });
  if (!proofComplete(f)) out.push({ cls: 'am', icon: 'alert', title: 'Proof pack is incomplete', sub: 'Add footfall photos before your next pitch', href: '#/proof' });
  ps.filter((p) => p.stage === 'committed').forEach((p) => {
    p.payments.filter((x) => !x.paid && x.due - now < 30 * DAY).forEach((x) => out.push({ cls: 'am', icon: 'clock', title: 'Payment due from ' + C(p.companyId).name, sub: money(x.amount) + ' ' + inText(x.due), href: '#/deal/' + p.id }));
    p.deliverables.filter((d) => !d.done && d.due && d.due - now < 14 * DAY).forEach((d) => out.push({ cls: 'am', icon: 'alert', title: d.text + ' for ' + C(p.companyId).name, sub: 'Due ' + inText(d.due), href: '#/deal/' + p.id }));
  });
  return out.slice(0, 4);
}

V.home = () => {
  const f = myFest(), u = me(), t = totals(f.id), tg = f.target || 0;
  const pct = (v) => (tg ? Math.max(0, Math.min(100, v / tg * 100)) : 0);
  const c1 = pct(t.confirmed), c2 = Math.min(pct(t.likely), 100 - c1), c3 = Math.min(pct(t.hoped), 100 - c1 - c2);
  const days = Math.max(0, Math.ceil((f.start - Date.now()) / DAY));
  const acts = nextActions(f);
  const stageCounts = STAGES.map((s) => [s[1], festPipeline(f.id).filter((p) => p.stage === s[0]).length]).filter((x) => x[1]);
  const owners = festUsers(f.id).map((m) => { const mine = festPipeline(f.id).filter((p) => p.owner === m.id); return { m, n: mine.filter((p) => !['committed', 'declined'].includes(p.stage)).length, v: mine.filter((p) => p.stage === 'committed').reduce((a, p) => a + p.amount, 0) }; });
  const leg = (c, l, v) => '<div><div class="row g6"><span class="dot" style="background:' + c + '"></span><span class="cap">' + l + '</span></div><div class="sg" style="font-weight:700;font-size:16px;margin-top:2px">' + money(v) + '</div></div>';
  return page('<div class="pad">' +
    '<div class="row between top mt12"><div class="f1"><div class="cap">' + esc(f.college) + ', ' + esc(f.city) + '</div><div class="h1 mt4">' + esc(f.name) + '</div></div>' + avatar(u.initials, 'lg') + '</div>' +
    '<div class="cap mt8">Starts ' + fmtDateY(f.start) + ', ' + days + ' days to go</div>' + unverifiedBanner(f) + ro() +
    '<div class="card mt20" style="padding:18px 18px 16px"><div class="tape"></div><div class="cap">Sponsorship target</div>' +
    (tg ? '<div class="big mt4">' + money(tg) + '</div><div class="bar mt12"><i style="width:' + c1 + '%;background:var(--teal)"></i><i style="width:' + c2 + '%;background:var(--mari)"></i><i style="width:' + c3 + '%;background:var(--hold)"></i></div>' +
      '<div class="row between mt12">' + leg('var(--teal)', 'Confirmed', t.confirmed) + leg('var(--mari)', 'Likely', t.likely) + leg('var(--hold)', 'Hoped for', t.hoped) + '</div>'
      : '<div class="note mt8">You have not set a target yet. See what comparable fests raised and pick a realistic number.</div><a class="btn primary mt12" href="#/planner">Set your target</a>') +
    '</div>' +
    '<div class="sec"><div class="h2" style="font-size:18px">Next actions</div><a class="cap" style="color:var(--teal);font-weight:600" href="#/pipeline">See pipeline</a></div>' +
    (acts.length ? '<div class="card" style="padding:16px">' + acts.map((a) => '<a class="lr" href="' + a.href + '"><div class="avatar ' + a.cls + '" style="border:none">' + ico(a.icon, 18, 'currentColor', 2) + '</div><div class="t"><b>' + esc(a.title) + '</b><span>' + esc(a.sub) + '</span></div>' + ico('chev', 18, 'currentColor', 2) + '</a>').join('') + '</div>'
      : '<div class="card">' + empty('All caught up', 'Nothing needs you today. Find more sponsors to keep momentum.') + '</div>') +
    '<a class="btn primary mt16" href="#/find">Find sponsors</a>' +
    '<div class="sec"><div class="h2" style="font-size:18px">Team</div></div><div class="card">' +
    (stageCounts.length ? '<div class="row wrap g6">' + stageCounts.map((x) => pill(x[0] + ' ' + x[1], 'ink')).join('') + '</div>' : '<div class="note">No conversations yet.</div>') +
    '<div class="mt12">' + owners.map((o) => '<div class="lr" style="padding:10px 0">' + avatar(o.m.initials, 'sm') + '<div class="t"><b>' + esc(o.m.name) + '</b><span>' + esc(o.m.festRole) + ', ' + o.n + ' active</span></div><b class="sg" style="font-size:14px">' + money(o.v) + '</b></div>').join('') + '</div></div>' +
    '<div class="row mt16"><a class="btn ghost sm f1" href="#/planner">Target planner</a><a class="btn ghost sm f1" href="#/shortlists">Shortlists</a></div></div>', { tab: 'home' });
};

/* ---------- target planner ---------- */
V.planner = () => {
  const f = myFest();
  if (!ui.forms.pl) ui.forms.pl = { type: f.type, size: sizeOf(f), target: String(f.target || '') };
  const pl = ui.forms.pl, tb = totalBench(pl.type, pl.size), tgt = +pl.target || 0;
  const lo = tb.lo * 100000, hi = tb.hi * 100000, enough = tb.n >= MIN_SAMPLE;
  const max = Math.max(hi * 1.25, tgt * 1.1, 1);
  const status = !tgt ? '' : tgt < lo ? pill('Below range', 'amber') : tgt > hi ? pill('Above range', 'brick') : pill('Within range', 'teal');
  const sb = SIZE_BANDS.find((s) => s.k === pl.size);
  const catRows = CATS.map((c) => {
    const b = bench(pl.type, pl.size, c.k);
    if (b.n < MIN_SAMPLE) return '<div class="mt12"><div class="row between"><span class="sg" style="font-weight:600;font-size:14px">' + c.label + '</span><span class="cap">Not enough data yet (' + b.n + ' fests)</span></div><div class="rbar mt8"></div></div>';
    const mx = 5 * Math.max(1, festScale(pl.type, pl.size));
    return '<div class="mt12"><div class="row between"><span class="sg" style="font-weight:600;font-size:14px">' + c.label + '</span><span class="cap" style="color:var(--ink)">' + lk(b.lo) + ' to ' + lk(b.hi) + '</span></div><div class="rbar mt8"><i style="left:' + b.lo / mx * 100 + '%;width:' + (b.hi - b.lo) / mx * 100 + '%"></i></div></div>';
  }).join('');
  return page(appbar('Target planner', { back: '#/home' }) + '<div class="pad">' +
    '<div class="row g8 mt4"><div class="f1">' + sel('pl.type', FEST_TYPES, { rerender: true }) + '</div><div class="f1">' + sel('pl.size', SIZE_BANDS.map((s) => [s.k, s.label + ' visitors']), { rerender: true }) + '</div></div>' +
    '<div class="card mt16"><div class="cap">Comparable fests raised in total</div>' +
    (enough ? '<div class="big mt4">' + lk(tb.lo) + ' to ' + lk(tb.hi) + '</div><div class="note mt8">Based on ' + tb.n + ' fests of similar size and type. Ranges only, never one fest’s private figure.</div>' : '<div class="big sm mt4">Not enough data yet</div><div class="note mt8">Only ' + tb.n + ' comparable fests so far. We show a range once at least ' + MIN_SAMPLE + ' have shared theirs.</div>') + '</div>' +
    (f.contributed ? '<div class="card mt16"><div class="cap">By sponsor type, cash and in-kind value</div>' + catRows + '</div>'
      : '<div class="card mt16"><div class="h3">Unlock the breakdown by sponsor type</div><p class="note mt8">Share what your fest raised last year, by sponsor type, and see how much each kind of sponsor typically gives. Only ranges are ever shown to others.</p><button class="btn primary mt12" data-act="openContrib">Add my numbers</button></div>') +
    '<div class="card mt16"><div class="row between"><div><div class="cap">Your target</div></div>' + status + '</div>' +
    '<div class="mt8">' + inp('pl.target', { type: 'number', ph: 'e.g. 1200000', rerender: true, min: 0 }) + '</div>' +
    (enough && tgt ? '<div class="rbar mt20"><i style="left:' + lo / max * 100 + '%;width:' + (hi - lo) / max * 100 + '%"></i><span class="mk" style="left:' + Math.min(99, tgt / max * 100) + '%;background:var(--mari);width:5px"></span></div><div class="note mt12">' + (tgt < lo ? 'Below what similar fests raised. You may be able to aim higher.' : tgt > hi ? 'Above what similar fests raised. Plan for a stronger title sponsor.' : 'In the ' + (tgt > (lo + hi) / 2 ? 'upper' : 'lower') + ' half of what similar fests raised.') + '</div>' : '') + '</div>' +
    '<button class="btn primary mt16 ' + (canEdit() ? '' : 'off') + '" data-act="saveTarget">Save target</button>' + ro() + '</div>', { tab: 'home', nav: false, sticky: '' });
};
ACT.saveTarget = () => { const f = myFest(); const v = +ui.forms.pl.target; if (!(v > 0)) return toast('Enter a target in rupees'); mutate(() => { f.target = v; }); toast('Target saved'); go('#/home'); };
ACT.openContrib = () => { ui.forms.ct = { cat: 'tech', amount: '' }; openSheet('contrib'); };
SHEETS.contrib = () => {
  const f = myFest();
  return '<div class="h2">Add last year’s numbers</div><p class="note mt8">Add one line for each sponsor type that gave your fest money or in-kind value.</p>' +
    ((f.contribs || []).length ? '<div class="card mt12">' + f.contribs.map((c) => '<div class="kv"><span>' + esc(CAT_LABEL[c.cat]) + '</span><b>' + money(c.amount) + '</b></div>').join('') + '</div>' : '') +
    fld('Sponsor type', sel('ct.cat', CATS.map((c) => [c.k, c.label]))) + fld('Amount in rupees', inp('ct.amount', { type: 'number', min: 0 })) +
    '<button class="btn ghost mt16" data-act="addContrib">Add this line</button><button class="btn primary mt12 ' + ((f.contribs || []).length || f.contributed ? '' : 'off') + '" data-act="doneContrib">Unlock the breakdown</button>';
};
ACT.addContrib = () => { const f = myFest(), c = ui.forms.ct; if (!(+c.amount > 0)) return toast('Enter an amount'); mutate(() => { f.contribs = (f.contribs || []).concat([{ cat: c.cat, amount: +c.amount }]); }); ui.forms.ct.amount = ''; render(); toast('Added'); };
ACT.doneContrib = () => { const f = myFest(); mutate(() => { f.contributed = true; ui.sheet = null; }); toast('Breakdown unlocked'); };

/* ---------- find sponsors ---------- */
const FDEF = { cat: 'all', cash: false, inkind: false, near: false, alumni: false, fresh: false, like: false, band: 'any' };
const getFilters = (f) => Object.assign({}, FDEF, (S.prefs[f.id] && S.prefs[f.id].filters) || {});
const setFilters = (f, patch) => { S.prefs[f.id] = S.prefs[f.id] || {}; S.prefs[f.id].filters = Object.assign(getFilters(f), patch); save(); render(); };
const inAnyList = (f, cid) => S.shortlists.some((s) => s.festId === f.id && s.companyIds.includes(cid));
function matchFilters(c, f, fl, q) {
  if (c.status !== 'verified') return false;
  if (q && !(c.name + ' ' + c.sub + ' ' + CAT_LABEL[c.cat] + ' ' + c.city).toLowerCase().includes(q.toLowerCase())) return false;
  if (fl.cat !== 'all' && c.cat !== fl.cat) return false;
  if (fl.cash && !c.tags.includes('Cash')) return false;
  if (fl.inkind && !c.tags.includes('In-kind')) return false;
  if (fl.near && c.city !== f.city) return false;
  if (fl.alumni && !alumniAt(c.id, f.college).length) return false;
  if (fl.fresh && freshness(c).key !== 'ok') return false;
  if (fl.like && !c.past.includes(f.type)) return false;
  if (fl.band !== 'any' && c.band !== fl.band) return false;
  return true;
}
function recScore(c, f) {
  let s = 0; if (c.past.includes(f.type)) s += 3; if (c.city === f.city) s += 2; s += alumniAt(c.id, f.college).length; const fr = freshness(c).key; if (fr === 'ok') s += 2; if (fr === 'bad') s -= 3;
  return s;
}
function coCard(c, f) {
  const al = alumniAt(c.id, f.college).length, p = stageOfFest(f.id, c.id);
  return '<a class="card row top mt12" style="padding:14px" href="#/company/' + c.id + '">' + logo(c) +
    '<div class="f1"><div class="sg" style="font-weight:700;font-size:16.5px">' + esc(c.name) + '</div><div class="note">' + esc(c.sub) + '</div>' +
    '<div class="row g6 wrap mt8">' + c.tags.slice(0, 4).map(tag).join('') + (p ? pill('In pipeline', 'mari') : '') + '</div>' +
    '<div class="row g8 mt8">' + vbadge(c) + '<span class="cap">' + ageText(c) + '</span></div></div>' +
    '<div style="text-align:center;min-width:48px"><div class="sg" style="font-weight:700;font-size:20px">' + al + '</div><div class="cap" style="font-size:11px">' + (al === 1 ? 'alumnus' : 'alumni') + '</div>' +
    '<button class="iconbtn mt8" style="width:34px;height:34px;margin:8px auto 0" data-act="slOpen" data-id="' + c.id + '" aria-label="Save to a shortlist">' + ico('bookmark', 16, inAnyList(f, c.id) ? 'var(--mari)' : 'currentColor', 2) + '</button></div></a>';
}
V.find = () => {
  const f = myFest(), fl = getFilters(f), q = fv('fq') || '';
  const plain = !q && fl.cat === 'all' && !fl.cash && !fl.inkind && !fl.near && !fl.alumni && !fl.fresh && !fl.like && fl.band === 'any';
  const rec = plain ? S.companies.filter((c) => c.status === 'verified' && freshness(c).key === 'ok' && !stageOfFest(f.id, c.id) && recScore(c, f) >= 5).sort((a, b) => recScore(b, f) - recScore(a, f)).slice(0, 3) : [];
  const list = S.companies.filter((c) => matchFilters(c, f, fl, q) && !rec.includes(c)).sort((a, b) => (freshness(a).key === 'bad') - (freshness(b).key === 'bad') || recScore(b, f) - recScore(a, f));
  const tog = (k, l) => '<button class="chip ' + (fl[k] ? 'on' : '') + '" data-act="togF" data-k="' + k + '" aria-pressed="' + fl[k] + '">' + l + '</button>';
  const cats = [['all', 'All']].concat(CATS.filter((c) => !c.tier).map((c) => [c.k, c.label.split(' and ')[0]]));
  return page('<div class="pad"><div class="row between mt12"><div class="h1">Find sponsors</div><a class="iconbtn" href="#/shortlists" aria-label="Shortlists">' + ico('bookmark', 20) + '</a></div>' +
    '<div class="search mt16">' + ico('search', 20, 'currentColor', 2) + '<input data-bind="fq" data-keep="fq" data-live type="search" placeholder="Search verified companies" value="' + esc(q) + '" aria-label="Search companies"></div>' +
    '<div class="mt12">' + chipRow(cats, fl.cat, 'setCat') + '</div>' +
    '<div class="chips mt8">' + tog('cash', 'Cash') + tog('inkind', 'In-kind') + tog('near', 'In ' + esc(f.city)) + tog('alumni', 'Alumni here') + tog('fresh', 'Fresh contacts') + tog('like', 'Fests like yours') + '<button class="chip" data-act="openFilters">More filters</button></div>' +
    unverifiedBanner(f) +
    (rec.length ? '<div class="sec" style="margin-bottom:0"><div class="h3">Recommended for ' + esc(f.name) + '</div></div>' + rec.map((c) => coCard(c, f)).join('') : '') +
    '<div class="cap mt16">' + plural(list.length + rec.length, 'company matches', 'companies match') + '. Contacts are re-checked every 90 days.</div>' +
    (list.length ? list.map((c) => coCard(c, f)).join('') : empty('No matches', 'Try removing a filter.', '<button class="btn ghost sm" data-act="clearF">Clear filters</button>')) + '</div>', { tab: 'find' });
};
ACT.setCat = (el) => setFilters(myFest(), { cat: el.dataset.v });
ACT.togF = (el) => { const f = myFest(), k = el.dataset.k; setFilters(f, { [k]: !getFilters(f)[k] }); };
ACT.clearF = () => { ui.forms.fq = ''; setFilters(myFest(), FDEF); };
ACT.openFilters = () => openSheet('filters');
SHEETS.filters = () => {
  const f = myFest(), fl = getFilters(f);
  return '<div class="h2">More filters</div><div class="cap mt16">Typical budget band</div><div class="row wrap g8 mt8">' + [['any', 'Any'], ['Under 1L', 'Under ₹1L'], ['1L to 3L', '₹1L to ₹3L'], ['3L+', '₹3L and above']].map((b) => '<button class="chip ' + (fl.band === b[0] ? 'on' : '') + '" data-act="setBand" data-v="' + b[0] + '">' + b[1] + '</button>').join('') + '</div>' +
    '<p class="note mt16">Your filters are saved for ' + esc(f.name) + ', so your team sees the same view.</p><div class="row mt16"><button class="btn ghost" data-act="clearF">Clear all</button><button class="btn primary" data-act="closeSheet">Done</button></div>';
};
ACT.setBand = (el) => setFilters(myFest(), { band: el.dataset.v });

/* shortlists */
ACT.slOpen = (el) => { ui.forms.sl = { cid: el.dataset.id, name: '' }; openSheet('shortlist'); };
SHEETS.shortlist = () => {
  const f = myFest(), cid = ui.forms.sl.cid, c = C(cid);
  const lists = S.shortlists.filter((s) => s.festId === f.id);
  return '<div class="h2">Save ' + esc(c.name) + '</div>' +
    (lists.length ? '<div class="card mt12" style="padding:6px 16px">' + lists.map((s) => '<div class="lr" data-act="slToggle" data-l="' + s.id + '"><div class="t"><b>' + esc(s.name) + '</b><span>' + plural(s.companyIds.length, 'company', 'companies') + '</span></div><div class="ck ' + (s.companyIds.includes(cid) ? 'done' : '') + '">' + (s.companyIds.includes(cid) ? ico('check', 14, '#FFFCF4', 3.2) : '') + '</div></div>').join('') + '</div>' : '') +
    fld('Or start a new list', inp('sl.name', { ph: 'Beverage brands' })) + '<button class="btn primary mt16 ' + (canEdit() ? '' : 'off') + '" data-act="slNew">Create list and save</button><button class="btn ghost mt12" data-act="closeSheet">Done</button>';
};
ACT.slToggle = (el) => { if (!canEdit()) return toast('View-only access'); const s = byId(S.shortlists, el.dataset.l), cid = ui.forms.sl.cid; mutate(() => { s.companyIds = s.companyIds.includes(cid) ? s.companyIds.filter((x) => x !== cid) : s.companyIds.concat([cid]); }); };
ACT.slNew = () => { const f = myFest(), n = (ui.forms.sl.name || '').trim(); if (!n) return toast('Name the list first'); mutate(() => { S.shortlists.push({ id: uid('sl'), festId: f.id, name: n, companyIds: [ui.forms.sl.cid] }); ui.forms.sl.name = ''; }); toast('Saved to ' + n); };
V.shortlists = () => {
  const f = myFest(), lists = S.shortlists.filter((s) => s.festId === f.id);
  return page(appbar('Shortlists', { back: '#/find' }) + '<div class="pad">' + ro() +
    (lists.length ? lists.map((s) => '<div class="card mt12"><div class="row between"><div class="h3">' + esc(s.name) + '</div><button class="btn ghost sm ' + (canEdit() ? '' : 'off') + '" data-act="slAddAll" data-l="' + s.id + '">Add all to pipeline</button></div>' +
      (s.companyIds.length ? '<div class="mt12">' + s.companyIds.map((id) => { const c = C(id); return '<div class="lr" style="padding:10px 0"><a class="row f1" href="#/company/' + id + '">' + logo(c, 'sm') + '<div class="t"><b>' + esc(c.name) + '</b><span>' + ageText(c) + '</span></div></a><button class="iconbtn" style="width:34px;height:34px" data-act="slRemove" data-l="' + s.id + '" data-id="' + id + '" aria-label="Remove ' + esc(c.name) + '">' + ico('x', 14, 'currentColor', 2.4) + '</button></div>'; }).join('') + '</div>' : '<div class="note mt8">Empty. Use the bookmark on a company to add it.</div>') + '</div>').join('') : '<div class="card mt12">' + empty('No shortlists yet', 'Save companies as you browse so your team can pick them up.') + '</div>') + '</div>', { tab: 'find', hdr: false });
};
ACT.slRemove = (el) => { const s = byId(S.shortlists, el.dataset.l); mutate(() => { s.companyIds = s.companyIds.filter((x) => x !== el.dataset.id); }); };
ACT.slAddAll = (el) => { const f = myFest(), s = byId(S.shortlists, el.dataset.l); let n = 0; mutate(() => { s.companyIds.forEach((cid) => { if (!stageOfFest(f.id, cid)) { addToPipeline(f, cid, 'shortlisted'); n++; } }); }); toast(n ? n + ' added to your pipeline' : 'Everything is already in your pipeline'); };
function addToPipeline(f, cid, stage, ask) {
  const p = { id: uid('p'), festId: f.id, companyId: cid, stage: stage || 'shortlisted', owner: S.session.userId, ask: ask || 0, amount: 0, followUp: null, meetingAt: null, lastTouch: Date.now(), createdAt: Date.now(), notes: [], activity: [{ id: uid('ac'), ts: Date.now(), by: S.session.userId, text: 'Added to pipeline' }], decline: null, deckSent: false, payments: [], deliverables: [], proof: [], committedOn: null, kind: 'cash' };
  S.pipeline.push(p); return p;
}
const logAct = (p, text) => { p.activity.unshift({ id: uid('ac'), ts: Date.now(), by: S.session.userId, text }); p.lastTouch = Date.now(); };

/* ---------- company page ---------- */
V.company = (id) => {
  const f = myFest(), c = C(id);
  if (!c) return page(appbar('Company', { back: '#/find' }) + empty('Company not found', 'It may have been removed.'), { tab: 'find' });
  const p = stageOfFest(f.id, id), al = alumniAt(id, f.college), fr = freshness(c);
  const rg = askRange(c, f), sug = suggestedAsk(c, f), sc = festScale(f.type, sizeOf(f));
  const mx = 5 * Math.max(1, sc) * 100000;
  const dup = p && p.owner !== S.session.userId && p.stage !== 'shortlisted';
  const reveal = p && p.stage !== 'shortlisted';
  const hist = S.archive.filter((a) => a.festId === f.id).flatMap((a) => a.items.filter((i) => i.companyId === id).map((i) => Object.assign({ year: a.year }, i)));
  const enough = c.bench.n >= MIN_SAMPLE;
  const sticky = '<div class="sticky">' + (al.length ? '<a class="btn primary" href="#/intro/' + id + '">Request warm intro</a>' : '<button class="btn primary" data-act="openPitch" data-id="' + id + '">Send pitch request</button>') +
    (p ? '<a class="btn ghost" href="#/pipe/' + p.id + '">Open in pipeline</a>' : '<button class="btn ghost ' + (canEdit() ? '' : 'off') + '" data-act="addPipe" data-id="' + id + '">Add to pipeline</button>') + '</div>';
  return page(appbar('Company', { back: '#/find', right: '<button class="iconbtn" data-act="slOpen" data-id="' + id + '" aria-label="Save to a shortlist">' + ico('bookmark', 19, inAnyList(f, id) ? 'var(--mari)' : 'currentColor', 2) + '</button>' }) + '<div class="pad">' +
    '<div class="card row mt4" style="gap:14px">' + logo(c, 'lg') + '<div class="f1"><div class="h2">' + esc(c.name) + '</div><div class="note mt4">' + esc(c.sub) + ', ' + esc(c.city) + '</div><div class="row g8 mt8">' + vbadge(c) + '<span class="cap">' + ageText(c) + '</span></div></div></div>' +
    '<div class="row g6 wrap mt12">' + c.tags.map(tag).join('') + '</div>' + unverifiedBanner(f) +
    (dup ? '<div class="banner amber"><div>' + ico('alert', 18, 'currentColor', 2) + '</div><div class="note"><b class="sg">Check before you write.</b> ' + esc(U(p.owner).name) + ' is already in touch (' + STAGE_LABEL[p.stage].toLowerCase() + ', last touch ' + agoText(p.lastTouch) + '). Talk to them first.</div></div>' : '') +
    (fr.key === 'bad' ? '<div class="banner brick"><div>' + ico('alert', 18, 'currentColor', 2) + '</div><div class="note">This contact has not been re-checked for over 90 days. Replies may bounce.</div></div>' : '') +
    '<div class="card mt16"><div class="cap">What similar fests received</div>' + (enough ? '<div class="big sm mt4">' + lk(rg.lo / 100000) + ' to ' + lk(rg.hi / 100000) + ' cash</div><div class="rbar mt20"><i style="left:' + rg.lo / mx * 100 + '%;width:' + (rg.hi - rg.lo) / mx * 100 + '%"></i><span class="mk" style="left:' + sug / mx * 100 + '%"></span></div>' +
      '<div class="row between mt8"><span class="cap">₹0</span><span class="cap" style="color:var(--ink);font-weight:700">Your suggested ask ' + money(sug) + '</span><span class="cap">' + lk(5 * Math.max(1, sc)) + '</span></div><div class="note mt8">From ' + c.bench.n + ' fests of a similar size and type.</div>' : '<div class="big sm mt4">Not enough data yet</div><div class="note mt8">Only ' + c.bench.n + ' comparable fests so far.</div>') + '</div>' +
    '<div class="card mt16"><div class="cap">Contact</div><div class="row mt12">' + avatar(initials(c.contact.name)) + '<div><div class="sg" style="font-weight:600;font-size:15px">' + esc(c.contact.name) + '</div><div class="note">' + esc(c.contact.role) + '</div></div></div>' +
    '<div class="note mt12">Prefers ' + esc(c.contact.channel.toLowerCase()) + ' and usually replies in about ' + c.contact.replyDays + ' days. ' + (reveal ? '<b class="sg" style="color:var(--ink)">' + esc(c.contact.email) + '</b>' : 'The address shows once you send a request.') + '</div></div>' +
    '<div class="card mt16"><div class="cap">' + (al.length ? plural(al.length, 'alumnus', 'alumni') + ' from ' + esc(f.college) + ' work here' : 'No alumni from ' + esc(f.college) + ' here yet') + '</div>' +
    (al.length ? '<div class="row mt12"><div class="stack">' + al.slice(0, 4).map((a, i) => avatar(a.initials, ['tl', '', 'bk', 'am'][i % 4])).join('') + '</div><div class="note f1">' + esc(al[0].name) + ', class of ' + al[0].cohort + ', ' + esc(al[0].role) + '. ' + (al[0].helps === 'introduce' ? 'Accepts intros.' : 'Advises only.') + '</div></div>' : '<div class="note mt8">You can still send a direct pitch request.</div>') + '</div>' +
    (hist.length ? '<div class="card mt16"><div class="cap">Your history with ' + esc(c.name) + '</div>' + hist.map((h) => '<div class="kv"><span>' + h.year + ': ' + esc(h.outcome) + '. ' + esc(h.note) + '</span><b>' + (h.amount ? money(h.amount) : '') + '</b></div>').join('') + '</div>' : '') +
    '<div class="row mt16 wrap">' + (al.length ? '<button class="btn ghost sm" data-act="openPitch" data-id="' + id + '">Send a direct pitch request</button>' : '') + '<button class="btn ghost sm" data-act="openReport" data-t="company" data-id="' + id + '">Report wrong details</button></div></div>', { tab: 'find', sticky, hdr: false });
};
ACT.addPipe = (el) => { const f = myFest(); mutate(() => { addToPipeline(f, el.dataset.id, 'shortlisted'); }); toast('Added to your pipeline'); };

/* ---------- warm intro ---------- */
function introMessage(a, c, f, u) {
  return 'Hi ' + a.name.split(' ')[0] + ', I’m ' + u.name.split(' ')[0] + ', sponsorship lead for ' + f.name + ' at ' + f.college + '. We expect about ' + f.visitors.toLocaleString('en-IN') + ' visitors and are looking for a ' + (c.cat === 'tech' ? 'technology' : 'sponsorship') + ' partner. Could you introduce us to ' + c.contact.name + ' (' + c.contact.role + ') at ' + c.name + '? Our deck is attached.';
}
function initIntro(cid) {
  const f = myFest(), c = C(cid), u = me(), al = alumniAt(cid, f.college).filter((a) => a.helps === 'introduce');
  const pick = al.find((a) => introsUsed(a.id) < a.cap) || al[0];
  const tpl = pick ? introMessage(pick, c, f, u) : '';
  ui.forms.intro = { cid, aid: pick ? pick.id : '', ask: String(stageOfFest(f.id, cid) && stageOfFest(f.id, cid).ask || suggestedAsk(c, f)), message: tpl, tpl, confirm: false };
}
function checks(f, c, ask, p) {
  const rg = askRange(c, f), a = +ask || 0;
  return [
    { ok: freshness(c).days <= 90 && c.status === 'verified', text: 'Contact verified ' + ageText(c), fix: '' },
    c.bench.n < MIN_SAMPLE ? { ok: true, text: 'No benchmark for this company yet. Ask what feels fair.', fix: '' } : { ok: a >= rg.lo && a <= rg.hi, text: a >= rg.lo && a <= rg.hi ? 'Ask is within the benchmark range' : 'Ask is outside ' + lk(rg.lo / 100000) + ' to ' + lk(rg.hi / 100000), fix: '' },
    { ok: proofComplete(f), text: proofComplete(f) ? 'Proof pack attached' : 'Proof pack is incomplete', fix: '<a class="cap" style="color:var(--teal);font-weight:700" href="#/proof">Fix</a>' },
    { ok: !(p && p.owner !== S.session.userId && p.stage !== 'shortlisted'), text: p && p.owner !== S.session.userId && p.stage !== 'shortlisted' ? esc(U(p.owner).name) + ' is already in touch' : 'No teammate has approached ' + esc(c.name), fix: '' },
  ];
}
V.intro = (cid) => {
  const f = myFest(), c = C(cid);
  if (!c) return page(appbar('Request an introduction', { back: '#/find' }) + empty('Company not found', ''), { nav: false });
  if (!ui.forms.intro || ui.forms.intro.cid !== cid) initIntro(cid);
  const it = ui.forms.intro, al = alumniAt(cid, f.college).filter((a) => a.helps === 'introduce'), a = A(it.aid), p = stageOfFest(f.id, cid);
  const ck = checks(f, c, it.ask, p), warn = ck.some((x) => !x.ok);
  const full = a && introsUsed(a.id) >= a.cap;
  const blocked = f.status !== 'verified' || !canEdit() || !a || full;
  const sticky = '<div class="sticky"><button class="btn primary ' + (blocked ? 'off' : '') + '" data-act="sendIntro">' + (warn && it.confirm ? 'Send anyway' : 'Send request') + '</button></div>';
  return page(appbar('Request an introduction', { back: '#/company/' + cid }) + '<div class="pad">' +
    (al.length ? '<div class="cap mt4">Who should introduce you at ' + esc(c.name) + '</div>' + al.map((x) => { const used = introsUsed(x.id), isFull = used >= x.cap; return '<div class="card row mt8" style="padding:12px;cursor:pointer;' + (x.id === it.aid ? 'border-color:var(--mari);border-width:2px' : '') + '" data-act="pickAlum" data-id="' + x.id + '">' + avatar(x.initials, 'tl') + '<div class="f1"><div class="sg" style="font-weight:600;font-size:15px">' + esc(x.name) + ', class of ' + x.cohort + '</div><div class="note">' + esc(x.role) + '. ' + (isFull ? 'Not taking more requests this month.' : 'Accepts ' + x.cap + ' a month, ' + used + ' used.') + '</div></div>' + (x.id === it.aid ? ico('check', 20, 'var(--teal)', 3) : '') + '</div>'; }).join('')
      : '<div class="card mt4">' + empty('No alumni to ask here', 'Send a direct pitch request instead.', '<button class="btn primary sm" data-act="openPitch" data-id="' + cid + '">Send pitch request</button>') + '</div>') +
    (a ? '<div class="card mt16"><div class="cap">Your message, edit if you like</div><div class="mt8">' + txt('intro.message', { rows: 7 }) + '</div><div class="row g8 mt12 wrap"><span class="chip row g6" style="padding:6px 10px">' + ico('file', 15, 'currentColor', 2) + ' ' + esc(f.name.split(' ')[0]) + '-deck.pdf</span><span class="chip row g6" style="padding:6px 10px">' + ico('file', 15, 'currentColor', 2) + ' Proof pack</span></div></div>' +
      '<div class="card mt16"><div class="cap">Your ask</div><div class="mt8">' + inp('intro.ask', { type: 'number', rerender: true, min: 0 }) + '</div></div>' +
      '<div class="card mt16"><div class="cap" style="margin-bottom:6px">Before you send</div>' + ck.map((x) => '<div class="row" style="gap:10px;padding:6px 0"><div class="ck ' + (x.ok ? 'done' : 'warn') + '" style="cursor:default">' + (x.ok ? ico('check', 14, '#FFFCF4', 3.2) : '<span class="sg" style="font-weight:800;font-size:13px;color:var(--amber)">!</span>') + '</div><div class="note f1" style="color:var(--ink);font-size:14px">' + x.text + '</div>' + x.fix + '</div>').join('') + '</div>' +
      (f.status !== 'verified' ? '<div class="banner amber"><div class="note">Requests unlock after your fest is verified.</div></div>' : '') + (full ? '<div class="banner amber"><div class="note">' + esc(a.name) + ' has reached the monthly limit. Choose someone else or try next month.</div></div>' : '') + ro() +
      '<p class="note mt12" style="text-align:center">' + esc(a.name.split(' ')[0]) + ' can accept, decline or suggest someone else with one tap.</p><div style="height:60px"></div>' : '') + '</div>', { tab: 'find', nav: false, sticky });
};
ACT.pickAlum = (el) => { const it = ui.forms.intro, f = myFest(), c = C(it.cid), u = me(); const a = A(el.dataset.id); const was = it.message === it.tpl; it.aid = a.id; it.tpl = introMessage(a, c, f, u); if (was) it.message = it.tpl; render(); };
ACT.sendIntro = () => {
  const f = myFest(), it = ui.forms.intro, c = C(it.cid), a = A(it.aid), u = me(), p = stageOfFest(f.id, c.id);
  if (!it.message.trim()) return toast('Write a short message first');
  const ck = checks(f, c, it.ask, p);
  if (ck.some((x) => !x.ok) && !it.confirm) { it.confirm = true; render(); return toast('Some checks need attention. Tap again to send anyway.'); }
  if (SERVER) return serverDo('send_intro', { p: { companyId: c.id, alumnusId: a.id, ask: +it.ask || 0, message: it.message.trim() } }, 'Request sent to ' + a.name.split(' ')[0], () => { ui.forms.intro = null; go('#/pipeline'); });
  mutate(() => {
    const ask = +it.ask || 0;
    const iid = uid('i');
    S.intros.push({ id: iid, festId: f.id, companyId: c.id, alumnusId: a.id, by: u.id, ask, message: it.message.trim(), status: 'sent', createdAt: Date.now(), respondedAt: null });
    const item = p || addToPipeline(f, c.id, 'intro', ask);
    item.stage = 'intro'; item.ask = ask; logAct(item, 'Asked ' + a.name + ' for an introduction');
    notify([a.userId], u.name + ' asked you to introduce ' + f.name + ' to ' + c.name, '#/a/inbox');
  });
  ui.forms.intro = null; toast('Request sent to ' + a.name.split(' ')[0]); go('#/pipeline');
};

/* ---------- pitch request to a brand ---------- */
ACT.openPitch = (el) => {
  const f = myFest(), c = C(el.dataset.id), u = me();
  ui.forms.pitch = { cid: c.id, ask: String(suggestedAsk(c, f)), message: 'Hello ' + c.contact.name.split(' ')[0] + ', I’m ' + u.name.split(' ')[0] + ' from ' + f.name + ' at ' + f.college + '. We expect about ' + f.visitors.toLocaleString('en-IN') + ' visitors (' + f.audience.toLowerCase() + '). We’d love to partner with ' + c.name + '. Our deck and proof pack are attached.' };
  openSheet('pitch');
};
SHEETS.pitch = () => {
  const f = myFest(), c = C(ui.forms.pitch.cid), ck = checks(f, c, ui.forms.pitch.ask, stageOfFest(f.id, c.id));
  return '<div class="h2">Pitch request to ' + esc(c.name) + '</div><p class="note mt8">Goes to ' + esc(c.contact.name) + '’s inbox in a standard format with your proof pack.</p>' +
    fld('Your ask in rupees', inp('pitch.ask', { type: 'number', min: 0, rerender: true })) + fld('Message', txt('pitch.message', { rows: 6 })) +
    '<div class="card flat mt12">' + ck.map((x) => '<div class="row" style="gap:10px;padding:5px 0"><div class="ck ' + (x.ok ? 'done' : 'warn') + '" style="cursor:default;width:20px;height:20px">' + (x.ok ? ico('check', 12, '#FFFCF4', 3.2) : '<span class="sg" style="font-weight:800;font-size:11px;color:var(--amber)">!</span>') + '</div><div class="note f1" style="color:var(--ink)">' + x.text + '</div></div>').join('') + '</div>' +
    '<button class="btn primary mt16 ' + (f.status === 'verified' && canEdit() ? '' : 'off') + '" data-act="sendPitch">Send request</button>' + (f.status !== 'verified' ? '<p class="note mt8">Unlocks after your fest is verified.</p>' : '') + '<button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
};
ACT.sendPitch = () => {
  const f = myFest(), pt = ui.forms.pitch, c = C(pt.cid), u = me();
  if (SERVER) return serverDo('send_pitch', { p: { companyId: c.id, ask: +pt.ask || 0, message: pt.message.trim() } }, 'Pitch request sent to ' + c.name, () => { ui.sheet = null; render(); });
  if (c.inbound.paused) return toast(c.name + ' has paused new requests');
  const week = S.requests.filter((r) => r.companyId === c.id && r.createdAt > Date.now() - 7 * DAY).length;
  if (week >= c.inbound.weeklyCap) return toast(c.name + ' is at its weekly limit. Try again next week.');
  if (S.requests.some((r) => r.festId === f.id && r.companyId === c.id && ['new', 'question'].includes(r.status))) return toast('You already have an open request with ' + c.name);
  mutate(() => {
    const ask = +pt.ask || 0;
    S.requests.unshift({ id: uid('r'), festId: f.id, companyId: c.id, ask, message: pt.message.trim(), status: 'new', reason: '', createdAt: Date.now(), by: u.id });
    const p = stageOfFest(f.id, c.id) || addToPipeline(f, c.id, 'contacted', ask);
    if (['shortlisted', 'intro'].includes(p.stage)) p.stage = 'contacted';
    p.ask = ask; logAct(p, 'Sent a pitch request');
    notify(S.users.filter((x) => x.role === 'brand' && x.entityId === c.id).map((x) => x.id), f.name + ' sent a sponsorship request', '#/b/inbox');
    ui.sheet = null;
  });
  toast('Pitch request sent to ' + c.name);
};
