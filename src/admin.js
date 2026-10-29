/* ===== Admin console ===== */
function adminQueue() {
  const q = [];
  S.fests.filter((f) => f.status === 'pending').forEach((f) => q.push({ type: 'fest', id: f.id, title: f.name, sub: f.college + ', ' + f.city + '. ' + f.type + ', ' + f.visitors.toLocaleString('en-IN') + ' visitors', reason: 'New fest', isNew: true }));
  S.companies.filter((c) => c.status === 'pending').forEach((c) => q.push({ type: 'company', id: c.id, title: c.name, sub: c.contact.name + ', ' + c.contact.role + '. ' + c.contact.email, reason: 'New brand listing', isNew: true }));
  S.alumni.filter((a) => a.status === 'pending').forEach((a) => q.push({ type: 'alumni', id: a.id, title: a.name, sub: 'Class of ' + a.cohort + ', ' + a.college + '. ' + a.role + ' at ' + (C(a.companyId) || {}).name, reason: 'New alumnus', isNew: true }));
  S.companies.filter((c) => c.status === 'bounced').forEach((c) => q.push({ type: 'company', id: c.id, title: c.name, sub: c.contact.name + '. ' + c.contact.email, reason: 'Bounced contact', bounced: true }));
  S.companies.filter((c) => c.status === 'verified' && daysSince(c.verifiedOn) > 60).sort((a, b) => a.verifiedOn - b.verifiedOn).forEach((c) => q.push({ type: 'company', id: c.id, title: c.name, sub: c.contact.name + ', ' + c.contact.role, reason: 'Re-check due, ' + daysSince(c.verifiedOn) + ' days old', due: true }));
  return q;
}
const qKey = (x) => x.type + ':' + x.id;
V['ad/verify'] = () => {
  const q = adminQueue();
  q.forEach((x) => { const k = qKey(x).replace(':', '_'); if (!fv('vm.' + k)) setPath(ui.forms, 'vm.' + k, VERIFY_METHODS[x.type][0]); });
  return page('<div class="pad"><div class="row between mt12"><div class="h1">Verification desk</div><button class="btn ghost sm" data-act="adAddCompany">Add a company</button></div><p class="note mt8">Every fest, brand, alumnus and contact is checked by a person. Log the method and the date is stamped.</p>' +
    (q.length ? q.map((x) => { const k = qKey(x).replace(':', '_'); return '<div class="card mt12"><div class="row between top"><div class="f1"><div class="h3" style="font-size:16px">' + esc(x.title) + '</div><div class="note">' + esc(x.sub) + '</div></div>' + pill(x.reason, x.isNew ? 'mari' : x.bounced ? 'brick' : 'amber') + '</div>' +
      '<div class="cap mt12" style="margin-bottom:6px">How did you check</div>' + sel('vm.' + k, VERIFY_METHODS[x.type]) +
      (x.bounced ? fld('Corrected email', inp('ve.' + k, { type: 'email', ph: C(x.id).contact.email })) : '') +
      '<div class="row mt12"><button class="btn primary sm" data-act="adVerify" data-t="' + x.type + '" data-id="' + x.id + '">Verify</button>' + (x.isNew ? '<button class="btn danger sm" data-act="adReject" data-t="' + x.type + '" data-id="' + x.id + '">Reject</button>' : '') + '</div></div>'; }).join('') : '<div class="card mt12">' + empty('Queue is clear', 'Nothing is waiting for verification.') + '</div>') + '</div>', { tab: 'verify' });
};
const KIND_OF = { fest: 'fests', company: 'companies', alumni: 'alumni' };
const entity = (t, id) => (t === 'fest' ? F(id) : t === 'company' ? C(id) : A(id));
ACT.adVerify = (el) => {
  const t = el.dataset.t, id = el.dataset.id, e = entity(t, id), k = (t + '_' + id), method = fv('vm.' + k) || VERIFY_METHODS[t][0];
  const newEmail = (fv('ve.' + k) || '').trim();
  if (SERVER) return serverDo('verify_entity', { p: { kind: KIND_OF[t], id, method, newEmail } }, 'Verified and stamped today');
  mutate(() => {
    e.status = 'verified'; e.verifiedOn = Date.now();
    if (t === 'company' && newEmail) e.contact.email = newEmail;
    const name = t === 'alumni' ? e.name : e.name;
    logAudit('Verified ' + (t === 'company' ? 'contact for ' : t === 'fest' ? 'fest ' : 'alumnus ') + name + ' (' + method + ')');
    const targets = t === 'fest' ? festUsers(id).map((u) => u.id) : t === 'company' ? S.users.filter((u) => u.role === 'brand' && u.entityId === id).map((u) => u.id) : S.users.filter((u) => u.role === 'alumni' && u.entityId === id).map((u) => u.id);
    notify(targets, (t === 'fest' ? e.name + ' is verified. Requests are unlocked.' : t === 'company' ? e.name + ' is verified and visible to students.' : 'You are verified. Juniors can now ask you for introductions.'), t === 'fest' ? '#/home' : t === 'company' ? '#/b/dash' : '#/a/inbox');
  });
  toast('Verified and stamped today');
};
ACT.adReject = (el) => {
  const t = el.dataset.t, id = el.dataset.id, e = entity(t, id);
  if (SERVER) return serverDo('reject_entity', { p: { kind: KIND_OF[t], id } }, 'Rejected');
  mutate(() => { e.status = 'rejected'; logAudit('Rejected ' + t + ' ' + e.name); });
  toast('Rejected');
};

/* ---------- data quality ---------- */
const normName = (n) => n.toLowerCase().replace(/\b(technologies|technology|labs|inc|pvt|ltd|limited)\b/g, '').replace(/[^a-z0-9]/g, '');
function dupGroups() {
  const map = {}; S.companies.filter((c) => c.status !== 'rejected').forEach((c) => { (map[normName(c.name)] = map[normName(c.name)] || []).push(c); });
  return Object.values(map).filter((g) => g.length > 1);
}
V['ad/quality'] = () => {
  const bounced = S.companies.filter((c) => c.status === 'bounced');
  const overdue = S.companies.filter((c) => c.status === 'verified' && daysSince(c.verifiedOn) > 90);
  const dups = dupGroups();
  const missing = S.companies.filter((c) => c.status !== 'rejected' && (!c.contact.email || !c.contact.name || !c.city));
  const block = (title, items, empty_) => '<div class="card mt12"><div class="row between"><div class="h3">' + title + '</div>' + pill(String(items.length), items.length ? 'amber' : 'teal') + '</div>' + (items.length ? '<div class="mt8">' + items.join('') + '</div>' : '<div class="note mt8">' + empty_ + '</div>') + '</div>';
  return page('<div class="pad"><div class="h1 mt12">Data quality</div><p class="note mt8">Quality is monitored, not assumed. These checks run every time you open this page.</p>' +
    block('Bounced contacts', bounced.map((c) => '<div class="lr" style="padding:10px 0">' + logo(c, 'sm') + '<div class="t"><b>' + esc(c.name) + '</b><span>' + esc(c.contact.email) + '</span></div><a class="pill mari" href="#/ad/verify">Fix</a></div>'), 'No bounced contacts.') +
    block('Contacts overdue by more than 90 days', overdue.map((c) => '<div class="lr" style="padding:10px 0">' + logo(c, 'sm') + '<div class="t"><b>' + esc(c.name) + '</b><span>' + daysSince(c.verifiedOn) + ' days since the last check</span></div><a class="pill mari" href="#/ad/verify">Re-check</a></div>'), 'Every verified contact was checked in the last 90 days.') +
    block('Possible duplicate companies', dups.map((g) => '<div class="lr" style="padding:10px 0"><div class="t"><b>' + g.map((c) => esc(c.name)).join(' and ') + '</b><span>' + g.map((c) => c.status).join(', ') + '</span></div><button class="pill mari" style="border:none;cursor:pointer" data-act="adMerge" data-ids="' + g.map((c) => c.id).join(',') + '">Merge</button></div>'), 'No duplicates found.') +
    block('Missing fields', missing.map((c) => '<div class="lr" style="padding:10px 0">' + logo(c, 'sm') + '<div class="t"><b>' + esc(c.name) + '</b><span>Missing contact name, email or city</span></div></div>'), 'Every listing has a contact name, email and city.') + '</div>', { tab: 'quality' });
};
ACT.adMerge = (el) => {
  const ids = el.dataset.ids.split(','), cs = ids.map(C);
  const keep = cs.find((c) => c.status === 'verified') || cs[0], drop = cs.filter((c) => c !== keep);
  if (SERVER) return (async () => { for (const d of drop) { await serverDo('merge_companies', { p: { keepId: keep.id, dropId: d.id } }, null); } toast('Merged into ' + keep.name); })();
  mutate(() => {
    drop.forEach((d) => {
      S.pipeline.forEach((p) => { if (p.companyId === d.id) p.companyId = keep.id; });
      S.shortlists.forEach((s) => { s.companyIds = s.companyIds.map((x) => (x === d.id ? keep.id : x)).filter((x, i, a) => a.indexOf(x) === i); });
      S.requests.forEach((r) => { if (r.companyId === d.id) r.companyId = keep.id; });
      S.alumni.forEach((a) => { if (a.companyId === d.id) a.companyId = keep.id; });
      S.users.forEach((u) => { if (u.role === 'brand' && u.entityId === d.id) u.entityId = keep.id; });
      S.companies = S.companies.filter((x) => x.id !== d.id);
      logAudit('Merged duplicate ' + d.name + ' into ' + keep.name);
    });
  });
  toast('Merged into ' + keep.name);
};

/* ---------- reports ---------- */
V['ad/reports'] = () => {
  const flt = ui.view.rf || 'open', list = S.reports.filter((r) => (flt === 'all' ? true : r.status === flt));
  const tname = (r) => (r.targetType === 'fest' ? (F(r.targetId) || {}).name : r.targetType === 'company' ? (C(r.targetId) || {}).name : r.targetId);
  return page('<div class="pad"><div class="h1 mt12">Reports</div><p class="note mt8">Reports from fests, brands and alumni.</p><div class="mt12">' + chipRow([['open', 'Open ' + S.reports.filter((r) => r.status === 'open').length], ['resolved', 'Resolved'], ['all', 'All']], flt, 'setRF') + '</div>' +
    (list.length ? list.map((r) => '<div class="card mt12"><div class="row between top"><div class="f1"><div class="h3" style="font-size:15.5px">' + esc(r.kind) + ': ' + esc(tname(r)) + '</div><div class="cap">' + esc((U(r.by) || { name: 'Someone' }).name) + ', ' + agoText(r.ts) + '</div></div>' + pill(r.status === 'open' ? 'Open' : 'Resolved', r.status === 'open' ? 'amber' : 'teal') + '</div><p class="note mt8" style="color:var(--ink)">' + esc(r.text) + '</p>' +
      (r.status === 'open' ? '<div class="row mt12 wrap"><button class="btn primary sm" data-act="rpResolve" data-id="' + r.id + '">Resolve</button>' + (r.targetType === 'company' ? '<button class="btn ghost sm" data-act="rpAction" data-id="' + r.id + '">Mark contact bounced</button>' : r.targetType === 'fest' ? '<button class="btn danger sm" data-act="rpAction" data-id="' + r.id + '">Suspend listing</button>' : '') + '</div>' : '') + '</div>').join('') : '<div class="card mt12">' + empty('No reports', 'Nothing to review.') + '</div>') + '</div>', { tab: 'reports' });
};
ACT.setRF = (el) => { ui.view.rf = el.dataset.v; render(); };
ACT.rpResolve = (el) => { const r = byId(S.reports, el.dataset.id); if (SERVER) return serverDo('report_action', { p: { reportId: r.id, action: 'resolve' } }, 'Resolved'); mutate(() => { r.status = 'resolved'; logAudit('Resolved report: ' + r.kind); notify([r.by], 'Your report was reviewed: ' + r.kind, ''); }); toast('Resolved'); };
ACT.rpAction = (el) => {
  const r = byId(S.reports, el.dataset.id);
  if (SERVER) return serverDo('report_action', { p: { reportId: r.id, action: r.targetType === 'company' ? 'bounce' : 'suspend' } }, 'Done');
  mutate(() => {
    if (r.targetType === 'company') { C(r.targetId).status = 'bounced'; logAudit('Marked ' + C(r.targetId).name + ' contact as bounced after a report'); }
    else { F(r.targetId).status = 'rejected'; logAudit('Suspended fest listing ' + F(r.targetId).name + ' after a report'); }
    r.status = 'resolved'; notify([r.by], 'Thanks. We acted on your report: ' + r.kind, '');
  });
  toast('Done');
};

/* ---------- insights ---------- */
V['ad/insights'] = () => {
  const rq = S.requests, answered = rq.filter((r) => r.status !== 'new').length, intros = S.intros, accepted = intros.filter((i) => i.status === 'accepted').length;
  const deals = S.pipeline.filter((p) => p.stage === 'committed'), value = deals.reduce((a, p) => a + p.amount, 0);
  const verifiedC = S.companies.filter((c) => c.status === 'verified'), ages = verifiedC.map((c) => daysSince(c.verifiedOn));
  const avg = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
  const m = (v, l) => '<div class="metric"><b>' + v + '</b><span class="cap">' + l + '</span></div>';
  const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : 'n/a');
  const stageRows = STAGES.map((s) => [s[1], S.pipeline.filter((p) => p.stage === s[0]).length]);
  const mx = Math.max(1, ...stageRows.map((x) => x[1]));
  return page('<div class="pad"><div class="h1 mt12">Insights</div><p class="note mt8">How the product is doing against the success measures.</p>' +
    '<div class="row wrap mt16">' + m(S.fests.filter((f) => f.status === 'verified').length + '/' + S.fests.length, 'Fests verified') + m(verifiedC.length, 'Brands listed') + m(S.alumni.filter((a) => a.status === 'verified').length, 'Alumni verified') + '</div>' +
    '<div class="row wrap mt12">' + m(rq.length, 'Pitch requests sent') + m(pct(answered, rq.length), 'Brand response rate') + m(pct(accepted, intros.length), 'Intro acceptance') + '</div>' +
    '<div class="row wrap mt12">' + m(deals.length, 'Deals closed') + m(money(value), 'Value committed') + m(adminQueue().length, 'Verification backlog') + m(avg + ' days', 'Average contact age') + '</div>' +
    (SERVER ? benchCard() : '') +
    '<div class="card mt16"><div class="h3">Conversations by stage</div><div class="mt12">' + stageRows.map((x) => '<div class="mt8"><div class="row between"><span class="note" style="color:var(--ink)">' + x[0] + '</span><b class="sg" style="font-size:13px">' + x[1] + '</b></div><div class="rbar mt8" style="height:8px"><i style="left:0;width:' + x[1] / mx * 100 + '%"></i></div></div>').join('') + '</div></div></div>', { tab: 'insights' });
};

/* ---------- audit log ---------- */
V['ad/log'] = () => page('<div class="pad"><div class="h1 mt12">Audit log</div><p class="note mt8">Who changed what, and when.</p><div class="card mt12" style="padding:6px 16px">' +
  (S.audit.length ? S.audit.slice(0, 60).map((a) => '<div class="lr"><div class="t"><b style="font-weight:600">' + esc(a.text) + '</b><span>' + esc((U(a.by) || { name: 'System' }).name) + ', ' + fmtDateY(a.ts) + '</span></div></div>').join('') : empty('Nothing yet', '')) + '</div></div>', { tab: 'log' });

/* ---------- add a company by hand, and benchmarks entered by the desk ---------- */
ACT.adAddCompany = () => { ui.forms.ac = { name: '', sub: '', cat: 'tech', city: '', band: 'Under 1L', cn: '', cr: '', ce: '', ch: 'Email', rd: '5', lo: '', hi: '', n: '', method: 'Phone call to the contact', tags: ['Cash'] }; openSheet('adCompany'); };
SHEETS.adCompany = () => '<div class="h2">Add a company</div><p class="note mt8">For brands you have spoken to yourself. It goes live as verified, so log how you checked.</p>' +
  fld('Company', inp('ac.name')) + fld('What they do', inp('ac.sub', { ph: 'Cloud and developer tools' })) + fld('Category', sel('ac.cat', CATS.filter((c) => !c.tier).map((c) => [c.k, c.label]))) + fld('City', inp('ac.city')) +
  '<div class="cap mt12">What they can offer</div><div class="row wrap g8 mt8">' + ['Cash', 'In-kind', 'Hiring', 'Prizes', 'Stalls'].map((t) => '<button class="chip ' + (ui.forms.ac.tags.includes(t) ? 'on' : '') + '" data-act="acTag" data-v="' + t + '">' + t + '</button>').join('') + '</div>' +
  fld('Typical budget', sel('ac.band', ['Under 1L', '1L to 3L', '3L+'])) + fld('Contact name', inp('ac.cn')) + fld('Contact role', inp('ac.cr', { ph: 'Campus Marketing Lead' })) + fld('Contact email', inp('ac.ce', { type: 'email' })) +
  fld('Preferred channel', sel('ac.ch', ['Email', 'WhatsApp', 'LinkedIn', 'Phone'])) + fld('Usually replies in (days)', inp('ac.rd', { type: 'number', min: 1 })) +
  '<div class="cap mt16">What similar fests gave them, from your interviews (lakhs). Leave blank if unknown.</div><div class="row g8 mt8"><div class="f1">' + inp('ac.lo', { type: 'number', ph: 'Low' }) + '</div><div class="f1">' + inp('ac.hi', { type: 'number', ph: 'High' }) + '</div><div class="f1">' + inp('ac.n', { type: 'number', ph: 'Fests' }) + '</div></div>' +
  fld('How did you check', sel('ac.method', VERIFY_METHODS.company)) + '<button class="btn primary mt20" data-act="adCompanyGo">Add company</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.acTag = (el) => { const t = ui.forms.ac.tags, v = el.dataset.v; ui.forms.ac.tags = t.includes(v) ? t.filter((x) => x !== v) : t.concat([v]); render(); };
ACT.adCompanyGo = () => {
  const a = ui.forms.ac;
  if (!need(a, ['name', 'city', 'cn', 'ce']) || !a.tags.length) return toast('Add the name, city, contact and email');
  if (SERVER) return serverDo('admin_add_company', { p: { name: a.name, sub: a.sub, cat: a.cat, city: a.city, tags: a.tags, band: a.band, contactName: a.cn, contactRole: a.cr, email: a.ce, channel: a.ch, replyDays: +a.rd || 5, benchLo: +a.lo || 0, benchHi: +a.hi || 0, benchN: +a.n || 0, method: a.method, color: COLORS[Math.floor(Math.random() * COLORS.length)] } }, 'Company added and verified', () => { ui.sheet = null; render(); });
  mutate(() => {
    S.companies.push({ id: uid('c_'), name: a.name.trim(), sub: a.sub.trim() || 'Company', cat: a.cat, city: a.city.trim(), tags: a.tags, band: a.band, color: COLORS[S.companies.length % COLORS.length], contact: { name: a.cn.trim(), role: a.cr.trim() || 'Contact', email: a.ce.trim(), channel: a.ch, replyDays: +a.rd || 5 }, verifiedOn: Date.now(), status: 'verified', bench: { lo: +a.lo || 0, hi: +a.hi || 0, n: +a.n || 0 }, past: [], inbound: { paused: false, weeklyCap: 6, types: FEST_TYPES.slice() }, visible: { email: false, band: true } });
    logAudit('Added company ' + a.name.trim()); ui.sheet = null;
  });
  toast('Company added and verified');
};
function benchCard() {
  const rows = Object.values(S.benchmarks || {}).sort((x, y) => (x.type + x.size + x.cat).localeCompare(y.type + y.size + y.cat));
  return '<div class="card mt16"><div class="row between"><div class="h3">Benchmarks</div><button class="btn ghost sm" data-act="adBench">Add or update</button></div><p class="note mt8">Ranges students see in the target planner. Enter what you learn from fest leads. Until a row has enough fests behind it, students see “Not enough data yet”.</p>' +
    (rows.length ? '<div class="mt8">' + rows.map((b) => '<div class="kv"><span>' + esc(b.type) + ', ' + esc((SIZE_BANDS.find((s) => s.k === b.size) || {}).label || b.size) + ', ' + esc(b.cat === 'total' ? 'Total raised' : CAT_LABEL[b.cat]) + '</span><b>' + lk(b.lo) + ' to ' + lk(b.hi) + ' (' + b.n + ')</b></div>').join('') + '</div>' : '<div class="note mt8">No benchmarks yet.</div>') + '</div>';
}
ACT.adBench = () => { ui.forms.bm = { type: 'Technical', size: 'm', cat: 'total', lo: '', hi: '', n: '' }; openSheet('adBench'); };
SHEETS.adBench = () => '<div class="h2">Set a benchmark</div><p class="note mt8">Amounts are in lakhs. “Fests” is how many real fests the range is based on.</p>' +
  fld('Fest type', sel('bm.type', FEST_TYPES)) + fld('Size', sel('bm.size', SIZE_BANDS.map((s) => [s.k, s.label]))) + fld('Sponsor type', sel('bm.cat', [['total', 'Total raised']].concat(CATS.map((c) => [c.k, c.label])))) +
  '<div class="row g8"><div class="f1">' + fld('Low', inp('bm.lo', { type: 'number', min: 0 })) + '</div><div class="f1">' + fld('High', inp('bm.hi', { type: 'number', min: 0 })) + '</div><div class="f1">' + fld('Fests', inp('bm.n', { type: 'number', min: 0 })) + '</div></div>' +
  '<button class="btn primary mt20" data-act="adBenchGo">Save</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.adBenchGo = () => {
  const b = ui.forms.bm;
  if (!(+b.hi > 0) || +b.lo > +b.hi || !(+b.n > 0)) return toast('Enter a low and high figure and how many fests');
  serverDo('admin_set_benchmark', { p: { type: b.type, size: b.size, cat: b.cat, lo: +b.lo, hi: +b.hi, n: +b.n } }, 'Benchmark saved', () => { ui.sheet = null; render(); });
};
