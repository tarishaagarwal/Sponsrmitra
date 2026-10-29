/* ===== SponsrMitra data layer ===== */
const CFG = window.SPONSRMITRA_CONFIG || {};
const SERVER = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
// Sample people and companies exist only in the separate demo build, which sets this flag.
const DEMO_OK = !SERVER && !!window.SPONSRMITRA_DEMO;
const KEY = 'sponsrmitra.app.v2';
const VERSION = 2;
const DAY = 86400000;
const HOUR = 3600000;
const T0 = Date.now();
const ago = (d) => T0 - d * DAY;
const ahead = (d) => T0 + d * DAY;
const uid = (p) => p + Array.from((window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(8)) : Array.from({ length: 8 }, () => Math.floor(Math.random() * 256)), (b) => b.toString(16).padStart(2, '0')).join('');

const FEST_TYPES = ['Technical', 'Cultural', 'Management', 'Sports', 'Society or department'];
const SIZE_BANDS = [
  { k: 'xs', label: 'Under 1K', mult: 0.25, nm: 0.4 },
  { k: 's', label: '1K to 3K', mult: 0.55, nm: 0.8 },
  { k: 'm', label: '3K to 5K', mult: 1, nm: 1 },
  { k: 'l', label: '5K and above', mult: 1.6, nm: 1.1 },
];
const TYPE_MULT = { 'Technical': 1, 'Cultural': 1.25, 'Management': 0.9, 'Sports': 0.7, 'Society or department': 0.4 };
const CATS = [
  { k: 'title', label: 'Title sponsor', lo: 2, hi: 4, n: 14, tier: true },
  { k: 'tech', label: 'Tech and recruiters', lo: 1.5, hi: 3, n: 9 },
  { k: 'bev', label: 'Beverages and FMCG', lo: 1, hi: 2.5, n: 11 },
  { k: 'local', label: 'Local and in-kind', lo: 0.4, hi: 1.2, n: 18 },
  { k: 'bank', label: 'Banking and fintech', lo: 1, hi: 2, n: 3 },
  { k: 'app', label: 'Apparel and sports', lo: 0.8, hi: 1.8, n: 6 },
  { k: 'edu', label: 'Education', lo: 0.6, hi: 1.5, n: 7 },
  { k: 'media', label: 'Media partners', lo: 0.3, hi: 0.8, n: 5 },
];
const CAT_LABEL = Object.fromEntries(CATS.map((c) => [c.k, c.label]));
const MIN_SAMPLE = 5;
const STAGES = [
  ['shortlisted', 'Shortlisted'], ['intro', 'Intro requested'], ['contacted', 'Contacted'], ['replied', 'Replied'],
  ['meeting', 'Meeting booked'], ['negotiating', 'Negotiating'], ['committed', 'Committed'], ['declined', 'Declined'],
];
const STAGE_LABEL = Object.fromEntries(STAGES);
const HOPED = ['shortlisted', 'intro', 'contacted', 'replied'];
const LIKELY = ['meeting', 'negotiating'];
const DECLINE_REASONS = ['Budget is used up', 'Timing does not work', 'Not a fit for our category', 'No response after follow-ups', 'Other'];
const VERIFY_METHODS = {
  fest: ['College email check and faculty confirmation', 'Student affairs office confirmation'],
  company: ['Test email delivered', 'Phone call to the contact', 'Confirmation from the brand'],
  alumni: ['College alumni records', 'LinkedIn profile check'],
};

const round2 = (n) => Math.round(n * 100) / 100;
function sizeBand(visitors) {
  return visitors < 1000 ? 'xs' : visitors < 3000 ? 's' : visitors < 5000 ? 'm' : 'l';
}
function festScale(type, size) {
  return (TYPE_MULT[type] || 1) * SIZE_BANDS.find((s) => s.k === size).mult;
}
function bench(type, size, cat) {
  if (SERVER) { const b = (S.benchmarks || {})[type + '|' + size + '|' + cat]; return b ? { lo: +b.lo, hi: +b.hi, n: +b.n } : { lo: 0, hi: 0, n: 0 }; }
  const c = CATS.find((x) => x.k === cat);
  const b = SIZE_BANDS.find((s) => s.k === size);
  const m = (TYPE_MULT[type] || 1) * b.mult;
  const nm = b.nm * (type === 'Technical' ? 1 : 0.8);
  return { lo: round2(c.lo * m), hi: round2(c.hi * m), n: Math.max(1, Math.round(c.n * nm)) };
}
function totalBench(type, size) {
  if (SERVER) { const x = (S.benchmarks || {})[type + '|' + size + '|total']; return x ? { lo: +x.lo, hi: +x.hi, n: +x.n } : { lo: 0, hi: 0, n: 0 }; }
  const b = SIZE_BANDS.find((s) => s.k === size);
  const m = (TYPE_MULT[type] || 1) * b.mult;
  const nm = b.nm * (type === 'Technical' ? 1 : 0.8);
  return { lo: round2(6.5 * m), hi: round2(14 * m), n: Math.max(1, Math.round(31 * nm)) };
}

/*SEED_START*/
/* ---------- sample data (demo build only) ---------- */
function co(id, name, sub, cat, city, tags, band, color, cn, cr, ce, ch, rd, vd, bn, past, extra) {
  return Object.assign({
    id, name, sub, cat, city, tags, band, color,
    contact: { name: cn, role: cr, email: ce, channel: ch, replyDays: rd },
    verifiedOn: vd === null ? null : ago(vd), status: vd === null ? 'pending' : 'verified',
    bench: bn, past, inbound: { paused: false, weeklyCap: 6, types: ['Technical', 'Cultural', 'Management', 'Sports', 'Society or department'] },
    visible: { email: false, band: true },
  }, extra || {});
}

function seed() {
  const festStart = ahead(112);
  const companies = [
    co('c_cloudnest', 'Cloudnest', 'Cloud and developer tools', 'tech', 'Bengaluru', ['Cash', 'Hiring', 'Prizes', 'Stalls'], '1L to 3L', '#1F5C56', 'Neha Kulkarni', 'Campus Marketing Lead', 'neha.kulkarni@cloudnest.example', 'Email', 4, 9, { lo: 1.5, hi: 3, n: 9 }, ['Technical', 'Management']),
    co('c_devlane', 'Devlane', 'Developer tools', 'tech', 'Pune', ['Cash', 'Stalls'], '1L to 3L', '#221F1A', 'Arjun Bhat', 'Developer Relations Lead', 'arjun.bhat@devlane.example', 'Email', 5, 21, { lo: 1, hi: 2.2, n: 8 }, ['Technical']),
    co('c_pixelforge', 'Pixelforge Games', 'Gaming studio', 'tech', 'Hyderabad', ['In-kind', 'Prizes'], 'Under 1L', '#A83A2D', 'Lena Dsouza', 'Community Manager', 'lena@pixelforge.example', 'LinkedIn', 7, 34, { lo: 0.4, hi: 1, n: 6 }, ['Technical', 'Cultural']),
    co('c_nimbus', 'Nimbus Labs', 'Hiring platform', 'tech', 'Bengaluru', ['Cash', 'Hiring'], '1L to 3L', '#8A5A0B', 'Rahul Menon', 'Campus Hiring Lead', 'rahul.menon@nimbuslabs.example', 'Email', 6, 84, { lo: 1.2, hi: 2.5, n: 7 }, ['Technical', 'Management']),
    co('c_brewline', 'Brewline Beverages', 'Cold drinks and energy drinks', 'bev', 'Mumbai', ['Cash', 'In-kind', 'Stalls'], '1L to 3L', '#D9761C', 'Sana Qureshi', 'Youth Marketing Manager', 'sana.q@brewline.example', 'Email', 3, 12, { lo: 1, hi: 2.5, n: 11 }, ['Cultural', 'Sports', 'Technical']),
    co('c_zestly', 'Zestly Snacks', 'Packaged snacks', 'bev', 'Pune', ['Cash', 'In-kind', 'Stalls'], 'Under 1L', '#4F6D3A', 'Meghna Pillai', 'Brand Executive', 'meghna@zestly.example', 'Email', 5, 18, { lo: 0.8, hi: 1.6, n: 8 }, ['Cultural', 'Technical']),
    co('c_stride', 'Stride Sportswear', 'Sports apparel', 'app', 'Delhi', ['Cash', 'In-kind', 'Prizes'], '1L to 3L', '#3F5A78', 'Dev Malhotra', 'Partnerships Manager', 'dev.m@stride.example', 'Email', 6, 27, { lo: 0.8, hi: 1.8, n: 6 }, ['Sports', 'Cultural']),
    co('c_finara', 'Finara Bank', 'Retail banking', 'bank', 'Mumbai', ['Cash', 'Stalls'], '1L to 3L', '#6B3A6B', 'Vikram Rao', 'Campus Programs Lead', 'vikram.rao@finara.example', 'Email', 8, 40, { lo: 1, hi: 2, n: 3 }, ['Management', 'Technical']),
    co('c_paywise', 'Paywise', 'Fintech app', 'bank', 'Bengaluru', ['Cash', 'Hiring'], '1L to 3L', '#2C6E8F', 'Isha Kapoor', 'Growth Marketing Lead', 'isha@paywise.example', 'Email', 5, 15, { lo: 0.9, hi: 1.8, n: 3 }, ['Technical', 'Management']),
    co('c_learnloop', 'Learnloop', 'Ed-tech platform', 'edu', 'Mumbai', ['Cash', 'Prizes'], '1L to 3L', '#6C5A9E', 'Nisha Verma', 'Campus Ambassador Programme', 'nisha@learnloop.example', 'Email', 6, 97, { lo: 0.6, hi: 1.5, n: 7 }, ['Technical', 'Management']),
    co('c_brainbyte', 'Brainbyte Coaching', 'Coaching centre', 'edu', 'Pune', ['In-kind', 'Cash'], 'Under 1L', '#2E7D6B', 'Pooja Sathe', 'Centre Head', 'pooja@brainbyte.example', 'Email', 4, 55, { lo: 0.3, hi: 0.8, n: 5 }, ['Cultural', 'Society or department'], { status: 'bounced' }),
    co('c_printkart', 'PrintKart', 'Printing and merchandise', 'local', 'Pune', ['In-kind', 'Stalls'], 'Under 1L', '#555B6E', 'Sameer Kulkarni', 'Owner', 'sameer@printkart.example', 'WhatsApp', 2, 14, { lo: 0.3, hi: 0.9, n: 18 }, ['Technical', 'Cultural', 'Society or department']),
    co('c_campuscafe', 'Campus Cafe', 'Cafe near campus', 'local', 'Pune', ['In-kind', 'Cash'], 'Under 1L', '#7A5C3A', 'Rhea Fernandes', 'Manager', 'rhea@campuscafe.example', 'WhatsApp', 1, 6, { lo: 0.4, hi: 1.2, n: 18 }, ['Technical', 'Cultural', 'Society or department']),
    co('c_fitzone', 'FitZone Gym', 'Local gym chain', 'local', 'Pune', ['In-kind', 'Prizes'], 'Under 1L', '#B5483A', 'Harsh Patel', 'Owner', 'harsh@fitzone.example', 'WhatsApp', 3, 22, { lo: 0.3, hi: 0.8, n: 12 }, ['Sports', 'Cultural']),
    co('c_buzzline', 'Buzzline Media', 'Student media network', 'media', 'Mumbai', ['In-kind', 'Cash'], 'Under 1L', '#C2832B', 'Tanvi Rao', 'Partnerships Lead', 'tanvi@buzzline.example', 'Email', 4, 30, { lo: 0.3, hi: 0.8, n: 5 }, ['Cultural', 'Management']),
    co('c_devlane2', 'DevLane Technologies', 'Developer tools', 'tech', 'Pune', ['Cash'], '1L to 3L', '#444444', 'Support Desk', 'Contact', 'info@devlane-tech.example', 'Email', 9, null, { lo: 1, hi: 2, n: 5 }, ['Technical']),
    co('c_freshbite', 'FreshBite Foods', 'Fresh food delivery', 'bev', 'Pune', ['Cash', 'In-kind'], 'Under 1L', '#4F6D3A', 'Anita Joshi', 'Brand Manager', 'anita@freshbite.example', 'Email', 5, null, { lo: 0.8, hi: 1.5, n: 5 }, ['Cultural']),
  ];

  const pkg = (a, b, c) => [
    { id: uid('pk'), name: 'Title sponsor', price: a, benefits: 'Naming rights, main stage banner, 6 social posts, stall, mentions at every show' },
    { id: uid('pk'), name: 'Associate sponsor', price: b, benefits: 'Logo on banners, 3 social posts, stall space, one stage mention' },
    { id: uid('pk'), name: 'In-kind partner', price: c, benefits: 'Logo on partner wall, 1 social post, stall space' },
  ];
  const fests = [
    { id: 'f_kalpana', name: 'Kalpana Fest 2027', college: 'Sunrise Institute of Technology', city: 'Pune', type: 'Technical', visitors: 4000, start: festStart, audience: 'Engineering undergraduates aged 18 to 22, about 70 percent from the Pune region', pastSponsors: ['Zestly Snacks', 'Campus Cafe', 'Finara Bank'], status: 'verified', verifiedOn: ago(60), contributed: true, target: 1200000, packages: pkg('₹3,00,000 to ₹4,00,000', '₹1,00,000 to ₹2,00,000', '₹30,000 to ₹80,000 in value'), proof: { footfall: { n: 4000, kind: 'self-reported' }, photos: [], logos: ['Zestly Snacks', 'Campus Cafe', 'Finara Bank'], testimonials: [] }, handover: { close: false, contacts: false, owners: false } },
    { id: 'f_vertex', name: 'Vertex 2027', college: 'Coastal Institute of Engineering', city: 'Mangaluru', type: 'Technical', visitors: 3500, start: ahead(60), audience: 'Engineering students from coastal Karnataka and Kerala', pastSponsors: ['Cloudnest'], status: 'verified', verifiedOn: ago(80), contributed: true, target: 900000, packages: pkg('₹2,50,000 to ₹3,50,000', '₹80,000 to ₹1,50,000', '₹25,000 to ₹60,000 in value'), proof: { footfall: { n: 3500, kind: 'evidenced' }, photos: ['x'], logos: ['Cloudnest'], testimonials: [] }, handover: {} },
    { id: 'f_hackverse', name: 'Hackverse 2027', college: 'Lakeside University', city: 'Jaipur', type: 'Technical', visitors: 2000, start: ahead(75), audience: 'Developers and design students, 24 hour hackathon', pastSponsors: ['Devlane'], status: 'verified', verifiedOn: ago(50), contributed: true, target: 600000, packages: pkg('₹1,50,000 to ₹2,50,000', '₹60,000 to ₹1,00,000', '₹20,000 to ₹50,000 in value'), proof: { footfall: { n: 2000, kind: 'self-reported' }, photos: ['x'], logos: ['Devlane'], testimonials: [] }, handover: {} },
    { id: 'f_rhythm', name: 'Rhythm 2027', college: 'Capital College of Arts', city: 'Delhi', type: 'Cultural', visitors: 12000, start: ahead(95), audience: 'Arts and commerce students from across the NCR', pastSponsors: ['Brewline Beverages', 'Stride Sportswear'], status: 'verified', verifiedOn: ago(30), contributed: true, target: 3000000, packages: pkg('₹6,00,000 to ₹9,00,000', '₹2,00,000 to ₹3,50,000', '₹60,000 to ₹1,20,000 in value'), proof: { footfall: { n: 12000, kind: 'evidenced' }, photos: ['x'], logos: ['Brewline Beverages'], testimonials: [] }, handover: {} },
    { id: 'f_arth', name: 'Arthashastra 2027', college: 'Metro School of Management', city: 'Mumbai', type: 'Management', visitors: 2500, start: ahead(88), audience: 'MBA and commerce students, case competitions and talks', pastSponsors: ['Finara Bank', 'Paywise'], status: 'verified', verifiedOn: ago(45), contributed: true, target: 800000, packages: pkg('₹2,00,000 to ₹3,00,000', '₹70,000 to ₹1,20,000', '₹20,000 to ₹50,000 in value'), proof: { footfall: { n: 2500, kind: 'self-reported' }, photos: ['x'], logos: ['Finara Bank'], testimonials: [] }, handover: {} },
    { id: 'f_sportz', name: 'Sportzilla 2027', college: 'Deccan Sports University', city: 'Hyderabad', type: 'Sports', visitors: 6000, start: ahead(70), audience: 'Athletes and sports science students, 14 colleges', pastSponsors: ['Stride Sportswear', 'FitZone Gym'], status: 'verified', verifiedOn: ago(25), contributed: true, target: 1100000, packages: pkg('₹3,00,000 to ₹4,50,000', '₹90,000 to ₹1,60,000', '₹30,000 to ₹70,000 in value'), proof: { footfall: { n: 6000, kind: 'evidenced' }, photos: ['x'], logos: ['Stride Sportswear'], testimonials: [] }, handover: {} },
    { id: 'f_utsav', name: 'Utsav 2027', college: 'Greenfield College', city: 'Bhopal', type: 'Cultural', visitors: 4500, start: ahead(120), audience: 'Undergraduate students from central India', pastSponsors: [], status: 'pending', verifiedOn: null, contributed: false, target: 700000, packages: pkg('₹1,50,000 to ₹2,50,000', '₹50,000 to ₹90,000', '₹15,000 to ₹40,000 in value'), proof: { footfall: null, photos: [], logos: [], testimonials: [] }, handover: {} },
  ];

  const users = [
    { id: 'u_aditi', name: 'Aditi Sharma', initials: 'AS', role: 'fest', festRole: 'lead', entityId: 'f_kalpana', title: 'Sponsorship lead, Kalpana Fest 2027' },
    { id: 'u_kabir', name: 'Kabir Mehra', initials: 'KM', role: 'fest', festRole: 'member', entityId: 'f_kalpana', title: 'Team member' },
    { id: 'u_meera', name: 'Meera Gupta', initials: 'MG', role: 'fest', festRole: 'member', entityId: 'f_kalpana', title: 'Team member' },
    { id: 'u_ishaan', name: 'Ishaan Nair', initials: 'IN', role: 'fest', festRole: 'convenor', entityId: 'f_kalpana', title: 'Convenor, view only' },
    { id: 'u_neha', name: 'Neha Kulkarni', initials: 'NK', role: 'brand', entityId: 'c_cloudnest', title: 'Campus Marketing Lead, Cloudnest' },
    { id: 'u_rohan', name: 'Rohan Mehta', initials: 'RM', role: 'alumni', entityId: 'a_rohan', title: 'Alumnus, Cloudnest' },
    { id: 'u_admin', name: 'Verification desk', initials: 'VD', role: 'admin', entityId: null, title: 'Operator' },
  ];

  const S1 = 'Sunrise Institute of Technology';
  const al = (id, name, init, cls, co_, role, helps, cap, college) => ({ id, name, initials: init, cls: cls || '', cohort: cls, companyId: co_, role, helps: helps || 'introduce', cap: cap || 3, college: college || S1, status: 'verified' });
  const alumni = [
    Object.assign(al('a_rohan', 'Rohan Mehta', 'RM', 2019, 'c_cloudnest', 'Product Manager', 'introduce', 3), { userId: 'u_rohan' }),
    al('a_priya', 'Priya Sharma', 'PS', 2017, 'c_cloudnest', 'Software Engineer', 'advise', 2),
    al('a_vikram', 'Vikram Joshi', 'VJ', 2020, 'c_cloudnest', 'Product Designer', 'introduce', 2),
    al('a_ananya', 'Ananya Iyer', 'AI', 2021, 'c_devlane', 'Developer Advocate', 'introduce', 3),
    al('a_karan', 'Karan Desai', 'KD', 2016, 'c_nimbus', 'Engineering Manager', 'introduce', 2),
    al('a_shreya', 'Shreya Nair', 'SN', 2019, 'c_nimbus', 'Recruiter', 'introduce', 3),
    al('a_manish', 'Manish Kale', 'MK', 2015, 'c_finara', 'Branch Programmes Lead', 'introduce', 2),
    al('a_tara', 'Tara Bose', 'TB', 2018, 'c_brewline', 'Brand Associate', 'introduce', 3),
    al('a_other', 'Dhruv Rao', 'DR', 2018, 'c_cloudnest', 'Data Analyst', 'introduce', 3, 'Coastal Institute of Engineering'),
  ];

  const mk = (id, festId, companyId, stage, owner, ask, extra) => Object.assign({
    id, festId, companyId, stage, owner, ask: ask || 0, amount: 0, followUp: null, meetingAt: null, lastTouch: ago(3), createdAt: ago(10),
    notes: [], activity: [], decline: null, deckSent: false, payments: [], deliverables: [], proof: [], committedOn: null, kind: 'cash',
  }, extra || {});
  const act = (t, by, text) => ({ id: uid('ac'), ts: t, by, text });
  const pipeline = [
    mk('p_cloudnest', 'f_kalpana', 'c_cloudnest', 'intro', 'u_aditi', 200000, { lastTouch: ago(2), createdAt: ago(2), activity: [act(ago(2), 'u_aditi', 'Asked Rohan Mehta for an introduction')] }),
    mk('p_devlane', 'f_kalpana', 'c_devlane', 'intro', 'u_aditi', 110000, { lastTouch: ago(1), createdAt: ago(5), activity: [act(ago(5), 'u_aditi', 'Asked Ananya Iyer for an introduction'), act(ago(1), 'u_aditi', 'Ananya accepted and will introduce us')] }),
    mk('p_brewline', 'f_kalpana', 'c_brewline', 'meeting', 'u_kabir', 90000, { lastTouch: ago(6), followUp: T0, meetingAt: ahead(3) + 16 * HOUR - (T0 % DAY), createdAt: ago(20), activity: [act(ago(20), 'u_kabir', 'Sent a pitch request'), act(ago(6), 'u_kabir', 'Sana agreed to a meeting')], notes: [act(ago(6), 'u_kabir', 'Sana wants a stall next to the food court.')] }),
    mk('p_stride', 'f_kalpana', 'c_stride', 'negotiating', 'u_meera', 150000, { lastTouch: ago(4), followUp: ahead(1), createdAt: ago(25), activity: [act(ago(25), 'u_meera', 'Sent a pitch request'), act(ago(4), 'u_meera', 'Dev asked for a revised package')] }),
    mk('p_printkart', 'f_kalpana', 'c_printkart', 'contacted', 'u_kabir', 0, { lastTouch: ago(7), createdAt: ago(7), activity: [act(ago(7), 'u_kabir', 'Messaged Sameer on WhatsApp')] }),
    mk('p_pixelforge', 'f_kalpana', 'c_pixelforge', 'declined', 'u_meera', 50000, { lastTouch: ago(12), decline: 'Budget is used up', createdAt: ago(30), activity: [act(ago(12), 'u_meera', 'Declined: budget is used up')] }),
    mk('p_finara', 'f_kalpana', 'c_finara', 'committed', 'u_aditi', 100000, {
      amount: 100000, committedOn: ago(16), createdAt: ago(40), lastTouch: ago(16), kind: 'cash',
      payments: [{ id: uid('pay'), label: 'On signing', amount: 50000, due: ago(16), paid: true }, { id: uid('pay'), label: 'Second instalment', amount: 50000, due: ahead(78), paid: false }],
      deliverables: [
        { id: uid('dl'), text: 'Logo sent for approval', done: true, owner: 'Kabir', due: ago(8), sub: 'Approved' },
        { id: uid('dl'), text: 'Logo on main stage banner', done: false, owner: 'Kabir', due: ahead(105), sub: '' },
        { id: uid('dl'), text: 'Three social posts', done: false, owner: 'Meera', due: ahead(110), sub: '', count: { done: 1, total: 3 } },
        { id: uid('dl'), text: 'Stall space, 10 by 10 ft', done: true, owner: 'Meera', due: ago(2), sub: 'Allocated' },
        { id: uid('dl'), text: 'Sponsor report', done: false, owner: 'Aditi', due: ahead(125), sub: 'Send within 7 days of the fest' },
      ],
      activity: [act(ago(16), 'u_aditi', 'Commitment recorded: ₹1,00,000 cash')],
    }),
    mk('p_zestly', 'f_kalpana', 'c_zestly', 'committed', 'u_kabir', 120000, {
      amount: 120000, committedOn: ago(30), createdAt: ago(50), lastTouch: ago(30), kind: 'cash',
      payments: [{ id: uid('pay'), label: 'On signing', amount: 60000, due: ago(30), paid: true }, { id: uid('pay'), label: 'Second instalment', amount: 60000, due: ahead(40), paid: false }],
      deliverables: [
        { id: uid('dl'), text: 'Logo on food court signage', done: false, owner: 'Kabir', due: ahead(100), sub: '' },
        { id: uid('dl'), text: 'Stall space, 10 by 10 ft', done: true, owner: 'Meera', due: ago(5), sub: 'Allocated' },
        { id: uid('dl'), text: 'Sponsor report', done: false, owner: 'Aditi', due: ahead(125), sub: '' },
      ],
      activity: [act(ago(30), 'u_kabir', 'Commitment recorded: ₹1,20,000 cash')],
    }),
    mk('p_campuscafe', 'f_kalpana', 'c_campuscafe', 'committed', 'u_aditi', 100000, {
      amount: 100000, committedOn: ago(22), createdAt: ago(35), lastTouch: ago(22), kind: 'in-kind',
      deliverables: [
        { id: uid('dl'), text: 'Refreshment vouchers for 200 volunteers', done: false, owner: 'Meera', due: ahead(108), sub: '' },
        { id: uid('dl'), text: 'Logo on partner wall', done: true, owner: 'Kabir', due: ago(1), sub: '' },
      ],
      activity: [act(ago(22), 'u_aditi', 'Commitment recorded: ₹1,00,000 in-kind value')],
    }),
  ];
  const shortlists = [
    { id: 'sl_bev', festId: 'f_kalpana', name: 'Beverages', companyIds: ['c_brewline', 'c_zestly'] },
    { id: 'sl_tech', festId: 'f_kalpana', name: 'Tech recruiters', companyIds: ['c_cloudnest', 'c_devlane', 'c_nimbus'] },
    { id: 'sl_local', festId: 'f_kalpana', name: 'Local and in-kind', companyIds: ['c_printkart', 'c_campuscafe', 'c_fitzone'] },
  ];
  const intros = [
    { id: 'i_1', festId: 'f_kalpana', companyId: 'c_cloudnest', alumnusId: 'a_rohan', by: 'u_aditi', ask: 200000, message: 'Hi Rohan, I’m Aditi, sponsorship lead for Kalpana Fest 2027 at Sunrise Institute. We expect about 4,000 visitors and are looking for a technology partner. Could you introduce us to Neha Kulkarni on Cloudnest’s campus marketing team? Our deck is attached.', status: 'sent', createdAt: ago(2), respondedAt: null },
    { id: 'i_2', festId: 'f_kalpana', companyId: 'c_devlane', alumnusId: 'a_ananya', by: 'u_aditi', ask: 110000, message: 'Hi Ananya, I’m Aditi from Kalpana Fest 2027 at Sunrise Institute. Could you introduce us to Arjun Bhat on the developer relations team?', status: 'accepted', createdAt: ago(5), respondedAt: ago(1) },
  ];
  const requests = [
    { id: 'r_1', festId: 'f_vertex', companyId: 'c_cloudnest', ask: 150000, message: 'We are looking for a title partner for Vertex 2027 and would love to feature Cloudnest’s developer tools at our hack arena.', status: 'new', reason: '', createdAt: ago(1), by: null },
    { id: 'r_2', festId: 'f_hackverse', companyId: 'c_cloudnest', ask: 200000, message: 'Hackverse is a 24 hour hackathon for 2,000 builders. We would like Cloudnest as our cloud partner.', status: 'new', reason: '', createdAt: ago(2), by: null },
    { id: 'r_3', festId: 'f_arth', companyId: 'c_cloudnest', ask: 100000, message: 'Seeking a technology partner for our case competition finals.', status: 'accepted', reason: '', createdAt: ago(8), by: null },
  ];
  const archive = [
    { id: 'ar1', festId: 'f_kalpana', year: 2026, name: 'Kalpana Fest 2026', items: [
      { companyId: 'c_brewline', name: 'Brewline Beverages', outcome: 'Committed', amount: 90000, contact: 'Sana Qureshi', note: 'Wanted a stall near the food court.' },
      { companyId: 'c_zestly', name: 'Zestly Snacks', outcome: 'Committed', amount: 80000, contact: 'Meghna Pillai', note: 'Asked for a report with footfall photos.' },
      { companyId: 'c_campuscafe', name: 'Campus Cafe', outcome: 'Committed', amount: 60000, contact: 'Rhea Fernandes', note: 'Vouchers for volunteers.' },
      { companyId: 'c_finara', name: 'Finara Bank', outcome: 'Committed', amount: 100000, contact: 'Vikram Rao', note: 'Account-opening desk on day one.' },
      { companyId: 'c_cloudnest', name: 'Cloudnest', outcome: 'Declined', amount: 0, contact: 'Neha Kulkarni', note: 'Said budget was set earlier in the year. Approach in April.' },
      { companyId: 'c_nimbus', name: 'Nimbus Labs', outcome: 'No reply', amount: 0, contact: 'Rahul Menon', note: 'Three emails, no answer.' },
    ] },
  ];
  const reports = [
    { id: 'rp_1', kind: 'Wrong contact', targetType: 'company', targetId: 'c_brainbyte', by: 'u_kabir', text: 'Email bounced twice and the number is switched off.', status: 'open', ts: ago(2) },
    { id: 'rp_2', kind: 'Suspicious listing', targetType: 'fest', targetId: 'f_utsav', by: 'u_neha', text: 'Contact asked for a registration fee before sharing the deck.', status: 'open', ts: ago(1) },
  ];
  const audit = [
    { id: uid('au'), ts: ago(9), by: 'u_admin', text: 'Verified contact for Cloudnest (Test email delivered)' },
    { id: uid('au'), ts: ago(2), by: 'u_admin', text: 'Marked Brainbyte Coaching contact as bounced' },
    { id: uid('au'), ts: ago(60), by: 'u_admin', text: 'Verified fest Kalpana Fest 2027 (College email check and faculty confirmation)' },
  ];

  return {
    version: VERSION, session: { userId: null }, users, fests, companies, alumni, pipeline, shortlists, intros, requests, archive, reports, audit,
    notifs: [
      { id: uid('n'), userId: 'u_aditi', text: 'Ananya Iyer accepted your introduction request for Devlane', link: '#/pipe/p_devlane', ts: ago(1), read: false },
      { id: uid('n'), userId: 'u_neha', text: 'Vertex 2027 sent a sponsorship request', link: '#/b/inbox', ts: ago(1), read: false },
      { id: uid('n'), userId: 'u_rohan', text: 'Aditi Sharma asked you to introduce Kalpana Fest 2027 to Cloudnest', link: '#/a/inbox', ts: ago(2), read: false },
      { id: uid('n'), userId: 'u_admin', text: '3 items are waiting for verification', link: '#/ad/verify', ts: ago(1), read: false },
    ],
    prefs: { f_kalpana: { filters: null } }, lite: false,
  };
}

/*SEED_END*/
/* ---------- store ---------- */
function loadLocal() { try { return JSON.parse(localStorage.getItem(KEY + '.local') || '{}'); } catch (e) { return {}; } }
function emptyState() {
  const loc = loadLocal();
  return { version: VERSION, session: { userId: null }, users: [], fests: [], companies: [], alumni: [], pipeline: [], shortlists: [], intros: [], requests: [], archive: [], reports: [], audit: [], notifs: [], benchmarks: {}, prefs: loc.prefs || {}, lite: !!loc.lite };
}
let S = DEMO_OK ? load() : emptyState();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const o = JSON.parse(raw); if (o && o.version === VERSION) return o; }
  } catch (e) { /* storage may be empty or blocked */ }
  return seed();
}
function save() {
  if (SERVER) { try { localStorage.setItem(KEY + '.local', JSON.stringify({ prefs: S.prefs, lite: S.lite })); return true; } catch (e) { return false; } }
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
  catch (e) { return false; }
}
function resetAll() {
  if (SERVER) return;
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  S = seed(); save();
}

/* ---------- lookups ---------- */
const byId = (arr, id) => arr.find((x) => x.id === id);
const U = (id) => byId(S.users, id);
const F = (id) => byId(S.fests, id);
const C = (id) => byId(S.companies, id);
const A = (id) => byId(S.alumni, id);
const P = (id) => byId(S.pipeline, id);
const me = () => U(S.session.userId);
const myFest = () => { const u = me(); return u && u.role === 'fest' ? F(u.entityId) : null; };
const myCompany = () => { const u = me(); return u && u.role === 'brand' ? C(u.entityId) : null; };
const myAlumnus = () => { const u = me(); return u && u.role === 'alumni' ? A(u.entityId) : null; };
const canEdit = () => { const u = me(); return !!u && (u.role !== 'fest' || u.festRole !== 'convenor'); };
const festPipeline = (fid) => S.pipeline.filter((p) => p.festId === fid);
const festUsers = (fid) => S.users.filter((u) => u.role === 'fest' && u.entityId === fid);
const festLead = (fid) => festUsers(fid).find((u) => u.festRole === 'lead') || festUsers(fid)[0];
const sizeOf = (f) => sizeBand(f.visitors);
const daysSince = (ms) => (ms == null ? 9999 : Math.floor((T0 + (Date.now() - T0) - ms) / DAY));
function totals(fid) {
  const ps = festPipeline(fid);
  const sum = (stages) => ps.filter((p) => stages.includes(p.stage)).reduce((a, p) => a + (p.stage === 'committed' ? p.amount : p.ask), 0);
  return { confirmed: sum(['committed']), likely: sum(LIKELY), hoped: sum(HOPED) };
}
function freshness(c) {
  if (c.status === 'bounced') return { key: 'bad', label: 'Bounced', days: daysSince(c.verifiedOn) };
  if (c.status === 'pending' || c.verifiedOn == null) return { key: 'stale', label: 'Not verified', days: 9999 };
  const d = daysSince(c.verifiedOn);
  if (d > 90) return { key: 'bad', label: 'Overdue', days: d };
  if (d > 60) return { key: 'stale', label: 'Re-check due', days: d };
  return { key: 'ok', label: 'Verified', days: d };
}
function alumniAt(companyId, college) {
  return S.alumni.filter((a) => a.companyId === companyId && a.college === college && a.status === 'verified');
}
function introsUsed(alumnusId) {
  const al = byId(S.alumni, alumnusId);
  if (SERVER && al && al.used != null) return al.used;
  const monthAgo = Date.now() - 30 * DAY;
  return S.intros.filter((i) => i.alumnusId === alumnusId && i.createdAt >= monthAgo && i.status !== 'declined').length;
}
function suggestedAsk(c, f) {
  if (c.bench.n < MIN_SAMPLE) return 50000;
  const sc = festScale(f.type, sizeOf(f));
  const lo = c.bench.lo * sc, hi = c.bench.hi * sc;
  const v = (lo + 0.35 * (hi - lo)) * 100000;
  return Math.max(10000, Math.round(v / 25000) * 25000);
}
function askRange(c, f) {
  const sc = festScale(f.type, sizeOf(f));
  return { lo: Math.round(c.bench.lo * sc * 100000), hi: Math.round(c.bench.hi * sc * 100000) };
}
function proofComplete(f) {
  const p = f.proof || {};
  return !!(p.footfall && p.photos && p.photos.length && p.logos && p.logos.length);
}
function notify(userIds, text, link) {
  if (SERVER) return;
  (userIds || []).filter(Boolean).forEach((id) => S.notifs.unshift({ id: uid('n'), userId: id, text, link: link || '', ts: Date.now(), read: false }));
}
function logAudit(text) { if (SERVER) return; S.audit.unshift({ id: uid('au'), ts: Date.now(), by: S.session.userId, text }); }
function stageOfFest(fid, cid) { return S.pipeline.find((p) => p.festId === fid && p.companyId === cid); }
