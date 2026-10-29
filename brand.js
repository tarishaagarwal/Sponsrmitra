/* ===== Brand side and alumnus side ===== */
function newItem(fid, cid, owner, stage, ask) {
  return { id: uid('p'), festId: fid, companyId: cid, stage, owner, ask: ask || 0, amount: 0, followUp: null, meetingAt: null, lastTouch: Date.now(), createdAt: Date.now(), notes: [], activity: [], decline: null, deckSent: false, payments: [], deliverables: [], proof: [], committedOn: null, kind: 'cash' };
}
function ensureItem(fid, cid, stage, ask) {
  let p = stageOfFest(fid, cid);
  if (!p) { const lead = festLead(fid); p = newItem(fid, cid, lead ? lead.id : null, stage, ask); S.pipeline.push(p); }
  return p;
}
const actFor = (p, text) => { p.activity.unshift({ id: uid('ac'), ts: Date.now(), by: S.session.userId, text }); p.lastTouch = Date.now(); };
const festTeamIds = (fid) => festUsers(fid).filter((u) => u.festRole !== 'convenor').map((u) => u.id);
const unverBrand = (c) => (c.status === 'verified' ? '' : '<div class="banner amber"><div>' + ico('clock', 18, 'currentColor', 2) + '</div><div class="note"><b class="sg">Waiting for verification.</b> Students see your listing once the verification desk checks your contact.</div></div>');

/* ---------- dashboard ---------- */
V['b/dash'] = () => {
  const c = myCompany(), rq = S.requests.filter((r) => r.companyId === c.id);
  const n = (s) => rq.filter((r) => r.status === s).length;
  const deals = S.pipeline.filter((p) => p.companyId === c.id && p.stage === 'committed');
  const recent = rq.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  return page('<div class="pad"><div class="row mt12">' + logo(c) + '<div class="f1"><div class="h1" style="font-size:24px">' + esc(c.name) + '</div><div class="note">' + esc(me().name) + ', ' + esc(c.contact.role) + '</div></div></div>' + unverBrand(c) +
    '<div class="row wrap mt16"><div class="metric"><b>' + n('new') + '</b><span class="cap">New requests</span></div><div class="metric"><b>' + n('accepted') + '</b><span class="cap">Accepted</span></div><div class="metric"><b>' + deals.length + '</b><span class="cap">Sponsorships in delivery</span></div></div>' +
    '<div class="sec"><div class="h3">Latest requests</div><a class="cap" style="color:var(--teal);font-weight:700" href="#/b/inbox">Open inbox</a></div>' +
    (recent.length ? '<div class="card" style="padding:6px 16px">' + recent.map((r) => { const f = F(r.festId); return '<a class="lr" href="#/b/inbox"><div class="t"><b>' + esc(f.name) + '</b><span>' + esc(f.college) + ', asking ' + money(r.ask) + '</span></div>' + pill({ new: 'New', accepted: 'Accepted', declined: 'Declined', question: 'Question sent' }[r.status], { new: 'mari', accepted: 'teal', declined: 'brick', question: 'amber' }[r.status]) + '</a>'; }).join('') + '</div>' : '<div class="card">' + empty('No requests yet', 'Verified fests send pitches in one standard format.') + '</div>') +
    '<div class="row mt16"><a class="btn ghost sm f1" href="#/b/fests">Browse fests</a><a class="btn ghost sm f1" href="#/b/profile">Inbound controls</a></div></div>', { tab: 'dash' });
};

/* ---------- inbox ---------- */
V['b/inbox'] = () => {
  const c = myCompany(), flt = ui.view.bf || 'new';
  const all = S.requests.filter((r) => r.companyId === c.id).sort((a, b) => b.createdAt - a.createdAt);
  const list = flt === 'all' ? all : all.filter((r) => r.status === flt);
  const cnt = (s) => all.filter((r) => r.status === s).length;
  return page('<div class="pad"><div class="h1 mt12">Inbox</div><p class="note mt8">Every request arrives in the same format, with proof, so you can compare.</p>' + unverBrand(c) +
    '<div class="mt12">' + chipRow([['new', 'New ' + cnt('new')], ['question', 'Asked ' + cnt('question')], ['accepted', 'Accepted ' + cnt('accepted')], ['declined', 'Declined ' + cnt('declined')], ['all', 'All ' + all.length]], flt, 'setBF') + '</div>' +
    (list.length ? list.map((r) => { const f = F(r.festId), pr = f.proof || {}; return '<div class="card mt12"><div class="row between top"><div class="f1"><div class="h3" style="font-size:16.5px">' + esc(f.name) + '</div><div class="note">' + esc(f.college) + ', ' + esc(f.city) + '</div></div>' + pill({ new: 'New', accepted: 'Accepted', declined: 'Declined', question: 'Question sent' }[r.status], { new: 'mari', accepted: 'teal', declined: 'brick', question: 'amber' }[r.status]) + '</div>' +
      '<div class="row g6 wrap mt12">' + tag(f.type) + tag(f.visitors.toLocaleString('en-IN') + ' visitors') + tag('Ask ' + money(r.ask)) + (pr.footfall ? tag('Footfall ' + pr.footfall.kind) : '') + (pr.photos && pr.photos.length ? tag(plural(pr.photos.length, 'photo', 'photos')) : tag('No photos')) + '</div>' +
      '<p class="note mt12" style="color:var(--ink)">' + esc(r.message) + '</p>' + (r.question ? '<div class="banner amber"><div class="note"><b class="sg">Your question:</b> ' + esc(r.question) + '</div></div>' : '') + (r.reason ? '<div class="note mt8">Reason given: ' + esc(r.reason) + '</div>' : '') +
      (['new', 'question'].includes(r.status) ? '<div class="row mt16 wrap"><button class="btn primary sm" data-act="bAccept" data-id="' + r.id + '">Accept</button><button class="btn ghost sm" data-act="bDecline" data-id="' + r.id + '">Decline</button><button class="btn ghost sm" data-act="bAsk" data-id="' + r.id + '">Ask a question</button><button class="btn ghost sm" data-act="bForward" data-id="' + r.id + '">Forward</button></div>' : '') +
      '<div class="row mt12"><button class="cap" style="border:none;background:none;color:var(--brick);cursor:pointer" data-act="openReport" data-t="fest" data-id="' + f.id + '">Report this listing</button></div></div>'; }).join('') : '<div class="card mt12">' + empty('Nothing here', flt === 'new' ? 'You have no new requests.' : 'No requests match this filter.') + '</div>') + '</div>', { tab: 'inbox' });
};
ACT.setBF = (el) => { ui.view.bf = el.dataset.v; render(); };
const reqById = (el) => byId(S.requests, el.dataset.id);
ACT.bAccept = (el) => {
  const r = reqById(el), c = myCompany(), f = F(r.festId);
  if (SERVER) return serverDo('respond_request', { p: { requestId: r.id, action: 'accept' } }, 'Accepted. ' + f.name + ' has been told.');
  mutate(() => {
    r.status = 'accepted'; r.respondedAt = Date.now();
    const p = ensureItem(r.festId, c.id, 'replied', r.ask);
    if (['shortlisted', 'intro', 'contacted'].includes(p.stage)) p.stage = 'replied';
    actFor(p, c.name + ' accepted your request. ' + firstName(me().name) + ' will be in touch.');
    notify(festTeamIds(r.festId), c.name + ' accepted your sponsorship request', '#/pipe/' + p.id);
  });
  toast('Accepted. ' + f.name + ' has been told.');
};
ACT.bDecline = (el) => { ui.forms.bd = { id: el.dataset.id, reason: DECLINE_REASONS[0] }; openSheet('bDecline'); };
SHEETS.bDecline = () => '<div class="h2">Decline this request</div><p class="note mt8">The fest sees your reason, so they can improve or look elsewhere.</p>' + fld('Reason', sel('bd.reason', DECLINE_REASONS)) + '<button class="btn primary mt20" data-act="bDeclineGo">Decline</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.bDeclineGo = () => {
  const d = ui.forms.bd, r = byId(S.requests, d.id), c = myCompany();
  if (SERVER) return serverDo('respond_request', { p: { requestId: r.id, action: 'decline', reason: d.reason } }, 'Declined. The fest has the reason.', () => { ui.sheet = null; render(); });
  mutate(() => {
    r.status = 'declined'; r.reason = d.reason; r.respondedAt = Date.now();
    const p = ensureItem(r.festId, c.id, 'declined', r.ask); p.stage = 'declined'; p.decline = d.reason; actFor(p, c.name + ' declined: ' + d.reason.toLowerCase());
    notify(festTeamIds(r.festId), c.name + ' declined: ' + d.reason.toLowerCase(), '#/pipe/' + p.id); ui.sheet = null;
  });
  toast('Declined. The fest has the reason.');
};
ACT.bAsk = (el) => { ui.forms.bq = { id: el.dataset.id, text: '' }; openSheet('bAsk'); };
SHEETS.bAsk = () => '<div class="h2">Ask the fest a question</div>' + fld('Your question', txt('bq.text', { rows: 4 })) + '<button class="btn primary mt20" data-act="bAskGo">Send question</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.bAskGo = () => {
  const d = ui.forms.bq, r = byId(S.requests, d.id), c = myCompany();
  if (!d.text.trim()) return toast('Write your question');
  if (SERVER) return serverDo('respond_request', { p: { requestId: r.id, action: 'ask', text: d.text.trim() } }, 'Question sent', () => { ui.sheet = null; render(); });
  mutate(() => {
    r.status = 'question'; r.question = d.text.trim();
    const p = ensureItem(r.festId, c.id, 'replied', r.ask); if (['shortlisted', 'intro', 'contacted'].includes(p.stage)) p.stage = 'replied'; actFor(p, c.name + ' asked: ' + d.text.trim());
    notify(festTeamIds(r.festId), c.name + ' has a question about your request', '#/pipe/' + p.id); ui.sheet = null;
  });
  toast('Question sent');
};
ACT.bForward = (el) => { const r = reqById(el); if (SERVER) return serverDo('respond_request', { p: { requestId: r.id, action: 'forward' } }, 'Forwarded to a colleague'); mutate(() => { r.forwarded = true; logAudit('Request from ' + F(r.festId).name + ' forwarded to a colleague at ' + myCompany().name); }); toast('Forwarded to a colleague'); };

/* ---------- fest directory and compare ---------- */
V['b/fests'] = () => {
  const c = myCompany(), t = ui.view.ft || 'all', cmp = ui.view.cmp || [];
  const list = S.fests.filter((f) => f.status === 'verified' && (t === 'all' || f.type === t));
  const minTier = (f) => (f.packages[2] ? f.packages[2].price : 'Not listed');
  const sticky = cmp.length >= 2 ? '<div class="sticky"><button class="btn primary" data-act="openCompare">Compare ' + cmp.length + ' fests</button></div>' : '';
  return page('<div class="pad"><div class="h1 mt12">Fests</div><p class="note mt8">Verified fests only. Pick two or three to compare side by side.</p>' + unverBrand(c) +
    '<div class="mt12">' + chipRow([['all', 'All']].concat(FEST_TYPES.map((x) => [x, x.split(' ')[0]])), t, 'setFT') + '</div>' +
    list.map((f) => { const on = cmp.includes(f.id), inv = (c.invited || []).includes(f.id); return '<div class="card mt12"><div class="row between top"><div class="f1"><div class="h3" style="font-size:16.5px">' + esc(f.name) + '</div><div class="note">' + esc(f.college) + ', ' + esc(f.city) + '</div></div>' + pill(f.type, 'ink') + '</div>' +
      '<p class="note mt8">' + esc(f.audience) + '</p><div class="row g6 wrap mt8">' + tag(f.visitors.toLocaleString('en-IN') + ' visitors') + tag(f.proof.footfall ? f.proof.footfall.kind : 'No footfall data') + tag('Starts ' + fmtDate(f.start)) + tag('In-kind from ' + minTier(f).split(' to ')[0]) + '</div>' +
      '<div class="row mt12 wrap"><button class="btn ' + (on ? 'primary' : 'ghost') + ' sm" data-act="togCmp" data-id="' + f.id + '">' + (on ? 'Selected' : 'Compare') + '</button><button class="btn ghost sm ' + (inv ? 'off' : '') + '" data-act="invite" data-id="' + f.id + '">' + (inv ? 'Invited to pitch' : 'Invite to pitch') + '</button></div></div>'; }).join('') + '<div style="height:70px"></div></div>', { tab: 'fests', sticky });
};
ACT.setFT = (el) => { ui.view.ft = el.dataset.v; render(); };
ACT.togCmp = (el) => { const id = el.dataset.id; let cmp = ui.view.cmp || []; if (cmp.includes(id)) cmp = cmp.filter((x) => x !== id); else if (cmp.length >= 3) return toast('Compare up to three fests'); else cmp = cmp.concat([id]); ui.view.cmp = cmp; render(); };
ACT.openCompare = () => openSheet('compare');
SHEETS.compare = () => {
  const fs = (ui.view.cmp || []).map(F);
  const row = (l, fn) => '<tr><th>' + l + '</th>' + fs.map((f) => '<td>' + fn(f) + '</td>').join('') + '</tr>';
  return '<div class="h2">Compare fests</div><div style="overflow-x:auto"><table class="tbl mt12"><tr><th></th>' + fs.map((f) => '<th>' + esc(f.name) + '</th>').join('') + '</tr>' +
    row('Where', (f) => esc(f.city)) + row('Type', (f) => esc(f.type)) + row('Visitors', (f) => f.visitors.toLocaleString('en-IN')) + row('Footfall proof', (f) => (f.proof.footfall ? esc(f.proof.footfall.kind) : 'None')) + row('Photos', (f) => (f.proof.photos.length ? 'Yes' : 'No')) +
    row('Title tier', (f) => esc((f.packages[0] || {}).price || '')) + row('Associate tier', (f) => esc((f.packages[1] || {}).price || '')) + row('Past sponsors', (f) => (f.pastSponsors.length ? esc(f.pastSponsors.join(', ')) : 'None yet')) + row('Starts', (f) => fmtDate(f.start)) + '</table></div><button class="btn ghost mt16" data-act="closeSheet">Close</button>';
};
ACT.invite = (el) => {
  const c = myCompany(), f = F(el.dataset.id);
  mutate(() => { c.invited = (c.invited || []).concat([f.id]); notify(festTeamIds(f.id), c.name + ' invited ' + f.name + ' to send a pitch', '#/company/' + c.id); });
  toast('Invitation sent to ' + f.name);
};

/* ---------- deals ---------- */
V['b/deals'] = () => {
  const c = myCompany(), deals = S.pipeline.filter((p) => p.companyId === c.id && p.stage === 'committed');
  return page('<div class="pad"><div class="h1 mt12">Sponsorships</div><p class="note mt8">Delivery progress and proof for every fest you back.</p>' +
    (deals.length ? deals.map((p) => { const f = F(p.festId), done = p.deliverables.filter((d) => d.done).length; return '<div class="card mt12"><div class="row between"><div class="h3" style="font-size:16.5px">' + esc(f.name) + '</div><b class="sg">' + money(p.amount) + '</b></div><div class="note">' + esc(f.college) + '</div><div class="bar mt12" style="height:8px"><i style="width:' + (p.deliverables.length ? done / p.deliverables.length * 100 : 0) + '%;background:var(--teal)"></i></div><div class="cap mt8">' + done + ' of ' + p.deliverables.length + ' deliverables done, ' + plural(p.proof.length, 'proof item', 'proof items') + '</div><div class="row mt12"><a class="btn ghost sm" href="#/sponsor/' + p.id + '">Open progress page</a><a class="btn ghost sm" href="#/report/' + p.id + '">Delivery report</a></div></div>'; }).join('') : '<div class="card mt12">' + empty('No sponsorships yet', 'Accepted requests that turn into commitments show up here.') + '</div>') + '</div>', { tab: 'deals' });
};

/* ---------- brand profile and inbound controls ---------- */
V['b/profile'] = () => {
  const c = myCompany(), u = me();
  const cap = ['1', '3', '6', '10'];
  return page('<div class="pad"><div class="row mt12">' + logo(c, 'lg') + '<div class="f1"><div class="h2">' + esc(c.name) + '</div><div class="note">' + esc(c.sub) + ', ' + esc(c.city) + '</div><div class="row g8 mt8">' + vbadge(c) + '</div></div></div>' + unverBrand(c) +
    '<div class="card mt16"><div class="h3">Listing</div><div class="row g6 wrap mt12">' + c.tags.map(tag).join('') + '</div><div class="kv mt12"><span>Contact</span><b>' + esc(c.contact.name) + ', ' + esc(c.contact.role) + '</b></div><div class="kv"><span>Preferred channel</span><b>' + esc(c.contact.channel) + '</b></div><div class="kv"><span>Email</span><b>' + esc(c.contact.email) + '</b></div><div class="kv"><span>Typical budget</span><b>' + esc(c.band) + '</b></div><button class="btn ghost sm mt12" data-act="editBrand">Edit listing</button></div>' +
    '<div class="card mt16"><div class="h3">Inbound controls</div><p class="note mt8">Keep your inbox worth reading.</p>' +
    '<div class="row between mt12"><div class="f1"><div class="sg" style="font-weight:600;font-size:14.5px">Pause new requests</div><div class="note">Fests see that you are not taking pitches</div></div>' + toggle(c.inbound.paused, 'togPause') + '</div>' +
    '<div class="mt16"><div class="cap" style="margin-bottom:6px">Most requests per week</div><select class="sel" data-change="setWeekCap">' + cap.map((x) => '<option value="' + x + '"' + (String(c.inbound.weeklyCap) === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
    '<div class="cap mt16">Fest types you want to hear about</div><div class="row wrap g8 mt8">' + FEST_TYPES.map((t) => '<button class="chip ' + (c.inbound.types.includes(t) ? 'on' : '') + '" data-act="togType" data-v="' + esc(t) + '" aria-pressed="' + c.inbound.types.includes(t) + '">' + esc(t.split(' ')[0]) + '</button>').join('') + '</div>' +
    '<div class="row between mt16"><div class="f1"><div class="sg" style="font-weight:600;font-size:14.5px">Show my budget band to fests</div><div class="note">Helps students ask for a fair amount</div></div>' + toggle(c.visible.band, 'togBand') + '</div></div>' + privacyCard() + '<div style="height:20px"></div></div>', { tab: 'profile' });
};
ACT.togPause = () => { const c = myCompany(); mutate(() => { c.inbound.paused = !c.inbound.paused; }); toast(c.inbound.paused ? 'New requests paused' : 'Taking requests again'); };
ACT.setWeekCap = (el) => { const c = myCompany(); mutate(() => { c.inbound.weeklyCap = +el.value; }); };
ACT.togType = (el) => { const c = myCompany(), t = el.dataset.v; mutate(() => { c.inbound.types = c.inbound.types.includes(t) ? c.inbound.types.filter((x) => x !== t) : c.inbound.types.concat([t]); }); };
ACT.togBand = () => { const c = myCompany(); mutate(() => { c.visible.band = !c.visible.band; }); };
ACT.editBrand = () => { const c = myCompany(); ui.forms.eb = { city: c.city, band: c.band, cn: c.contact.name, cr: c.contact.role, ce: c.contact.email, ch: c.contact.channel, tags: c.tags.slice() }; openSheet('editBrand'); };
SHEETS.editBrand = () => '<div class="h2">Edit listing</div><div class="cap mt16">What you can offer</div><div class="row wrap g8 mt8">' + ['Cash', 'In-kind', 'Hiring', 'Prizes', 'Stalls'].map((t) => '<button class="chip ' + (ui.forms.eb.tags.includes(t) ? 'on' : '') + '" data-act="ebTag" data-v="' + t + '">' + t + '</button>').join('') + '</div>' +
  fld('City', inp('eb.city')) + fld('Typical budget', sel('eb.band', ['Under 1L', '1L to 3L', '3L+'])) + fld('Contact name', inp('eb.cn')) + fld('Contact role', inp('eb.cr')) + fld('Contact email', inp('eb.ce', { type: 'email' })) + fld('Preferred channel', sel('eb.ch', ['Email', 'WhatsApp', 'LinkedIn', 'Phone'])) +
  '<p class="note mt12">Changing the contact email sends your listing back for verification.</p><button class="btn primary mt16" data-act="saveBrand">Save</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.ebTag = (el) => { const t = ui.forms.eb.tags, v = el.dataset.v; ui.forms.eb.tags = t.includes(v) ? t.filter((x) => x !== v) : t.concat([v]); render(); };
ACT.saveBrand = () => {
  const c = myCompany(), e = ui.forms.eb;
  if (!need(e, ['city', 'cn', 'cr', 'ce']) || !e.tags.length) return toast('Fill in every field and pick at least one offer');
  mutate(() => {
    const emailChanged = e.ce.trim() !== c.contact.email;
    Object.assign(c, { city: e.city.trim(), band: e.band, tags: e.tags }); Object.assign(c.contact, { name: e.cn.trim(), role: e.cr.trim(), email: e.ce.trim(), channel: e.ch });
    if (emailChanged) { c.status = 'pending'; notify(['u_admin'], c.name + ' changed its contact email and needs re-verification', '#/ad/verify'); }
    ui.sheet = null;
  });
  toast('Listing updated');
};

/* ---------- alumnus ---------- */
V['a/inbox'] = () => {
  const a = myAlumnus(), flt = ui.view.af || 'open';
  const all = S.intros.filter((i) => i.alumnusId === a.id).sort((x, y) => y.createdAt - x.createdAt);
  const open = all.filter((i) => ['sent', 'seen'].includes(i.status));
  const list = flt === 'open' ? open : all.filter((i) => !['sent', 'seen'].includes(i.status));
  const used = introsUsed(a.id);
  return page('<div class="pad"><div class="h1 mt12">Requests</div><p class="note mt8">You take up to ' + a.cap + ' a month. ' + used + ' used so far. Answer with one tap.</p>' +
    (a.status !== 'verified' ? '<div class="banner amber"><div class="note"><b class="sg">Waiting for verification.</b> Juniors see you once the verification desk confirms your details.</div></div>' : '') +
    '<div class="mt12">' + chipRow([['open', 'Waiting ' + open.length], ['done', 'Answered ' + (all.length - open.length)]], flt, 'setAF') + '</div>' +
    (list.length ? list.map((i) => { const f = F(i.festId), c = C(i.companyId), by = U(i.by); return '<div class="card mt12"><div class="row between top"><div class="f1"><div class="h3" style="font-size:16.5px">' + esc(f.name) + '</div><div class="note">' + esc(f.college) + ', ' + esc(f.city) + '</div></div>' + (i.status === 'sent' || i.status === 'seen' ? pill('Waiting', 'mari') : pill({ accepted: 'You introduced', declined: 'Declined', redirected: 'Redirected' }[i.status], { accepted: 'teal', declined: 'brick', redirected: 'amber' }[i.status])) + '</div>' +
      '<div class="row g6 wrap mt12">' + tag('From ' + (by ? by.name : 'a student')) + tag('To ' + c.contact.name + ' at ' + c.name) + tag('Ask ' + money(i.ask)) + tag(f.visitors.toLocaleString('en-IN') + ' visitors') + '</div>' +
      '<p class="note mt12" style="color:var(--ink)">' + esc(i.message) + '</p>' +
      (['sent', 'seen'].includes(i.status) ? '<div class="row mt16 wrap"><button class="btn primary sm" data-act="aAccept" data-id="' + i.id + '">Introduce</button><button class="btn ghost sm" data-act="aDecline" data-id="' + i.id + '">Decline</button><button class="btn ghost sm" data-act="aRedirect" data-id="' + i.id + '">Suggest someone else</button></div>' : '') + '</div>'; }).join('') : '<div class="card mt12">' + empty(flt === 'open' ? 'Nothing waiting' : 'No answered requests yet', 'Requests from juniors at your college appear here.') + '</div>') + '</div>', { tab: 'inbox' });
};
ACT.setAF = (el) => { ui.view.af = el.dataset.v; render(); };
const introById = (el) => byId(S.intros, el.dataset.id);
function respondIntro(i, status, extra, text) {
  const a = myAlumnus(), f = F(i.festId), c = C(i.companyId);
  mutate(() => {
    i.status = status; i.respondedAt = Date.now(); Object.assign(i, extra || {});
    const p = stageOfFest(i.festId, i.companyId); if (p) actFor(p, text);
    notify([i.by].concat(festTeamIds(i.festId)).filter((x, k, arr) => x && arr.indexOf(x) === k), text, p ? '#/pipe/' + p.id : '#/alumni'); ui.sheet = null;
  });
}
ACT.aAccept = (el) => { const i = introById(el), a = myAlumnus(); if (SERVER) return serverDo('respond_intro', { p: { introId: i.id, action: 'accept' } }, 'Thank you. The fest has been told.'); respondIntro(i, 'accepted', null, a.name + ' accepted and will introduce ' + F(i.festId).name + ' to ' + C(i.companyId).name); toast('Thank you. The fest has been told.'); };
ACT.aDecline = (el) => { const i = introById(el), a = myAlumnus(); if (SERVER) return serverDo('respond_intro', { p: { introId: i.id, action: 'decline' } }, 'Declined. The fest has been told.'); respondIntro(i, 'declined', null, a.name + ' could not introduce ' + F(i.festId).name + ' this time'); toast('Declined. The fest has been told.'); };
ACT.aRedirect = (el) => {
  const i = introById(el), a = myAlumnus(), f = F(i.festId);
  ui.forms.ar = { id: i.id, pick: '', name: '' }; openSheet('aRedirect');
};
SHEETS.aRedirect = () => {
  const i = byId(S.intros, ui.forms.ar.id), a = myAlumnus();
  const colleagues = S.alumni.filter((x) => x.id !== a.id && x.companyId === i.companyId && x.college === a.college && x.status === 'verified');
  return '<div class="h2">Suggest someone else</div><p class="note mt8">Name a colleague who may be better placed to help.</p>' +
    (colleagues.length ? '<div class="cap mt16">Alumni from your college at ' + esc(C(i.companyId).name) + '</div>' + colleagues.map((x) => '<div class="lr" data-act="arPick" data-name="' + esc(x.name) + '"><div class="t"><b>' + esc(x.name) + '</b><span>' + esc(x.role) + '</span></div><div class="ck ' + (ui.forms.ar.name === x.name ? 'done' : '') + '">' + (ui.forms.ar.name === x.name ? ico('check', 14, '#FFFCF4', 3.2) : '') + '</div></div>').join('') : '') +
    fld('Or type a name', inp('ar.name', { rerender: false })) + '<button class="btn primary mt20" data-act="arGo">Send suggestion</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
};
ACT.arPick = (el) => { ui.forms.ar.name = el.dataset.name; render(); };
ACT.arGo = () => { const r = ui.forms.ar, i = byId(S.intros, r.id), a = myAlumnus(); if (!r.name.trim()) return toast('Name someone first'); if (SERVER) return serverDo('respond_intro', { p: { introId: i.id, action: 'redirect', redirectName: r.name.trim() } }, 'Suggestion sent', () => { ui.sheet = null; render(); }); respondIntro(i, 'redirected', { redirectName: r.name.trim() }, a.name + ' suggested ' + r.name.trim() + ' for ' + C(i.companyId).name); toast('Suggestion sent'); };

V['a/profile'] = () => {
  const a = myAlumnus(), c = C(a.companyId), used = introsUsed(a.id);
  return page('<div class="pad"><div class="row mt12">' + avatar(a.initials, 'lg') + '<div class="f1"><div class="h2">' + esc(a.name) + '</div><div class="note">Class of ' + a.cohort + ', ' + esc(a.college) + '</div></div></div>' +
    (a.status !== 'verified' ? '<div class="banner amber"><div class="note"><b class="sg">Waiting for verification.</b> Juniors see you once the desk confirms your details.</div></div>' : '<div class="banner teal"><div class="note"><b class="sg">Verified.</b> Juniors from your college can ask you for introductions.</div></div>') +
    '<div class="card mt16"><div class="h3">Your details</div><div class="kv mt8"><span>Company</span><b>' + esc(c.name) + '</b></div><div class="kv"><span>Role</span><b>' + esc(a.role) + '</b></div><div class="kv"><span>How you help</span><b>' + (a.helps === 'introduce' ? 'Introduce juniors' : 'Advise only') + '</b></div><div class="kv"><span>Requests per month</span><b>' + a.cap + ' (' + used + ' used)</b></div><button class="btn ghost sm mt12" data-act="editAlum">Edit details</button></div>' + privacyCard() + '<div style="height:20px"></div></div>', { tab: 'profile' });
};
ACT.editAlum = () => { const a = myAlumnus(); ui.forms.ea = { role: a.role, help: a.helps, cap: String(a.cap) }; openSheet('editAlum'); };
SHEETS.editAlum = () => '<div class="h2">Edit details</div>' + fld('Your role', inp('ea.role')) + fld('How can you help', sel('ea.help', [['introduce', 'Introduce juniors'], ['advise', 'Advise only']])) + fld('Requests per month', sel('ea.cap', ['1', '2', '3', '5', '8'])) + '<button class="btn primary mt20" data-act="saveAlum">Save</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.saveAlum = () => { const a = myAlumnus(), e = ui.forms.ea; if (!e.role.trim()) return toast('Add your role'); mutate(() => { Object.assign(a, { role: e.role.trim(), helps: e.help, cap: +e.cap }); ui.sheet = null; }); toast('Saved'); };
