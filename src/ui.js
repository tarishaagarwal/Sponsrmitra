/* ===== UI core ===== */
const ui = { sheet: null, forms: {}, view: {} };
const ACT = {};
const SHEETS = {};
const V = {};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const lk = (v) => '₹' + (Math.round(v * 100) / 100) + 'L';
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
const fmtDateY = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtDT = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const agoText = (ms) => { const d = daysSince(ms); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; };
const inText = (ms) => { const d = Math.ceil((ms - Date.now()) / DAY); return d < 0 ? Math.abs(d) + ' days overdue' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days'; };
const toDateInput = (ms) => { if (!ms) return ''; const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fromDateInput = (s) => (s ? new Date(s + 'T12:00:00').getTime() : null);
const toDTInput = (ms) => { if (!ms) return ''; const d = new Date(ms); return toDateInput(ms) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const fromDTInput = (s) => (s ? new Date(s).getTime() : null);
const initials = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);

const ICONS = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  search: 'M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM16 16l5 5',
  pipeline: 'M4 4h4.5v16H4zM9.75 4h4.5v10h-4.5zM15.5 4H20v13h-4.5z',
  alumni: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5M16.5 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .6 3.5 2.3 3.5 5.2',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
  back: 'M15 5l-7 7 7 7', chev: 'M9 5l7 7-7 7', check: 'M5 12.5l4.5 4.5L19 7.5', x: 'M6 6l12 12M18 6 6 18',
  bookmark: 'M6 4h12v17l-6-4.5L6 21z', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  alert: 'M12 3.5l10 17.5H2zM12 10.5v4.5M12 18v.4', file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  upload: 'M12 16V5M7 9.5 12 5l5 4.5M5 19h14', share: 'M8 12l8-5M8 12l8 5M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  bell: 'M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9zM10 20a2 2 0 0 0 4 0',
  plus: 'M12 5v14M5 12h14', filter: 'M4 6h16M7 12h10M10 18h4', copy: 'M9 9h10v11H9zM5 15V4h10',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5', flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  building: 'M5 21V4h9v17M14 9h5v12M8 8h3M8 12h3M8 16h3', cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  camera: 'M3 8h4l2-3h6l2 3h4v12H3zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', switch: 'M7 7h13l-3-3M17 17H4l3 3',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
};
function ico(name, size, color, sw) {
  return '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') + '" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>';
}

/* ---------- components ---------- */
const logo = (c, cls) => '<div class="logo ' + (cls || '') + '" style="background:' + esc(c.color) + '" aria-hidden="true">' + esc(c.name[0]) + '</div>';
const avatar = (init, cls) => '<div class="avatar ' + (cls || '') + '" aria-hidden="true">' + esc(init) + '</div>';
const pill = (t, cls) => '<span class="pill ' + (cls || 'ink') + '">' + esc(t) + '</span>';
const tag = (t) => '<span class="tag">' + esc(t) + '</span>';
function vbadge(c) {
  const f = freshness(c);
  const icon = f.key === 'ok' ? ico('check', 12, 'currentColor', 3) : ico('clock', 12, 'currentColor', 2.6);
  return '<span class="verified ' + (f.key === 'ok' ? '' : f.key) + '">' + icon + ' ' + f.label + '</span>';
}
const ageText = (c) => { const f = freshness(c); return f.days >= 9999 ? 'not checked yet' : f.days === 0 ? 'checked today' : f.days + ' days ago'; };
function empty(title, text, action) {
  return '<div class="empty"><div class="h2">' + esc(title) + '</div><div class="note">' + esc(text) + '</div>' + (action ? '<div class="mt16">' + action + '</div>' : '') + '</div>';
}
function fld(label, input) { return '<label class="fld"><span>' + esc(label) + '</span>' + input + '</label>'; }
const inp = (path, o) => { o = o || {}; return '<input class="inp" data-bind="' + path + '" data-keep="' + path + '" type="' + (o.type || 'text') + '" value="' + esc(getPath(ui.forms, path)) + '" placeholder="' + esc(o.ph || '') + '"' + (o.rerender ? ' data-rerender' : '') + (o.min != null ? ' min="' + o.min + '"' : '') + '>'; };
const txt = (path, o) => '<textarea class="txt" data-bind="' + path + '" data-keep="' + path + '" rows="' + ((o && o.rows) || 5) + '">' + esc(getPath(ui.forms, path)) + '</textarea>';
const sel = (path, opts, o) => '<select class="sel" data-bind="' + path + '" data-keep="' + path + '"' + (o && o.rerender ? ' data-rerender' : '') + '>' + opts.map((x) => { const v = Array.isArray(x) ? x[0] : x; const l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (String(getPath(ui.forms, path)) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>';
const toggle = (on, act, data) => '<button class="tog ' + (on ? 'on' : '') + '" role="switch" aria-checked="' + !!on + '" data-act="' + act + '" ' + (data || '') + '></button>';
function chipRow(items, active, act, extra) {
  return '<div class="chips" role="tablist">' + items.map((it) => '<button class="chip ' + (it[0] === active ? 'on' : '') + '" data-act="' + act + '" data-v="' + esc(it[0]) + '" ' + (extra || '') + '>' + esc(it[1]) + '</button>').join('') + '</div>';
}
function appbar(title, o) {
  o = o || {};
  const back = o.back ? '<a class="iconbtn" href="' + o.back + '" aria-label="Back">' + ico('back', 20, 'currentColor', 2) + '</a>' : '<span style="width:40px"></span>';
  return '<div class="appbar">' + back + '<div class="title">' + esc(title) + '</div>' + (o.right || '<span style="width:40px"></span>') + '</div>';
}
function setPath(o, path, v) { const k = path.split('.'); let t = o; for (let i = 0; i < k.length - 1; i++) { if (typeof t[k[i]] !== 'object' || t[k[i]] === null) t[k[i]] = {}; t = t[k[i]]; } t[k[k.length - 1]] = v; }
function getPath(o, path) { return path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); }
const fv = (path) => getPath(ui.forms, path);

/* ---------- navigation per role ---------- */
function navItems(u) {
  if (u.role === 'fest') return [['#/home', 'home', 'Home', 'home'], ['#/find', 'search', 'Find', 'find'], ['#/pipeline', 'pipeline', 'Pipeline', 'pipeline'], ['#/alumni', 'alumni', 'Alumni', 'alumni'], ['#/profile', 'profile', 'Profile', 'profile']];
  if (u.role === 'brand') return [['#/b/dash', 'home', 'Overview', 'dash'], ['#/b/inbox', 'inbox', 'Inbox', 'inbox'], ['#/b/fests', 'building', 'Fests', 'fests'], ['#/b/deals', 'file', 'Deals', 'deals'], ['#/b/profile', 'profile', 'Profile', 'profile']];
  if (u.role === 'alumni') return [['#/a/inbox', 'inbox', 'Requests', 'inbox'], ['#/a/profile', 'profile', 'Profile', 'profile']];
  return [['#/ad/verify', 'shield', 'Verify', 'verify'], ['#/ad/quality', 'list', 'Quality', 'quality'], ['#/ad/reports', 'flag', 'Reports', 'reports'], ['#/ad/insights', 'chart', 'Insights', 'insights'], ['#/ad/log', 'clock', 'Log', 'log']];
}
function badgeFor(u, key) {
  if (u.role === 'fest' && key === 'alumni') return S.intros.filter((i) => i.festId === u.entityId && i.status === 'accepted').filter((i) => { const p = stageOfFest(i.festId, i.companyId); return p && !p.deckSent && p.stage === 'intro'; }).length;
  if (u.role === 'brand' && key === 'inbox') return S.requests.filter((r) => r.companyId === u.entityId && r.status === 'new').length;
  if (u.role === 'alumni' && key === 'inbox') return S.intros.filter((i) => i.alumnusId === u.entityId && (i.status === 'sent' || i.status === 'seen')).length;
  if (u.role === 'admin' && key === 'verify') return adminQueue().length;
  return 0;
}
function bottomNav(u, tab) {
  return '<nav class="nav" aria-label="Main">' + navItems(u).map((n) => {
    const b = badgeFor(u, n[3]);
    return '<a href="' + n[0] + '" class="' + (n[3] === tab ? 'on' : '') + '" ' + (n[3] === tab ? 'aria-current="page"' : '') + '><span class="ic">' + ico(n[1], 22) + (b ? '<span class="bdg">' + b + '</span>' : '') + '</span>' + n[2] + '</a>';
  }).join('') + '</nav>';
}
function header(u) {
  const unread = S.notifs.filter((n) => n.userId === u.id && !n.read).length;
  return (DEMO_OK ? '<div class="demobar">Demo with made-up sample data</div>' : '') + '<header class="hdr"><div class="brand"><i></i>SponsrMitra</div><div class="hdr-r">' +
    '<button class="iconbtn" data-act="openNotifs" aria-label="Notifications">' + ico('bell', 20) + (unread ? '<span class="dotb">' + unread + '</span>' : '') + '</button>' +
    '<button class="iconbtn" data-act="openPersona" aria-label="Switch person, signed in as ' + esc(u.name) + '"><span class="sg" style="font-weight:700;font-size:13px">' + esc(u.initials) + '</span></button></div></header>';
}
function page(inner, o) {
  o = o || {};
  const u = me();
  return (o.hdr === false || o.nav === false ? '' : header(u)) + '<main id="main">' + inner + '</main>' + (o.nav === false ? '' : bottomNav(u, o.tab)) + (o.sticky || '');
}

/* ---------- render ---------- */
function currentRoute() {
  const h = (location.hash || '#/').replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  return { name: parts[0] || '', a: parts[1] || '', b: parts[2] || '', parts };
}
function defaultHash(u) {
  return u.role === 'fest' ? '#/home' : u.role === 'brand' ? '#/b/dash' : u.role === 'alumni' ? '#/a/inbox' : '#/ad/verify';
}
function render() {
  const root = document.getElementById('app');
  const act = document.activeElement;
  const keep = act && act.getAttribute ? act.getAttribute('data-keep') : null;
  const pos = keep && act.selectionStart != null ? [act.selectionStart, act.selectionEnd] : null;
  const scrollY = window.scrollY;
  let html;
  if (SERVER && ui.booting) { root.innerHTML = '<div class="pad"><div class="empty" style="padding-top:90px"><div class="brand" style="justify-content:center"><i></i>SponsrMitra</div><div class="note mt16">Connecting…</div></div></div>'; return; }
  try {
    const u = me();
    const r = currentRoute();
    if (r.name === 'sponsor' || (r.name === 'report' && u)) html = V[r.name](r.a);
    else if (!u) html = V.login();
    else {
      const key = r.name === 'b' || r.name === 'a' || r.name === 'ad' ? r.name + '/' + r.a : r.name;
      const mine = { fest: ['home', 'find', 'company', 'intro', 'pipeline', 'pipe', 'deal', 'alumni', 'profile', 'planner', 'shortlists', 'proof', 'packages', 'templates', 'deck', 'archive', 'report', 'sponsor'], brand: ['b', 'report', 'sponsor'], alumni: ['a'], admin: ['ad'] }[u.role];
      if (!mine.includes(r.name) || !V[key]) { location.replace(defaultHash(u)); return; }
      else html = V[key](r.a, r.b);
    }
  } catch (e) {
    console.error(e);
    html = '<div class="pad"><div class="empty"><div class="h2">Something went wrong</div><div class="note">' + esc(e.message) + '</div><div class="mt16"><button class="btn primary" data-act="resetDemo">Reset demo data</button></div></div></div>';
  }
  root.className = S.lite ? 'lite' : '';
  root.innerHTML = html + (ui.sheet ? renderSheet() : '');
  if (keep) { const el = root.querySelector('[data-keep="' + keep + '"]'); if (el) { el.focus(); if (pos) try { el.setSelectionRange(pos[0], pos[1]); } catch (e) { /* not a text field */ } } }
  window.scrollTo(0, scrollY);
}
function renderSheet() {
  const s = ui.sheet;
  const inner = SHEETS[s.type](s.props || {});
  return '<div class="ovl" data-act="overlay"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + inner + '</div></div>';
}
function openSheet(type, props) { ui.sheet = { type, props }; render(); }
function closeSheet() { ui.sheet = null; render(); }
function mutate(fn) {
  const before = SERVER ? syncSnapshot() : null;
  fn();
  if (SERVER) { save(); render(); pushChanges(before); return; }
  if (!save()) toast('Your device is out of storage. Remove some photos.');
  render();
}
function toast(msg) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}
function go(h) { if (location.hash === h) render(); else location.hash = h; }

/* ---------- helpers ---------- */
function copyText(text) {
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* blocked */ } ta.remove(); return ok; };
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fallback());
  return Promise.resolve(fallback());
}
function readImage(file, cb) {
  const fr = new FileReader();
  fr.onload = () => { const img = new Image(); img.onload = () => { const m = 900, k = Math.min(1, m / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.72)); }; img.onerror = () => toast('That file is not an image'); img.src = fr.result; };
  fr.readAsDataURL(file);
}
function csvEscape(v) { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function parseCSV(text) {
  const rows = []; let cur = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { cur.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; cur.push(f); rows.push(cur); cur = []; f = ''; }
    else f += ch;
  }
  if (f.length || cur.length) { cur.push(f); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
function showText(title, text, filename) {
  ui.forms.textView = { title, text, filename };
  openSheet('text', {});
}
SHEETS.text = () => {
  const t = ui.forms.textView;
  return '<div class="h2">' + esc(t.title) + '</div><textarea class="txt mt12" readonly rows="10" id="tv" style="font-family:monospace;font-size:12px">' + esc(t.text) + '</textarea>' +
    '<div class="row mt12"><button class="btn primary" data-act="tvCopy">Copy</button>' + (t.filename ? '<button class="btn ghost" data-act="tvDownload">Download file</button>' : '') + '</div>' +
    '<div class="note mt12">If a download does not start, use Copy and paste into a file.</div><button class="btn ghost mt12" data-act="closeSheet">Close</button>';
};
ACT.tvCopy = () => copyText(ui.forms.textView.text).then((ok) => toast(ok ? 'Copied' : 'Select the text and copy it'));
ACT.tvDownload = () => {
  const t = ui.forms.textView;
  try { const a = document.createElement('a'); a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(t.text); a.download = t.filename; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { toast('Use Copy instead'); }
};

/* ---------- global event wiring ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const name = el.getAttribute('data-act');
  if (name === 'overlay' && e.target !== el) return;
  const fn = ACT[name];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('input', (e) => {
  const el = e.target, b = el.getAttribute && el.getAttribute('data-bind');
  if (!b) return;
  setPath(ui.forms, b, el.type === 'checkbox' ? el.checked : el.value);
  if (el.hasAttribute('data-live')) render();
});
document.addEventListener('change', (e) => {
  const el = e.target, b = el.getAttribute && el.getAttribute('data-bind');
  const ch = el.getAttribute && el.getAttribute('data-change');
  if (ch && ACT[ch]) { ACT[ch](el, e); return; }
  if (el.type === 'file' && el.getAttribute('data-file')) { const fn = ACT[el.getAttribute('data-file')]; if (fn) fn(el, e); return; }
  if (!b) return;
  setPath(ui.forms, b, el.type === 'checkbox' ? el.checked : el.value);
  if (el.hasAttribute('data-rerender')) render();
});
window.addEventListener('hashchange', () => { ui.sheet = null; onRoute(); });
