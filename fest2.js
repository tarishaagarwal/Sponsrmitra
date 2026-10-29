/* ===== Fest side: pipeline, deals, alumni, profile, documents ===== */
const firstName = (n) => String(n).split(' ')[0];
function itemSub(p) {
  const c = C(p.companyId), owner = firstName(U(p.owner) ? U(p.owner).name : 'Team');
  const i = S.intros.filter((x) => x.festId === p.festId && x.companyId === p.companyId).sort((a, b) => b.createdAt - a.createdAt)[0];
  if (p.stage === 'intro' && i) {
    const al = A(i.alumnusId);
    if (i.status === 'accepted') return owner + ', ' + (p.deckSent ? 'deck sent' : 'intro accepted, deck due');
    if (i.status === 'declined') return owner + ', ' + firstName(al.name) + ' declined';
    if (i.status === 'redirected') return owner + ', ' + firstName(al.name) + ' suggested someone else';
    return owner + ', waiting ' + Math.max(0, daysSince(i.createdAt)) + ' days for ' + firstName(al.name);
  }
  if (p.stage === 'meeting' && p.meetingAt) return owner + ', ' + fmtDT(p.meetingAt);
  if (p.stage === 'committed') return owner + ', ' + money(p.amount) + (p.kind === 'in-kind' ? ' in-kind value' : ' cash');
  if (p.stage === 'declined') return owner + ', ' + (p.decline || 'declined');
  if (p.ask) return owner + ', asked ' + money(p.ask);
  return owner + ', last touch ' + agoText(p.lastTouch);
}
function itemPill(p) {
  const i = S.intros.filter((x) => x.festId === p.festId && x.companyId === p.companyId).sort((a, b) => b.createdAt - a.createdAt)[0];
  if (p.stage === 'intro' && i) return i.status === 'accepted' ? (p.deckSent ? pill('Deck sent', 'teal') : pill('Send deck', 'mari')) : i.status === 'declined' ? pill('Declined', 'brick') : i.status === 'redirected' ? pill('Redirected', 'amber') : pill(i.status === 'seen' ? 'Seen' : 'Waiting', 'ink');
  if (p.stage === 'meeting') return pill('Meeting', 'teal');
  if (p.stage === 'negotiating') return p.followUp && p.followUp <= Date.now() + DAY ? pill('Reply due', 'amber') : pill('Talking', 'mari');
  if (p.stage === 'committed') return pill('Signed', 'teal');
  if (p.stage === 'declined') return pill('Declined', 'brick');
  if (p.stage === 'replied') return pill('Replied', 'teal');
  if (p.stage === 'contacted') return pill('Contacted', 'ink');
  return pill('Shortlisted', 'ink');
}
function dupWarnings(f) {
  const me_ = S.session.userId;
  return festPipeline(f.id).filter((p) => p.owner !== me_ && ['contacted', 'replied', 'intro'].includes(p.stage) && inAnyList(f, p.companyId));
}

V.pipeline = () => {
  const f = myFest(), t = totals(f.id), tg = f.target || 0, flt = ui.view.pf || 'all';
  const all = festPipeline(f.id);
  const counts = STAGES.map((s) => [s[0], s[1] + ' ' + all.filter((p) => p.stage === s[0]).length]).filter((x) => all.some((p) => p.stage === x[0]));
  const shown = all.filter((p) => flt === 'all' ? true : flt === 'mine' ? p.owner === S.session.userId : p.stage === flt);
  const warn = dupWarnings(f);
  const groups = STAGES.map((s) => ({ s, items: shown.filter((p) => p.stage === s[0]) })).filter((g) => g.items.length);
  const comm = (g) => g.s[0] === 'committed' ? '<span class="cap">' + plural(g.items.length, 'deal', 'deals') + ', ' + money(g.items.reduce((a, p) => a + p.amount, 0)) + '</span>' : '<span class="cap">' + g.items.length + '</span>';
  return page('<div class="pad"><div class="row between mt12"><div class="h1">Pipeline</div><div class="stack">' + festUsers(f.id).slice(0, 4).map((m, i) => avatar(m.initials, ['', 'tl', 'bk', 'am'][i % 4])).join('') + '</div></div>' +
    '<div class="card mt16" style="padding:14px 16px"><div class="row between"><span class="cap">Confirmed</span><span class="sg" style="font-weight:700;font-size:14px">' + money(t.confirmed) + (tg ? ' of ' + money(tg) : '') + '</span></div><div class="bar mt12" style="height:9px"><i style="width:' + (tg ? Math.min(100, t.confirmed / tg * 100) : 0) + '%;background:var(--teal)"></i></div></div>' +
    (warn.length ? '<div class="banner amber"><div>' + ico('alert', 18, 'currentColor', 2) + '</div><div class="note"><b class="sg">Check before you write.</b> ' + esc(firstName(U(warn[0].owner).name)) + ' contacted ' + esc(C(warn[0].companyId).name) + ' on ' + fmtDate(warn[0].createdAt) + '.' + (warn.length > 1 ? ' ' + (warn.length - 1) + ' more like this.' : '') + '</div></div>' : '') +
    ro() +
    '<div class="mt12">' + chipRow([['all', 'All ' + all.length], ['mine', 'Mine']].concat(counts), flt, 'setPF') + '</div>' +
    (groups.length ? groups.map((g) => '<div class="row between" style="margin:18px 0 8px"><div class="sg" style="font-weight:700;font-size:14.5px">' + g.s[1] + '</div>' + comm(g) + '</div><div class="card" style="padding:6px 16px">' +
      g.items.map((p) => { const c = C(p.companyId); return '<a class="lr" href="#/' + (p.stage === 'committed' ? 'deal' : 'pipe') + '/' + p.id + '">' + logo(c, 'sm') + '<div class="t"><b>' + esc(c.name) + '</b><span>' + esc(itemSub(p)) + '</span></div>' + itemPill(p) + '</a>'; }).join('') + '</div>').join('')
      : '<div class="card mt16">' + empty('Nothing here yet', 'Find a sponsor and add it to your pipeline.', '<a class="btn primary sm" href="#/find">Find sponsors</a>') + '</div>') +
    '</div>', { tab: 'pipeline' });
};
ACT.setPF = (el) => { ui.view.pf = el.dataset.v; render(); };

/* ---------- pipeline item ---------- */
V.pipe = (id) => {
  const f = myFest(), p = P(id);
  if (!p) return page(appbar('Conversation', { back: '#/pipeline' }) + empty('Not found', 'This item was removed.'), { tab: 'pipeline' });
  const c = C(p.companyId), ed = canEdit(), reveal = p.stage !== 'shortlisted';
  const i = S.intros.filter((x) => x.festId === f.id && x.companyId === c.id).sort((a, b) => b.createdAt - a.createdAt)[0];
  const members = festUsers(f.id).filter((m) => m.festRole !== 'convenor');
  const cal = p.meetingAt ? 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Sponsorship meeting: ' + f.name + ' and ' + c.name) + '&dates=' + new Date(p.meetingAt).toISOString().replace(/[-:]|\.\d{3}/g, '') + '/' + new Date(p.meetingAt + HOUR).toISOString().replace(/[-:]|\.\d{3}/g, '') : '';
  const ctl = (label, input, text) => '<div class="mt12"><div class="cap" style="margin-bottom:6px">' + label + '</div>' + (ed ? input : '<div class="sg" style="font-weight:600">' + esc(text) + '</div>') + '</div>';
  return page(appbar(c.name, { back: '#/pipeline' }) + '<div class="pad">' +
    '<div class="card row mt4">' + logo(c, 'lg') + '<div class="f1"><div class="h2">' + esc(c.name) + '</div><div class="row g8 mt8 wrap">' + itemPill(p) + vbadge(c) + '</div></div></div>' + ro() +
    '<div class="card mt16"><div class="h3">Details</div>' +
    ctl('Stage', '<select class="sel" data-change="setStage" data-id="' + p.id + '">' + STAGES.map((s) => '<option value="' + s[0] + '"' + (s[0] === p.stage ? ' selected' : '') + '>' + s[1] + '</option>').join('') + '</select>', STAGE_LABEL[p.stage]) +
    ctl('Owner', '<select class="sel" data-change="setOwner" data-id="' + p.id + '">' + members.map((m) => '<option value="' + m.id + '"' + (m.id === p.owner ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') + '</select>', U(p.owner).name) +
    ctl('Your ask in rupees', '<input class="inp" type="number" min="0" value="' + (p.ask || '') + '" data-change="setAsk" data-id="' + p.id + '">', money(p.ask)) +
    ctl('Follow up on', '<input class="inp" type="date" value="' + toDateInput(p.followUp) + '" data-change="setFollow" data-id="' + p.id + '">', p.followUp ? fmtDateY(p.followUp) : 'Not set') +
    ctl('Meeting', '<input class="inp" type="datetime-local" value="' + toDTInput(p.meetingAt) + '" data-change="setMeeting" data-id="' + p.id + '">', p.meetingAt ? fmtDT(p.meetingAt) : 'Not booked') +
    (cal ? '<a class="cap mt8" style="display:inline-block;color:var(--teal);font-weight:700" href="' + cal + '" target="_blank" rel="noopener">Add to Google Calendar</a>' : '') + '</div>' +
    '<div class="card mt16"><div class="cap">Contact</div><div class="row mt12">' + avatar(initials(c.contact.name)) + '<div><div class="sg" style="font-weight:600;font-size:15px">' + esc(c.contact.name) + '</div><div class="note">' + esc(c.contact.role) + '</div></div></div>' +
    '<div class="note mt12">Prefers ' + esc(c.contact.channel.toLowerCase()) + ', replies in about ' + c.contact.replyDays + ' days. ' + (reveal ? '<b class="sg" style="color:var(--ink)">' + esc(c.contact.email) + '</b>' : 'The address shows once you reach out.') + '</div>' +
    (ed ? '<div class="row mt12 wrap"><button class="btn ghost sm" data-act="logContact" data-id="' + p.id + '">Log a contact today</button>' + (i && i.status === 'accepted' && !p.deckSent ? '<button class="btn primary sm" data-act="deckSent" data-id="' + p.id + '">Mark deck sent</button>' : '') + '</div>' : '') + '</div>' +
    (i ? '<div class="card mt16"><div class="cap">Introduction</div><div class="row mt12">' + avatar(A(i.alumnusId).initials, 'tl') + '<div class="f1"><div class="sg" style="font-weight:600;font-size:15px">' + esc(A(i.alumnusId).name) + '</div><div class="note">' + ({ sent: 'Request sent ' + agoText(i.createdAt), seen: 'Seen ' + agoText(i.createdAt), accepted: 'Accepted ' + agoText(i.respondedAt), declined: 'Declined ' + agoText(i.respondedAt), redirected: 'Suggested ' + esc(i.redirectName || 'someone else') })[i.status] + '</div></div></div></div>' : '') +
    '<div class="card mt16"><div class="h3">Notes</div>' + (ed ? '<div class="mt12">' + txt('note.text', { rows: 2 }) + '</div><button class="btn ghost sm mt8" data-act="addNote" data-id="' + p.id + '">Add note</button>' : '') +
    (p.notes.length ? '<div class="mt12">' + p.notes.map((n) => '<div class="kv" style="display:block"><div class="note" style="color:var(--ink)">' + esc(n.text) + '</div><div class="cap">' + esc(U(n.by) ? U(n.by).name : 'Team') + ', ' + agoText(n.ts) + '</div></div>').join('') + '</div>' : '<div class="note mt8">No notes yet.</div>') + '</div>' +
    '<div class="card mt16"><div class="h3">Activity</div><div class="mt12">' + (p.activity.length ? p.activity.map((a) => '<div class="kv" style="display:block"><div class="note" style="color:var(--ink)">' + esc(a.text) + '</div><div class="cap">' + esc(U(a.by) ? U(a.by).name : 'Team') + ', ' + agoText(a.ts) + '</div></div>').join('') : '<div class="note">Nothing logged.</div>') + '</div></div>' +
    (ed && p.stage !== 'committed' ? '<button class="btn danger mt16" data-act="removePipe" data-id="' + p.id + '">Remove from pipeline</button>' : '') + '</div>', { tab: 'pipeline', hdr: false });
};
const itemById = (el) => P(el.dataset.id);
ACT.setStage = (el) => {
  const p = itemById(el), v = el.value, f = myFest();
  if (v === p.stage) return;
  if (v === 'committed') { ui.forms.cm = { id: p.id, amount: String(p.ask || ''), kind: 'cash', split: 'half', later: toDateInput(ahead(60)), items: { banner: true, stall: true, social: true, mention: false, report: true } }; render(); return openSheet('commit', {});
  }
  if (v === 'declined') { ui.forms.dc = { id: p.id, reason: DECLINE_REASONS[0] }; render(); return openSheet('decline', {}); }
  mutate(() => { p.stage = v; logAct(p, 'Moved to ' + STAGE_LABEL[v]); });
  toast('Moved to ' + STAGE_LABEL[v]);
};
ACT.setOwner = (el) => { const p = itemById(el); mutate(() => { p.owner = el.value; logAct(p, 'Owner changed to ' + U(el.value).name); }); };
ACT.setAsk = (el) => { const p = itemById(el); mutate(() => { p.ask = Math.max(0, +el.value || 0); logAct(p, 'Ask set to ' + money(p.ask)); }); };
ACT.setFollow = (el) => { const p = itemById(el); mutate(() => { p.followUp = fromDateInput(el.value); logAct(p, p.followUp ? 'Follow-up set for ' + fmtDate(p.followUp) : 'Follow-up cleared'); }); };
ACT.setMeeting = (el) => { const p = itemById(el); mutate(() => { p.meetingAt = fromDTInput(el.value); if (p.meetingAt && ['shortlisted', 'intro', 'contacted', 'replied'].includes(p.stage)) p.stage = 'meeting'; logAct(p, p.meetingAt ? 'Meeting booked for ' + fmtDT(p.meetingAt) : 'Meeting cleared'); }); };
ACT.logContact = (el) => { const p = itemById(el); mutate(() => { logAct(p, 'Logged a contact'); if (p.stage === 'shortlisted') p.stage = 'contacted'; }); toast('Logged'); };
ACT.deckSent = (el) => { const p = itemById(el); mutate(() => { p.deckSent = true; logAct(p, 'Deck sent after the introduction'); }); toast('Marked as sent'); };
ACT.addNote = (el) => { const p = itemById(el), t = (fv('note.text') || '').trim(); if (!t) return toast('Write a note first'); mutate(() => { p.notes.unshift({ id: uid('nt'), ts: Date.now(), by: S.session.userId, text: t }); logAct(p, 'Added a note'); ui.forms.note = { text: '' }; }); };
ACT.removePipe = (el) => { const p = itemById(el); mutate(() => { S.pipeline = S.pipeline.filter((x) => x.id !== p.id); }); toast('Removed'); go('#/pipeline'); };

SHEETS.decline = () => {
  const p = P(ui.forms.dc.id), c = C(p.companyId);
  return '<div class="h2">Why did ' + esc(c.name) + ' decline?</div><p class="note mt8">Patterns in the reasons show where to change the pitch.</p>' + fld('Reason', sel('dc.reason', DECLINE_REASONS)) +
    '<button class="btn primary mt20" data-act="confirmDecline">Save</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
};
ACT.confirmDecline = () => { const d = ui.forms.dc, p = P(d.id); mutate(() => { p.stage = 'declined'; p.decline = d.reason; logAct(p, 'Declined: ' + d.reason.toLowerCase()); ui.sheet = null; }); toast('Recorded'); };
const DELIV_PRESETS = [['banner', 'Logo on main stage banner'], ['stall', 'Stall space, 10 by 10 ft'], ['social', 'Three social posts'], ['mention', 'Stage mention at every show'], ['report', 'Sponsor report']];
SHEETS.commit = () => {
  const cm = ui.forms.cm, p = P(cm.id), c = C(p.companyId);
  return '<div class="h2">Record the deal with ' + esc(c.name) + '</div><p class="note mt8">Written commitments protect both sides. This is a record, not a payment: money moves directly between you and the sponsor.</p>' +
    fld('Amount in rupees (or in-kind value)', inp('cm.amount', { type: 'number', min: 0 })) + fld('Type', sel('cm.kind', [['cash', 'Cash'], ['in-kind', 'In-kind']], { rerender: true })) +
    (cm.kind === 'cash' ? fld('Payment plan', sel('cm.split', [['full', 'Full amount on signing'], ['half', '50 percent on signing, 50 percent later'], ['later', 'Full amount later']], { rerender: true })) + (cm.split !== 'full' ? fld('Later payment due', inp('cm.later', { type: 'date' })) : '') : '') +
    '<div class="cap mt16">What the fest promises</div><div class="mt8">' + DELIV_PRESETS.map((d) => '<div class="lr" data-act="cmItem" data-k="' + d[0] + '" style="padding:10px 0"><div class="ck ' + (cm.items[d[0]] ? 'done' : '') + '">' + (cm.items[d[0]] ? ico('check', 14, '#FFFCF4', 3.2) : '') + '</div><div class="t"><b style="font-weight:500">' + d[1] + '</b></div></div>').join('') + '</div>' +
    '<button class="btn primary mt16" data-act="saveCommit">Save commitment</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
};
ACT.cmItem = (el) => { const cm = ui.forms.cm; cm.items[el.dataset.k] = !cm.items[el.dataset.k]; render(); };
ACT.saveCommit = () => {
  const cm = ui.forms.cm, p = P(cm.id), f = myFest(), amt = +cm.amount;
  if (!(amt > 0)) return toast('Enter the amount');
  const names = Object.fromEntries(DELIV_PRESETS);
  mutate(() => {
    p.stage = 'committed'; p.amount = amt; p.ask = amt; p.kind = cm.kind; p.committedOn = Date.now();
    p.payments = [];
    if (cm.kind === 'cash') {
      const later = fromDateInput(cm.later) || ahead(60);
      if (cm.split === 'full') p.payments.push({ id: uid('pay'), label: 'On signing', amount: amt, due: Date.now(), paid: false });
      else if (cm.split === 'half') { p.payments.push({ id: uid('pay'), label: 'On signing', amount: Math.round(amt / 2), due: Date.now(), paid: false }); p.payments.push({ id: uid('pay'), label: 'Second instalment', amount: amt - Math.round(amt / 2), due: later, paid: false }); }
      else p.payments.push({ id: uid('pay'), label: 'Payment', amount: amt, due: later, paid: false });
    }
    p.deliverables = DELIV_PRESETS.filter((d) => cm.items[d[0]]).map((d) => ({ id: uid('dl'), text: names[d[0]], done: false, owner: firstName(U(p.owner).name), due: d[0] === 'report' ? f.start + 7 * DAY : f.start - 5 * DAY, sub: '', count: d[0] === 'social' ? { done: 0, total: 3 } : undefined }));
    logAct(p, 'Commitment recorded: ' + money(amt) + (cm.kind === 'cash' ? ' cash' : ' in-kind value')); ui.sheet = null;
  });
  toast('Commitment recorded'); go('#/deal/' + p.id);
};

/* ---------- deal record ---------- */
V.deal = (id) => {
  const f = myFest() || F((byId(S.pipeline, id) || {}).festId), p = P(id);
  if (!p || p.stage !== 'committed') return page(appbar('Deal record', { back: '#/pipeline' }) + empty('No deal here', 'Record a commitment from the pipeline first.'), { tab: 'pipeline' });
  const c = C(p.companyId), ed = canEdit();
  const done = p.deliverables.filter((d) => d.done).length;
  const sticky = '<div class="sticky"><button class="btn ghost" data-act="uploadProof" data-id="' + p.id + '">Upload proof</button><button class="btn primary" data-act="shareSponsor" data-id="' + p.id + '">Share sponsor view</button></div>';
  return page(appbar('Deal record', { back: '#/pipeline' }) + '<div class="pad">' +
    '<div class="card mt4"><div class="row">' + logo(c) + '<div class="f1"><div class="h2">' + esc(c.name) + '</div><div class="note">Committed on ' + fmtDateY(p.committedOn) + '</div></div>' + pill('Committed', 'teal') + '</div>' +
    '<div class="big mt16">' + money(p.amount) + '</div><div class="cap">' + (p.kind === 'in-kind' ? 'In-kind value, delivered at the fest' : 'Cash, ' + plural(p.payments.length, 'payment', 'payments')) + '</div>' +
    (p.payments.length ? '<div class="mt12" style="border-top:1px solid var(--line);padding-top:8px">' + p.payments.map((x) => '<div class="row between" style="padding:7px 0"><span class="note" style="color:var(--ink)">' + esc(x.label) + ', ' + fmtDate(x.due) + '</span><span class="row g8"><b class="sg" style="font-size:14px">' + money(x.amount) + '</b>' + (x.paid ? pill('Paid', 'teal') : ed ? '<button class="pill ink" style="border:none;cursor:pointer" data-act="markPaid" data-id="' + p.id + '" data-pay="' + x.id + '">Mark paid</button>' : pill(inText(x.due), 'ink')) + '</span></div>').join('') + '</div><div class="note mt8">Payments are recorded here, not processed.</div>' : '') + '</div>' + ro() +
    '<div class="card mt16"><div class="row between"><div class="cap">What the fest promised</div><div class="cap" style="color:var(--ink);font-weight:700">' + done + ' of ' + p.deliverables.length + ' done</div></div><div class="bar mt8" style="height:8px"><i style="width:' + (p.deliverables.length ? done / p.deliverables.length * 100 : 0) + '%;background:var(--teal)"></i></div><div class="mt12">' +
    p.deliverables.map((d) => '<div class="lr"><div class="ck ' + (d.done ? 'done' : '') + '" ' + (ed ? 'data-act="togDel" data-id="' + p.id + '" data-d="' + d.id + '" role="checkbox" aria-checked="' + d.done + '" tabindex="0"' : '') + '>' + (d.done ? ico('check', 14, '#FFFCF4', 3.2) : '') + '</div><div class="t"><b style="font-size:14.5px">' + esc(d.text) + '</b><span>' + esc(d.owner) + (d.due ? ', due ' + fmtDate(d.due) : '') + (d.count ? ', ' + d.count.done + ' of ' + d.count.total + ' done' : '') + (d.sub ? ', ' + esc(d.sub) : '') + '</span></div>' + (ed && d.count && !d.done ? '<button class="pill mari" style="border:none;cursor:pointer" data-act="countUp" data-id="' + p.id + '" data-d="' + d.id + '">+1</button>' : '') + '</div>').join('') + '</div>' +
    (ed ? '<button class="btn ghost sm mt12" data-act="addDeliv" data-id="' + p.id + '">Add a deliverable</button>' : '') + '</div>' +
    '<div class="card mt16"><div class="row between"><div class="cap">Proof of delivery</div>' + (ed ? '<button class="btn ghost sm" data-act="uploadProof" data-id="' + p.id + '">Add proof</button>' : '') + '</div>' +
    (p.proof.length ? '<div class="photos">' + p.proof.map((x) => '<div><img class="photo" src="' + x.img + '" alt="' + esc(x.caption) + '"><div class="cap" style="font-size:11px;margin-top:4px">' + esc(x.caption) + '</div></div>').join('') + '</div>' : '<div class="note mt8">Photos and screenshots you add here go into the sponsor report.</div>') + '</div>' +
    '<a class="btn ghost mt16" href="#/report/' + p.id + '">Sponsor report</a><div style="height:40px"></div></div>', { tab: 'pipeline', sticky, hdr: false });
};
ACT.markPaid = (el) => { const p = itemById(el), pay = p.payments.find((x) => x.id === el.dataset.pay); mutate(() => { pay.paid = true; logAct(p, 'Payment of ' + money(pay.amount) + ' marked as paid'); }); toast('Marked as paid'); };
ACT.togDel = (el) => { const p = itemById(el), d = p.deliverables.find((x) => x.id === el.dataset.d); mutate(() => { d.done = !d.done; if (d.count) d.count.done = d.done ? d.count.total : 0; logAct(p, (d.done ? 'Completed: ' : 'Reopened: ') + d.text); }); };
ACT.countUp = (el) => { const p = itemById(el), d = p.deliverables.find((x) => x.id === el.dataset.d); mutate(() => { d.count.done += 1; if (d.count.done >= d.count.total) d.done = true; logAct(p, d.text + ': ' + d.count.done + ' of ' + d.count.total); }); };
ACT.addDeliv = (el) => { ui.forms.dl = { id: el.dataset.id, text: '', due: '' }; openSheet('deliv'); };
SHEETS.deliv = () => '<div class="h2">Add a deliverable</div>' + fld('What will you deliver', inp('dl.text', { ph: 'Logo on volunteer T-shirts' })) + fld('Due date', inp('dl.due', { type: 'date' })) + '<button class="btn primary mt20" data-act="saveDeliv">Add</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.saveDeliv = () => { const d = ui.forms.dl, p = P(d.id); if (!d.text.trim()) return toast('Describe the deliverable'); mutate(() => { p.deliverables.push({ id: uid('dl'), text: d.text.trim(), done: false, owner: firstName(me().name), due: fromDateInput(d.due), sub: '' }); logAct(p, 'Added deliverable: ' + d.text.trim()); ui.sheet = null; }); };
ACT.uploadProof = (el) => { const p = P(el.dataset.id); ui.forms.pf2 = { id: p.id, caption: '', img: '' }; openSheet('proofUp'); };
SHEETS.proofUp = () => {
  const x = ui.forms.pf2;
  return '<div class="h2">Add proof of delivery</div><p class="note mt8">A photo or screenshot of the banner, stall, post or stage mention.</p>' +
    '<label class="fld"><span>Photo</span><input class="inp" type="file" accept="image/*" data-file="proofFile"></label>' + (x.img ? '<img class="photo mt12" src="' + x.img + '" alt="Preview" style="max-height:200px">' : '') +
    fld('Caption', inp('pf2.caption', { ph: 'Logo on the main stage banner' })) + '<button class="btn primary mt20 ' + (x.img ? '' : 'off') + '" data-act="saveProof">Save proof</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
};
ACT.proofFile = (el) => { const file = el.files && el.files[0]; if (!file) return; readImage(file, (d) => { ui.forms.pf2.img = d; render(); }); };
ACT.saveProof = () => { const x = ui.forms.pf2, p = P(x.id); mutate(() => { p.proof.push({ id: uid('pr'), img: x.img, caption: x.caption.trim() || 'Proof of delivery', ts: Date.now() }); logAct(p, 'Added proof: ' + (x.caption.trim() || 'photo')); ui.sheet = null; }); toast('Proof saved'); };
const shareKey = (id) => (SERVER ? (P(id) || {}).shareToken || id : id);
ACT.shareSponsor = (el) => { ui.forms.share = { id: el.dataset.id }; openSheet('share'); };
SHEETS.share = () => {
  const url = location.href.split('#')[0] + '#/sponsor/' + shareKey(ui.forms.share.id);
  return '<div class="h2">Share with the sponsor</div><p class="note mt8">A read-only page that shows deliverables, payments and proof. No login needed.</p><textarea class="txt mt12" readonly rows="3" style="min-height:70px;font-family:monospace;font-size:12px">' + esc(url) + '</textarea>' +
    '<div class="row mt12"><button class="btn primary" data-act="copyShare">Copy link</button><a class="btn ghost" href="#/sponsor/' + shareKey(ui.forms.share.id) + '">Preview</a></div>' + (SERVER ? '<p class="note mt12">Anyone with this link can see the deliverables and proof for this sponsorship. Do not share it publicly.</p>' : '<p class="note mt12">In this demo the link opens on this device only. Live links need the live backend.</p>');
};
ACT.copyShare = () => copyText(location.href.split('#')[0] + '#/sponsor/' + shareKey(ui.forms.share.id)).then((ok) => toast(ok ? 'Link copied' : 'Select the link and copy it'));

/* ---------- sponsor view and report ---------- */
function sponsorMarkup(p, f, c) {
  const done = p.deliverables.filter((d) => d.done).length;
  return '<div class="hdr"><div class="brand"><i></i>SponsrMitra</div><span class="cap">Sponsor view</span></div><main class="pad">' +
    '<div class="h1 mt20">' + esc(f.name) + '</div><div class="note mt4">' + esc(f.college) + ', ' + esc(f.city) + '. Starts ' + fmtDateY(f.start) + '.</div>' +
    '<div class="card mt16"><div class="row">' + logo(c) + '<div class="f1"><div class="h2">' + esc(c.name) + '</div><div class="note">Your sponsorship: ' + money(p.amount) + (p.kind === 'in-kind' ? ' in-kind value' : ' cash') + '</div></div></div></div>' +
    '<div class="card mt16"><div class="row between"><div class="cap">Deliverables</div><div class="cap" style="color:var(--ink);font-weight:700">' + done + ' of ' + p.deliverables.length + ' done</div></div><div class="bar mt8" style="height:8px"><i style="width:' + (p.deliverables.length ? done / p.deliverables.length * 100 : 0) + '%;background:var(--teal)"></i></div><div class="mt12">' +
    p.deliverables.map((d) => '<div class="lr"><div class="ck ' + (d.done ? 'done' : '') + '" style="cursor:default">' + (d.done ? ico('check', 14, '#FFFCF4', 3.2) : '') + '</div><div class="t"><b style="font-size:14.5px">' + esc(d.text) + '</b><span>' + (d.done ? 'Done' : d.due ? 'Due ' + fmtDate(d.due) : 'Planned') + (d.count ? ', ' + d.count.done + ' of ' + d.count.total : '') + '</span></div></div>').join('') + '</div></div>' +
    (p.payments.length ? '<div class="card mt16"><div class="cap">Payment schedule</div>' + p.payments.map((x) => '<div class="kv"><span>' + esc(x.label) + ', ' + fmtDate(x.due) + '</span><b>' + money(x.amount) + ' ' + (x.paid ? '(paid)' : '(due)') + '</b></div>').join('') + '</div>' : '') +
    (p.proof.length ? '<div class="card mt16"><div class="cap">Proof of delivery</div><div class="photos">' + p.proof.map((x) => '<div><img class="photo" src="' + x.img + '" alt="' + esc(x.caption) + '"><div class="cap" style="font-size:11px;margin-top:4px">' + esc(x.caption) + '</div></div>').join('') + '</div></div>' : '') +
    '<p class="note mt20" style="text-align:center">Powered by SponsrMitra</p></main>';
}
const sponsorGone = '<div class="pad"><div class="empty"><div class="h2">Link not found</div><div class="note">This sponsor page is not available.</div></div></div>';
V.sponsor = (id) => {
  if (SERVER) {
    const st = ui.view.sp && ui.view.sp[id];
    if (st === undefined) { loadSponsor(id); return '<div class="pad"><div class="empty"><div class="note">Loading…</div></div></div>'; }
    if (st === 'loading') return '<div class="pad"><div class="empty"><div class="note">Loading…</div></div></div>';
    if (st === null) return sponsorGone;
    return sponsorMarkup(Object.assign({ deliverables: [], payments: [], proof: [] }, st.item), st.fest, st.company);
  }
  const p = P(id);
  if (!p || p.stage !== 'committed') return sponsorGone;
  return sponsorMarkup(p, F(p.festId), C(p.companyId));
};
V.report = (id) => {
  const p = P(id);
  if (!p) return page(empty('Report not found', ''), { nav: false });
  const f = F(p.festId), c = C(p.companyId), done = p.deliverables.filter((d) => d.done), open = p.deliverables.filter((d) => !d.done);
  return page(appbar('Sponsor report', { back: me().role === 'fest' ? '#/deal/' + id : '#/b/deals' }) + '<div class="pad"><div class="docpage"><div class="sg" style="font-weight:700;font-size:13px;color:#7A3E0C">Sponsor report</div><h1 class="sg" style="font-size:26px;margin:6px 0 4px">' + esc(f.name) + ' and ' + esc(c.name) + '</h1>' +
    '<p style="font-size:14px;color:#5A5445">' + esc(f.college) + ', ' + esc(f.city) + '. ' + fmtDateY(f.start) + '.</p>' +
    '<h2 class="sg" style="font-size:16px;margin-top:18px">Summary</h2><p style="font-size:14.5px;line-height:1.5">Thank you for supporting ' + esc(f.name) + ' with ' + money(p.amount) + (p.kind === 'in-kind' ? ' in kind' : '') + '. We expected about ' + f.visitors.toLocaleString('en-IN') + ' visitors (' + esc(f.proof && f.proof.footfall ? f.proof.footfall.kind : 'estimated') + '). ' + done.length + ' of ' + p.deliverables.length + ' promised items have been delivered.</p>' +
    '<h2 class="sg" style="font-size:16px;margin-top:18px">Delivered</h2><ul style="padding-left:18px;font-size:14.5px;line-height:1.6">' + (done.length ? done.map((d) => '<li>' + esc(d.text) + (d.count ? ' (' + d.count.done + ' of ' + d.count.total + ')' : '') + '</li>').join('') : '<li>Nothing delivered yet</li>') + '</ul>' +
    (open.length ? '<h2 class="sg" style="font-size:16px;margin-top:18px">Still to come</h2><ul style="padding-left:18px;font-size:14.5px;line-height:1.6">' + open.map((d) => '<li>' + esc(d.text) + (d.due ? ', due ' + fmtDate(d.due) : '') + '</li>').join('') + '</ul>' : '') +
    (p.proof.length ? '<h2 class="sg" style="font-size:16px;margin-top:18px">Proof</h2><div class="photos">' + p.proof.map((x) => '<div><img class="photo" src="' + x.img + '" alt="' + esc(x.caption) + '"><div style="font-size:11px;margin-top:4px">' + esc(x.caption) + '</div></div>').join('') + '</div>' : '') + '</div>' +
    '<button class="btn primary noprint" onclick="window.print()">Print or save as PDF</button><div style="height:40px"></div></div>', { tab: me().role === 'fest' ? 'pipeline' : 'deals', hdr: false });
};

/* ---------- alumni tab ---------- */
V.alumni = () => {
  const f = myFest(), intros = S.intros.filter((i) => i.festId === f.id).sort((a, b) => b.createdAt - a.createdAt);
  const al = S.alumni.filter((a) => a.college === f.college && a.status === 'verified');
  const byCo = {}; al.forEach((a) => { (byCo[a.companyId] = byCo[a.companyId] || []).push(a); });
  const label = { sent: ['Waiting', 'ink'], seen: ['Seen', 'ink'], accepted: ['Accepted', 'teal'], declined: ['Declined', 'brick'], redirected: ['Redirected', 'amber'] };
  return page('<div class="pad"><div class="h1 mt12">Alumni</div><p class="note mt8">Warm introductions get answered far more than cold messages.</p>' +
    '<div class="sec"><div class="h3">Your introduction requests</div></div>' +
    (intros.length ? '<div class="card" style="padding:6px 16px">' + intros.map((i) => { const a = A(i.alumnusId), c = C(i.companyId), p = stageOfFest(f.id, i.companyId); return '<a class="lr" href="' + (p ? '#/pipe/' + p.id : '#/company/' + c.id) + '">' + avatar(a.initials, 'tl') + '<div class="t"><b>' + esc(a.name) + ' at ' + esc(c.name) + '</b><span>' + (i.status === 'sent' || i.status === 'seen' ? 'Waiting ' + Math.max(0, daysSince(i.createdAt)) + ' days' : i.status === 'redirected' ? 'Suggested ' + esc(i.redirectName || 'someone else') : agoText(i.respondedAt)) + '</span></div>' + pill(label[i.status][0], label[i.status][1]) + '</a>'; }).join('') + '</div>' : '<div class="card">' + empty('No requests yet', 'Pick a company and ask an alumnus to introduce you.') + '</div>') +
    '<div class="sec"><div class="h3">Alumni from ' + esc(f.college) + '</div></div>' +
    (al.length ? Object.keys(byCo).map((cid) => { const c = C(cid); return '<div class="card mt8"><a class="row" href="#/company/' + cid + '">' + logo(c, 'sm') + '<div class="f1 sg" style="font-weight:700">' + esc(c.name) + '</div>' + ico('chev', 16, 'currentColor', 2) + '</a><div class="mt8">' + byCo[cid].map((a) => '<div class="lr" style="padding:9px 0">' + avatar(a.initials, 'sm') + '<div class="t"><b style="font-size:14px">' + esc(a.name) + ', ' + a.cohort + '</b><span>' + esc(a.role) + '. ' + (a.helps === 'introduce' ? 'Introduces' : 'Advises only') + '</span></div></div>').join('') + '</div></div>'; }).join('') : '<div class="card">' + empty('No alumni from your college yet', 'Ask your alumni cell to sign up. Alumni can join in a minute and set how many requests they take.', '<button class="btn ghost sm" data-act="inviteAlumni">Copy invite link</button>') + '</div>') + '</div>', { tab: 'alumni' });
};
ACT.inviteAlumni = () => copyText(location.href.split('#')[0]).then((ok) => toast(ok ? 'Invite link copied' : 'Copy the page address to invite alumni'));

/* ---------- profile ---------- */
V.profile = () => {
  const f = myFest(), u = me();
  const row = (href, icon, title, sub) => '<a class="lr" href="' + href + '">' + '<div class="avatar" style="border:none">' + ico(icon, 18, 'currentColor', 2) + '</div><div class="t"><b>' + title + '</b><span>' + sub + '</span></div>' + ico('chev', 18, 'currentColor', 2) + '</a>';
  return page('<div class="pad"><div class="row mt12">' + avatar(u.initials, 'lg') + '<div class="f1"><div class="h2">' + esc(u.name) + '</div><div class="note">' + esc(u.title) + '</div></div></div>' +
    '<div class="card mt16"><div class="row between"><div class="h3">' + esc(f.name) + '</div>' + (f.status === 'verified' ? '<span class="verified">' + ico('check', 12, 'currentColor', 3) + ' Verified</span>' : '<span class="verified stale">' + ico('clock', 12, 'currentColor', 2.6) + ' Pending</span>') + '</div>' +
    '<div class="kv"><span>College</span><b>' + esc(f.college) + '</b></div><div class="kv"><span>City and type</span><b>' + esc(f.city) + ', ' + esc(f.type) + '</b></div><div class="kv"><span>Expected visitors</span><b>' + f.visitors.toLocaleString('en-IN') + '</b></div><div class="kv"><span>Starts</span><b>' + fmtDateY(f.start) + '</b></div>' +
    (canEdit() ? '<button class="btn ghost sm mt12" data-act="editFest">Edit fest profile</button>' : '') + '</div>' + unverifiedBanner(f) +
    '<div class="card mt16" style="padding:6px 16px">' + row('#/proof', 'camera', 'Proof pack', proofComplete(f) ? 'Complete' : 'Incomplete. Add footfall photos') + row('#/packages', 'list', 'Sponsorship packages', plural(f.packages.length, 'tier', 'tiers')) + row('#/templates', 'mail', 'Email templates', 'First contact, follow-up and more') + row('#/deck', 'file', 'Pitch deck', 'Generated from your profile') + row('#/archive', 'clock', 'Archive and handover', 'Past editions and the handover checklist') + '</div>' +
    '<div class="card mt16"><div class="h3">Team</div>' + festUsers(f.id).map((m) => '<div class="lr" style="padding:10px 0">' + avatar(m.initials, 'sm') + '<div class="t"><b>' + esc(m.name) + '</b><span>' + (m.festRole === 'lead' ? 'Sponsorship lead' : m.festRole === 'convenor' ? 'Convenor, view only' : 'Team member') + '</span></div></div>').join('') + '<button class="btn ghost sm mt12" data-act="inviteTeam">Copy invite link</button></div>' +
    '<div class="card mt16"><div class="h3">Your data</div><p class="note mt8">Export your pipeline or bring in an existing list.</p><div class="row mt12 wrap"><button class="btn ghost sm" data-act="exportCSV">Export pipeline CSV</button><button class="btn ghost sm ' + (canEdit() ? '' : 'off') + '" data-act="openImport">Import a list</button></div></div>' +
    privacyCard() + '<div style="height:20px"></div></div>', { tab: 'profile' });
};
ACT.editFest = () => { const f = myFest(); ui.forms.ef = { name: f.name, college: f.college, city: f.city, type: f.type, visitors: String(f.visitors), start: toDateInput(f.start), audience: f.audience }; openSheet('editFest'); };
SHEETS.editFest = () => '<div class="h2">Edit fest profile</div>' + fld('Fest name', inp('ef.name')) + fld('College', inp('ef.college')) + fld('City', inp('ef.city')) + fld('Type', sel('ef.type', FEST_TYPES)) + fld('Expected visitors', inp('ef.visitors', { type: 'number' })) + fld('Start date', inp('ef.start', { type: 'date' })) + fld('Who attends', txt('ef.audience', { rows: 2 })) + '<button class="btn primary mt20" data-act="saveFest">Save</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.saveFest = () => { const f = myFest(), e = ui.forms.ef; if (!need(e, ['name', 'college', 'city', 'visitors', 'start'])) return toast('Fill in every field'); mutate(() => { Object.assign(f, { name: e.name.trim(), college: e.college.trim(), city: e.city.trim(), type: e.type, visitors: +e.visitors, start: fromDateInput(e.start), audience: e.audience.trim() }); ui.sheet = null; }); toast('Profile updated'); };
ACT.exportCSV = () => {
  const f = myFest();
  const rows = [['Company', 'Stage', 'Owner', 'Ask', 'Amount', 'Contact', 'Last touch']].concat(festPipeline(f.id).map((p) => [C(p.companyId).name, STAGE_LABEL[p.stage], U(p.owner).name, p.ask, p.amount, C(p.companyId).contact.name, fmtDateY(p.lastTouch)]));
  showText('Pipeline CSV', rows.map((r) => r.map(csvEscape).join(',')).join('\n'), f.name.replace(/\s+/g, '-').toLowerCase() + '-pipeline.csv');
};
ACT.openImport = () => { ui.forms.imp = { text: 'Company name\n' }; openSheet('import'); };
SHEETS.import = () => '<div class="h2">Import a list</div><p class="note mt8">Paste rows from your spreadsheet. The first column should be the company name. Verified companies are matched by name and added as shortlisted.</p>' + fld('Rows', txt('imp.text', { rows: 7 })) + '<button class="btn primary mt16" data-act="doImport">Import</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.doImport = () => {
  const f = myFest(), rows = parseCSV(ui.forms.imp.text).filter((r, i) => !(i === 0 && /company|name/i.test(r[0] || '')));
  let added = 0, dup = 0; const miss = [];
  mutate(() => {
    rows.forEach((r) => { const n = (r[0] || '').trim().toLowerCase(); if (!n) return; const c = S.companies.find((x) => x.status === 'verified' && x.name.toLowerCase() === n); if (!c) { miss.push(r[0]); return; } if (stageOfFest(f.id, c.id)) { dup++; return; } addToPipeline(f, c.id, 'shortlisted'); added++; });
    ui.sheet = null;
  });
  toast(added + ' added' + (dup ? ', ' + dup + ' already in the pipeline' : '') + (miss.length ? ', ' + miss.length + ' not found' : ''));
};

/* ---------- proof pack, packages, templates, deck, archive ---------- */
V.proof = () => {
  const f = myFest(), p = f.proof, ed = canEdit();
  if (!ui.forms.pr) ui.forms.pr = { n: String(p.footfall ? p.footfall.n : ''), kind: p.footfall ? p.footfall.kind : 'self-reported', logo: '' };
  return page(appbar('Proof pack', { back: '#/profile' }) + '<div class="pad">' + (proofComplete(f) ? '<div class="banner teal"><div class="note"><b class="sg">Complete.</b> Sponsors see this with every request.</div></div>' : '<div class="banner amber"><div>' + ico('alert', 18, 'currentColor', 2) + '</div><div class="note">Sponsors ask for proof. Add a footfall figure, at least one photo and one past sponsor.</div></div>') + ro() +
    '<div class="card mt16"><div class="h3">Footfall</div>' + fld('Visitors last edition', inp('pr.n', { type: 'number', min: 0 })) + fld('How do you know', sel('pr.kind', [['self-reported', 'Self-reported'], ['evidenced', 'Evidenced, with ticket or gate data']])) + '<button class="btn ghost sm mt12 ' + (ed ? '' : 'off') + '" data-act="saveFoot">Save footfall</button></div>' +
    '<div class="card mt16"><div class="row between"><div class="h3">Photos</div><label class="btn ghost sm ' + (ed ? '' : 'off') + '" style="cursor:pointer">Add photo<input type="file" accept="image/*" data-file="festPhoto" style="display:none"></label></div>' +
    (p.photos.length ? '<div class="photos">' + p.photos.map((x, i) => (x.length > 5 ? '<div><img class="photo" src="' + x + '" alt="Fest photo ' + (i + 1) + '">' + (ed ? '<button class="cap" style="border:none;background:none;color:var(--brick);cursor:pointer;margin-top:4px" data-act="delPhoto" data-i="' + i + '">Remove</button>' : '') + '</div>' : '')).join('') + '</div>' : '<div class="note mt8">No photos yet.</div>') + '</div>' +
    '<div class="card mt16"><div class="h3">Past sponsors</div><div class="row g6 wrap mt12">' + (p.logos.length ? p.logos.map((l, i) => '<span class="chip row g6" style="cursor:default">' + esc(l) + (ed ? '<button style="border:none;background:none;cursor:pointer;display:flex" data-act="delLogo" data-i="' + i + '" aria-label="Remove ' + esc(l) + '">' + ico('x', 12, 'currentColor', 2.6) + '</button>' : '') + '</span>').join('') : '<span class="note">None yet.</span>') + '</div>' +
    '<div class="row mt12">' + '<div class="f1">' + inp('pr.logo', { ph: 'Company name' }) + '</div><button class="btn primary sm ' + (ed ? '' : 'off') + '" data-act="addLogo">Add</button></div></div></div>', { tab: 'profile', nav: false });
};
ACT.saveFoot = () => { const f = myFest(), pr = ui.forms.pr; if (!(+pr.n > 0)) return toast('Enter a number'); mutate(() => { f.proof.footfall = { n: +pr.n, kind: pr.kind }; }); toast('Saved'); };
ACT.festPhoto = (el) => { const f = myFest(), file = el.files && el.files[0]; if (!file) return; readImage(file, (d) => mutate(() => { f.proof.photos = f.proof.photos.filter((x) => x.length > 5).concat([d]); })); };
ACT.delPhoto = (el) => { const f = myFest(); mutate(() => { f.proof.photos.splice(+el.dataset.i, 1); }); };
ACT.addLogo = () => { const f = myFest(), n = (fv('pr.logo') || '').trim(); if (!n) return toast('Type a company name'); mutate(() => { f.proof.logos.push(n); ui.forms.pr.logo = ''; }); };
ACT.delLogo = (el) => { const f = myFest(); mutate(() => { f.proof.logos.splice(+el.dataset.i, 1); }); };

V.packages = () => {
  const f = myFest(), ed = canEdit();
  return page(appbar('Sponsorship packages', { back: '#/profile' }) + '<div class="pad">' + ro() + (f.packages.length ? f.packages.map((k) => '<div class="card mt12"><div class="row between"><div class="h3">' + esc(k.name) + '</div><b class="sg" style="font-size:14px">' + esc(k.price) + '</b></div><p class="note mt8">' + esc(k.benefits) + '</p>' + (ed ? '<div class="row mt12"><button class="btn ghost sm" data-act="editPkg" data-id="' + k.id + '">Edit</button><button class="btn danger sm" data-act="delPkg" data-id="' + k.id + '">Delete</button></div>' : '') + '</div>').join('') : '<div class="card mt12">' + empty('No packages yet', 'Define tiers so sponsors can choose.') + '</div>') + (ed ? '<button class="btn primary mt16" data-act="editPkg" data-id="">Add a tier</button>' : '') + '</div>', { tab: 'profile', nav: false });
};
ACT.editPkg = (el) => { const f = myFest(), k = f.packages.find((x) => x.id === el.dataset.id); ui.forms.pk = k ? { id: k.id, name: k.name, price: k.price, benefits: k.benefits } : { id: '', name: '', price: '', benefits: '' }; openSheet('pkg'); };
SHEETS.pkg = () => '<div class="h2">' + (ui.forms.pk.id ? 'Edit tier' : 'Add a tier') + '</div>' + fld('Name', inp('pk.name', { ph: 'Associate sponsor' })) + fld('Price range', inp('pk.price', { ph: '₹1,00,000 to ₹2,00,000' })) + fld('Benefits', txt('pk.benefits', { rows: 3 })) + '<button class="btn primary mt20" data-act="savePkg">Save</button><button class="btn ghost mt12" data-act="closeSheet">Cancel</button>';
ACT.savePkg = () => { const f = myFest(), k = ui.forms.pk; if (!need(k, ['name', 'price'])) return toast('Add a name and a price'); mutate(() => { if (k.id) Object.assign(f.packages.find((x) => x.id === k.id), { name: k.name.trim(), price: k.price.trim(), benefits: k.benefits.trim() }); else f.packages.push({ id: uid('pk'), name: k.name.trim(), price: k.price.trim(), benefits: k.benefits.trim() }); ui.sheet = null; }); };
ACT.delPkg = (el) => { const f = myFest(); mutate(() => { f.packages = f.packages.filter((x) => x.id !== el.dataset.id); }); };

const TEMPLATES = [
  ['first', 'First contact', 'Subject: Sponsorship opportunity: {fest} at {college}\n\nHello {contact},\n\nI’m {sender}, sponsorship lead for {fest} at {college}. We expect about {visitors} visitors and think {company} would reach exactly the audience it wants. Our deck and proof pack are attached.\n\nWould you be open to a 15 minute call this week?\n\nThank you,\n{sender}'],
  ['follow', 'Follow-up', 'Subject: Following up on {fest}\n\nHello {contact},\n\nA quick follow-up on my note about {fest}. I know your inbox is full, so here is the one-line version: {visitors} students, {company} visible on the main stage and at our stalls.\n\nCould we find ten minutes this week?\n\nThank you,\n{sender}'],
  ['meet', 'Meeting request', 'Subject: Ten minutes on {fest}?\n\nHello {contact},\n\nThank you for your interest in {fest}. Could we meet on a short call to walk through the packages and find the one that suits {company}? I can adapt to your time.\n\nThank you,\n{sender}'],
  ['thanks', 'Thank-you after a yes', 'Subject: Thank you, {company}\n\nHello {contact},\n\nThank you for backing {fest}. I’ll send the written commitment, the deliverables list and the payment schedule today so everything is clear for both of us.\n\nWith thanks,\n{sender}'],
  ['decline', 'Reply to a decline', 'Subject: Thank you for considering {fest}\n\nHello {contact},\n\nThank you for letting us know. If budget or timing changes, we would love to stay in touch, and we’ll reach out early next year before your planning cycle.\n\nWarm regards,\n{sender}'],
];
V.templates = () => {
  const f = myFest(), ps = festPipeline(f.id);
  if (!ui.forms.tp) ui.forms.tp = { t: 'first', cid: ps.length ? ps[0].companyId : S.companies[0].id };
  const tp = ui.forms.tp, c = C(tp.cid), t = TEMPLATES.find((x) => x[0] === tp.t);
  const body = t[2].replace(/{fest}/g, f.name).replace(/{college}/g, f.college).replace(/{contact}/g, firstName(c.contact.name)).replace(/{company}/g, c.name).replace(/{visitors}/g, f.visitors.toLocaleString('en-IN')).replace(/{sender}/g, me().name);
  ui.forms.tpBody = body;
  return page(appbar('Email templates', { back: '#/profile' }) + '<div class="pad">' + chipRow(TEMPLATES.map((x) => [x[0], x[1]]), tp.t, 'setTpl') +
    fld('Fill in for', sel('tp.cid', S.companies.filter((x) => x.status === 'verified').map((x) => [x.id, x.name]), { rerender: true })) +
    '<div class="card mt16"><pre style="white-space:pre-wrap;font-family:inherit;font-size:14.5px;line-height:1.5">' + esc(body) + '</pre></div><button class="btn primary mt16" data-act="copyTpl">Copy text</button></div>', { tab: 'profile', nav: false });
};
ACT.setTpl = (el) => { ui.forms.tp.t = el.dataset.v; render(); };
ACT.copyTpl = () => copyText(ui.forms.tpBody).then((ok) => toast(ok ? 'Copied' : 'Select the text and copy it'));

V.deck = () => {
  const f = myFest(), p = f.proof, t = totals(f.id);
  const slides = [
    '<h2>' + esc(f.name) + '</h2><p>' + esc(f.college) + ', ' + esc(f.city) + '</p><p>' + fmtDateY(f.start) + '. ' + esc(f.type) + ' fest.</p>',
    '<h2>Who attends</h2><p>' + esc(f.audience) + '</p><p><b>' + f.visitors.toLocaleString('en-IN') + '</b> expected visitors' + (p.footfall ? ' (' + esc(p.footfall.kind) + ')' : '') + '.</p>',
    '<h2>Sponsorship packages</h2><ul>' + (f.packages.length ? f.packages.map((k) => '<li><b>' + esc(k.name) + '</b>, ' + esc(k.price) + '. ' + esc(k.benefits) + '</li>').join('') : '<li>Add tiers under Profile</li>') + '</ul>',
    '<h2>Who has backed us</h2><p>' + (p.logos.length ? p.logos.map(esc).join(', ') : 'Add past sponsors in your proof pack.') + '</p>' + (t.confirmed ? '<p>' + money(t.confirmed) + ' already confirmed for this edition.</p>' : ''),
    '<h2>Let’s talk</h2><p>' + esc(me().name) + ', ' + esc(f.name) + '</p><p>We would love to build a partnership that works for ' + esc('your brand') + '.</p>',
  ];
  return page(appbar('Pitch deck', { back: '#/profile' }) + '<div class="pad"><p class="note mt4">Built from your fest profile, packages and proof pack. Update those and the deck updates.</p>' + slides.map((s) => '<div class="slide">' + s + '</div>').join('') + '<button class="btn primary mt16 noprint" onclick="window.print()">Print or save as PDF</button><div style="height:30px"></div></div>', { tab: 'profile', nav: false });
};

V.archive = () => {
  const f = myFest(), eds = S.archive.filter((a) => a.festId === f.id), ho = f.handover || {};
  const steps = [['close', 'Close open conversations or note why they stopped'], ['contacts', 'Update contacts and add notes for next year'], ['owners', 'Add the next team as owners']];
  const yr = new Date(f.start).getFullYear(), saved = S.archive.some((a) => a.festId === f.id && a.year === yr);
  return page(appbar('Archive and handover', { back: '#/profile' }) + '<div class="pad">' +
    '<div class="card mt8"><div class="h3">Save this edition</div><p class="note mt8">After the fest, save every company you approached and how it ended, so next year’s team starts from your work.</p>' + (saved ? '<div class="banner teal"><div class="note">This edition is already saved.</div></div>' : '<button class="btn primary mt12 ' + (canEdit() ? '' : 'off') + '" data-act="archiveEdition">Save ' + esc(f.name) + ' to the archive</button>') + '</div>' +
    '<div class="card mt16"><div class="h3">Handover checklist</div><p class="note mt8">So next year’s lead starts from your work, not from zero.</p><div class="mt8">' + steps.map((s) => '<div class="lr" data-act="togHandover" data-k="' + s[0] + '" style="padding:10px 0"><div class="ck ' + (ho[s[0]] ? 'done' : '') + '">' + (ho[s[0]] ? ico('check', 14, '#FFFCF4', 3.2) : '') + '</div><div class="t"><b style="font-weight:500">' + s[1] + '</b></div></div>').join('') + '</div></div>' +
    (eds.length ? eds.map((a) => '<div class="card mt16"><div class="row between"><div class="h3">' + esc(a.name) + '</div><b class="sg" style="font-size:14px">' + money(a.items.reduce((x, i) => x + i.amount, 0)) + '</b></div><div class="mt8">' + a.items.map((i) => '<a class="lr" href="#/company/' + i.companyId + '" style="padding:10px 0"><div class="t"><b style="font-size:14px">' + esc(i.name) + '</b><span>' + esc(i.note) + '</span></div>' + pill(i.outcome, i.outcome === 'Committed' ? 'teal' : i.outcome === 'Declined' ? 'brick' : 'ink') + '</a>').join('') + '</div></div>').join('') : '<div class="card mt16">' + empty('No past editions yet', 'When your fest ends, its pipeline is saved here for next year’s team.') + '</div>') + '</div>', { tab: 'profile', nav: false });
};
ACT.archiveEdition = () => {
  const f = myFest(), yr = new Date(f.start).getFullYear();
  if (S.archive.some((a) => a.festId === f.id && a.year === yr)) return toast('Already saved');
  const items = festPipeline(f.id).map((p) => { const c = C(p.companyId); return { companyId: c.id, name: c.name, outcome: p.stage === 'committed' ? 'Committed' : p.stage === 'declined' ? 'Declined' : 'No reply', amount: p.stage === 'committed' ? p.amount : 0, contact: c.contact.name, note: p.stage === 'declined' ? (p.decline || 'Declined') : (p.notes[0] ? p.notes[0].text : '') }; });
  if (!items.length) return toast('Your pipeline is empty');
  mutate(() => { S.archive.push({ id: uid('ar'), festId: f.id, year: yr, name: f.name, items }); });
  toast('Edition saved to the archive');
};
ACT.togHandover = (el) => { const f = myFest(); if (!canEdit()) return toast('View-only access'); mutate(() => { f.handover = f.handover || {}; f.handover[el.dataset.k] = !f.handover[el.dataset.k]; }); };
