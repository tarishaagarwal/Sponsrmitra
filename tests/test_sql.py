import json, time
import pgenv
from pgenv import Client
conn = pgenv.start(); U = pgenv.uri()
fails = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + ((' :: ' + str(extra)) if (not cond and extra) else ''))
    if not cond: fails.append(name)
def mk(email): return Client(U, pgenv.new_user(conn, email))
now_ms = lambda: int(time.time() * 1000)

admin, lead, member, convenor, brand, alum1, alum2, stranger = [mk(e + '@t.test') for e in ['admin', 'lead', 'member', 'convenor', 'brand', 'alum1', 'alum2', 'stranger']]
cur = conn.cursor()
# a first sign-in creates a profile only through a register function; the operator promotes the admin
check('make_admin before sign-in is a no-op message', True)
cur.execute("select public.make_admin('admin@t.test')"); print(cur.fetchone()[0])
# anonymous / signed-out access
r, e = Client(U, None).rpc('bootstrap', anon=True); check('anon cannot call bootstrap', e is not None, e)
r, e = Client(U, None).rpc('public_sponsor', {'token': 'x' * 30}, anon=True); check('anon can call public_sponsor (returns null)', e is None and r is None, e)
# direct table access is denied
c = __import__('psycopg2').connect(U); cc = c.cursor(); cc.execute('begin'); cc.execute('set local role authenticated')
try: cc.execute('select * from public.entities'); denied = False
except Exception as ex: denied = 'permission denied' in str(ex)
c.rollback(); c.close(); check('browser role cannot read tables directly', denied)

# admin adds companies
r, e = admin.rpc('admin_add_company', {'p': {'name': 'Cloudnest', 'sub': 'Cloud tools', 'cat': 'tech', 'city': 'Bengaluru', 'tags': ['Cash', 'Hiring'], 'contactName': 'Neha K', 'contactRole': 'Campus Lead', 'email': 'neha@cloudnest.example', 'benchLo': 1.5, 'benchHi': 3, 'benchN': 9}})
check('admin adds company', e is None and r and r['companyId'], e); cloud = r['companyId']
r, e = admin.rpc('admin_add_company', {'p': {'name': 'Brewline', 'cat': 'bev', 'city': 'Mumbai', 'contactName': 'Sana Q', 'email': 'sana@brewline.example'}}); brew = r['companyId']
r, e = lead.rpc('admin_add_company', {'p': {'name': 'Sneaky', 'cat': 'tech', 'city': 'X', 'contactName': 'a', 'email': 'b'}}); check('non-admin cannot add company', e is not None, e)

# registration
r, e = lead.rpc('register_fest', {'p': {'name': 'Aditi Sharma', 'fest': 'Kalpana Fest 2027', 'college': 'Sunrise Institute', 'city': 'Pune', 'type': 'Technical', 'visitors': 4000, 'start': now_ms() + 100 * 86400000, 'audience': 'Engineers'}})
check('register fest', e is None and r and r['festId'], e); fid = r['festId']
r, e = lead.rpc('register_fest', {'p': {'name': 'Again', 'fest': 'X', 'college': 'Y', 'city': 'Z', 'type': 'Technical', 'visitors': 1, 'start': 1}}); check('second registration rejected', e is not None, e)
b, e = lead.rpc('bootstrap'); check('bootstrap returns own profile', b['profile']['role'] == 'fest' and b['profile']['festRole'] == 'lead')
fest = b['fests'][0]; jc, vc = fest['joinCode'], fest['viewCode']
check('lead sees join codes', bool(jc and vc))
r, e = member.rpc('join_fest', {'p': {'name': 'Kabir Mehra', 'code': jc}}); check('join as member with code', e is None, e)
r, e = convenor.rpc('join_fest', {'p': {'name': 'Ishaan Nair', 'code': vc}}); check('join as convenor with view code', e is None, e)
r, e = stranger.rpc('join_fest', {'p': {'name': 'Bad', 'code': 'NOPE1234'}}); check('wrong code rejected', e is not None, e)
b, _ = member.rpc('bootstrap'); check('member does not see join codes', 'joinCode' not in b['fests'][0])
b, _ = admin.rpc('bootstrap'); check('admin sees pending fest', any(f['status'] == 'pending' for f in b['fests']))
check('admin notified of new fest', any('waiting for verification' in n['text'] for n in b['notifs']))

# unverified fest cannot send requests
alum_company = cloud
r, e = alum1.rpc('register_alumnus', {'p': {'name': 'Rohan Mehta', 'college': 'Sunrise Institute', 'cohort': 2019, 'companyId': cloud, 'role': 'Product Manager', 'helps': 'introduce', 'cap': 2}}); check('register alumnus', e is None, e); aid = r['alumnusId']
r, e = lead.rpc('send_intro', {'p': {'companyId': cloud, 'alumnusId': aid, 'ask': 100000, 'message': 'Hello'}}); check('unverified fest cannot send intro', e is not None, e)
r, e = admin.rpc('verify_entity', {'p': {'kind': 'fests', 'id': fid, 'method': 'College email check'}}); check('admin verifies fest', e is None, e)
r, e = lead.rpc('verify_entity', {'p': {'kind': 'fests', 'id': fid, 'method': 'self'}}); check('fest cannot verify itself', e is not None, e)
b, _ = lead.rpc('bootstrap'); check('lead notified of verification', any('is verified' in n['text'] for n in b['notifs']), [n['text'] for n in b['notifs']])
r, e = lead.rpc('send_intro', {'p': {'companyId': cloud, 'alumnusId': aid, 'ask': 100000, 'message': 'Hello'}}); check('pending alumnus cannot be asked', e is not None, e)
r, e = admin.rpc('verify_entity', {'p': {'kind': 'alumni', 'id': aid, 'method': 'College alumni records'}}); check('admin verifies alumnus', e is None, e)

# intro flow
r, e = convenor.rpc('send_intro', {'p': {'companyId': cloud, 'alumnusId': aid, 'ask': 100000, 'message': 'Hello'}}); check('convenor cannot send intro', e is not None, e)
r, e = lead.rpc('send_intro', {'p': {'companyId': cloud, 'alumnusId': aid, 'ask': 120000, 'message': 'Hi Rohan, please introduce us'}}); check('lead sends intro', e is None and r['introId'] and r['pipelineId'], e); iid, pid = r['introId'], r['pipelineId']
b, _ = alum1.rpc('bootstrap'); check('alumnus notified', any('asked you to introduce' in n['text'] for n in b['notifs']))
check('alumnus sees intro but no pipeline', len(b['intros']) == 1 and b['pipeline'] == [])
check('alumnus does not see fest photos or target', 'target' not in b['fests'][0])
r, e = alum1.rpc('mark_intros_seen'); b, _ = alum1.rpc('bootstrap'); check('intro marked seen', b['intros'][0]['status'] == 'seen')
r, e = alum2.rpc('register_alumnus', {'p': {'name': 'Other Person', 'college': 'Elsewhere', 'cohort': 2018, 'companyId': cloud, 'role': 'Analyst'}}); aid2 = r['alumnusId']
r, e = alum2.rpc('respond_intro', {'p': {'introId': iid, 'action': 'accept'}}); check("other alumnus cannot answer someone else's intro", e is not None, e)
r, e = alum1.rpc('respond_intro', {'p': {'introId': iid, 'action': 'accept'}}); check('alumnus accepts', e is None, e)
r, e = alum1.rpc('respond_intro', {'p': {'introId': iid, 'action': 'decline'}}); check('cannot answer twice', e is not None, e)
b, _ = lead.rpc('bootstrap'); check('lead notified of acceptance', any('accepted' in n['text'] for n in b['notifs']))
check('pipeline activity logged', 'accepted' in b['pipeline'][0]['activity'][0]['text'], b['pipeline'][0]['activity'][0])
b2, _ = member.rpc('bootstrap'); check('member notified too', any('accepted' in n['text'] for n in b2['notifs']))

# monthly cap (cap=2 set at registration; one used)
r, e = admin.rpc('verify_entity', {'p': {'kind': 'companies', 'id': brew, 'method': 'x'}})
r, e = alum1.rpc('apply_changes', {'changes': [{'kind': 'alumni', 'id': aid, 'op': 'upsert', 'baseV': 2, 'data': {'role': 'Product Manager', 'helps': 'introduce', 'cap': 1}}]})
print('alumnus edit cap ->', e)
b, _ = lead.rpc('bootstrap'); al = [a for a in b['alumni'] if a['id'] == aid]; check('fest sees how many intros an alumnus used this month', al and al[0]['used'] == 1, al)
# email visibility
b, _ = lead.rpc('bootstrap'); cl = [c for c in b['companies'] if c['id'] == cloud][0]
check('email visible once pipeline moved past shortlist', cl['contact'].get('email') == 'neha@cloudnest.example')
br = [c for c in b['companies'] if c['id'] == brew][0]
check('email hidden before any outreach', 'email' not in br['contact'])

# pitch requests + brand
r, e = brand.rpc('register_brand', {'p': {'name': 'Neha Kulkarni', 'role': 'Marketing Lead', 'company': 'Zestly', 'cat': 'bev', 'city': 'Pune', 'email': 'neha@zestly.example', 'tags': ['Cash']}}); check('register brand', e is None, e); zid = r['companyId']
r, e = lead.rpc('send_pitch', {'p': {'companyId': zid, 'ask': 90000, 'message': 'Hello'}}); check('cannot pitch an unverified brand', e is not None, e)
admin.rpc('verify_entity', {'p': {'kind': 'companies', 'id': zid, 'method': 'Phone call'}})
r, e = lead.rpc('send_pitch', {'p': {'companyId': zid, 'ask': 90000, 'message': 'Hello Neha, we would love to partner'}}); check('lead sends pitch', e is None, e); rid = r['requestId']
r, e = lead.rpc('send_pitch', {'p': {'companyId': zid, 'ask': 90000, 'message': 'again'}}); check('duplicate open request blocked', e is not None, e)
b, be = brand.rpc('bootstrap'); print('brand bootstrap err:', be); check('brand sees request and not the pipeline', len(b['requests']) == 1 and b['pipeline'] == [])
check('brand sees fest without private fields', 'target' not in b['fests'][0] and 'joinCode' not in b['fests'][0])
check('brand notified', any('sponsorship request' in n['text'] for n in b['notifs']))
r, e = lead.rpc('respond_request', {'p': {'requestId': rid, 'action': 'accept'}}); check('fest cannot answer its own request', e is not None, e)
r, e = brand.rpc('respond_request', {'p': {'requestId': rid, 'action': 'decline', 'reason': ''}}); check('decline needs a reason', e is not None, e)
r, e = brand.rpc('respond_request', {'p': {'requestId': rid, 'action': 'ask', 'text': 'Can you share footfall data?'}}); check('brand asks a question', e is None, e)
b, _ = lead.rpc('bootstrap'); check('fest notified of question', any('question' in n['text'] for n in b['notifs']))
r, e = brand.rpc('respond_request', {'p': {'requestId': rid, 'action': 'decline', 'reason': 'Budget is used up'}}); check('brand declines after question', e is None, e)
b, _ = lead.rpc('bootstrap'); zp = [p for p in b['pipeline'] if p['companyId'] == zid][0]
check('pipeline shows declined with reason', zp['stage'] == 'declined' and zp['decline'] == 'Budget is used up', zp['stage'])

# apply_changes permissions
b, _ = lead.rpc('bootstrap'); f0 = b['fests'][0]; v = f0['_v']
d = {k: val for k, val in f0.items() if k != '_v'}; d['target'] = 1200000
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'fests', 'id': fid, 'op': 'upsert', 'baseV': v, 'data': d}]}); check('lead sets target', e is None, e)
d2 = dict(d); d2['status'] = 'verified'; d2['name'] = 'Renamed'
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'fests', 'id': fid, 'op': 'upsert', 'baseV': r['versions']['fests|' + fid], 'data': d2}]}); check('lead may rename but status is protected', e is None, e)
b, _ = lead.rpc('bootstrap'); check('rename applied', b['fests'][0]['name'] == 'Renamed')
d3 = dict(b['fests'][0]); d3.pop('_v'); d3['status'] = 'pending'
d3['status'] = 'rejected'
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'fests', 'id': fid, 'op': 'upsert', 'baseV': b['fests'][0]['_v'], 'data': d3}]}); check('lead cannot change status', e is not None, e)
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'fests', 'id': fid, 'op': 'upsert', 'baseV': 1, 'data': d}]}); check('stale version rejected as conflict', e == 'conflict', e)
r, e = convenor.rpc('apply_changes', {'changes': [{'kind': 'fests', 'id': fid, 'op': 'upsert', 'baseV': 9, 'data': d}]}); check('convenor cannot write', e is not None, e)
r, e = brand.rpc('apply_changes', {'changes': [{'kind': 'fests', 'id': fid, 'op': 'upsert', 'baseV': 9, 'data': d}]}); check('brand cannot write a fest', e is not None, e)
r, e = alum1.rpc('apply_changes', {'changes': [{'kind': 'pipeline', 'id': pid, 'op': 'delete'}]}); check('alumnus cannot delete pipeline', e is not None, e)
# pipeline add / commit
newp = {'festId': fid, 'companyId': brew, 'stage': 'shortlisted', 'owner': b['profile']['id'], 'ask': 0, 'amount': 0, 'followUp': None, 'meetingAt': None, 'lastTouch': now_ms(), 'createdAt': now_ms(), 'notes': [], 'activity': [], 'decline': None, 'deckSent': False, 'payments': [], 'deliverables': [], 'proof': [], 'committedOn': None, 'kind': 'cash'}
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'pipeline', 'id': 'p_test0001', 'op': 'upsert', 'baseV': 0, 'data': newp}]}); check('lead adds pipeline item', e is None, e)
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'pipeline', 'id': 'p_test0002', 'op': 'upsert', 'baseV': 0, 'data': newp}]}); check('duplicate company in pipeline rejected', e is not None, e)
bad = dict(newp); bad['festId'] = 'f_someoneelse'
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'pipeline', 'id': 'p_test0003', 'op': 'upsert', 'baseV': 0, 'data': bad}]}); check("cannot write another fest's pipeline", e is not None, e)
bad = dict(newp); bad['owner'] = brand.uid; bad['companyId'] = cloud
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'pipeline', 'id': 'p_test0004', 'op': 'upsert', 'baseV': 0, 'data': bad}]}); check('owner must be on the team', e is not None, e)
com = dict(newp); com.update(stage='committed', amount=100000, committedOn=now_ms(), deliverables=[{'id': 'd1', 'text': 'Logo', 'done': True, 'owner': 'K', 'due': None, 'sub': ''}])
b, _ = lead.rpc('bootstrap'); pv = [p for p in b['pipeline'] if p['id'] == 'p_test0001'][0]['_v']
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'pipeline', 'id': 'p_test0001', 'op': 'upsert', 'baseV': pv, 'data': com}]}); check('lead commits a deal', e is None, e)
b, _ = lead.rpc('bootstrap'); cp = [p for p in b['pipeline'] if p['id'] == 'p_test0001'][0]
check('server issued a share token', len(cp.get('shareToken', '')) > 20); token = cp['shareToken']
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'pipeline', 'id': 'p_test0001', 'op': 'delete'}]}); check('committed deal cannot be removed', e is not None, e)
r, e = Client(U, None).rpc('public_sponsor', {'token': token}, anon=True); check('anon opens sponsor page by token', e is None and r and r['company']['name'] == 'Brewline' and 'owner' not in r['item'], (r, e))
check('public page exposes no notes or activity', 'notes' not in r['item'] and 'activity' not in r['item'])
cp2 = dict(cp); cp2.pop('_v'); cp2['shareToken'] = 'forged-token-forged-token'
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'pipeline', 'id': 'p_test0001', 'op': 'upsert', 'baseV': cp['_v'], 'data': cp2}]})
b, _ = lead.rpc('bootstrap'); check('share token cannot be forged', [p for p in b['pipeline'] if p['id'] == 'p_test0001'][0]['shareToken'] == token)
b, _ = brand.rpc('bootstrap')  # zid company brand: should not see Brewline deal
check("brand sees only its own company's committed deals", b['pipeline'] == [])
bz, _ = admin.rpc('bootstrap'); check('admin sees everything incl. audit', len(bz['audit']) >= 3 and len(bz['pipeline']) >= 2)
b, _ = stranger.rpc('bootstrap'); check('stranger without profile gets null profile', b['profile'] is None)

# reports
rep = {'kind': 'Wrong contact', 'targetType': 'company', 'targetId': brew, 'text': 'bounced'}
r, e = lead.rpc('apply_changes', {'changes': [{'kind': 'reports', 'id': 'rp_test0001', 'op': 'upsert', 'baseV': 0, 'data': rep}]}); check('user files a report', e is None, e)
b, _ = admin.rpc('bootstrap'); check('admin sees report and is notified', any(x['id'] == 'rp_test0001' and x['status'] == 'open' and x['by'] for x in b['reports']) and any('New report' in n['text'] for n in b['notifs']))
r, e = admin.rpc('report_action', {'p': {'reportId': 'rp_test0001', 'action': 'bounce'}}); check('admin marks contact bounced from report', e is None, e)
b, _ = admin.rpc('bootstrap'); check('company now bounced', [c for c in b['companies'] if c['id'] == brew][0]['status'] == 'bounced')
b, _ = lead.rpc('bootstrap'); check('bounced company still visible to fest that already works with it (for history)', any(c['id'] == brew for c in b['companies']))

# benchmarks + merge + notifications read + delete
r, e = admin.rpc('admin_set_benchmark', {'p': {'type': 'Technical', 'size': 'm', 'cat': 'total', 'lo': 6.5, 'hi': 14, 'n': 12}}); check('admin sets benchmark', e is None, e)
r, e = lead.rpc('admin_set_benchmark', {'p': {'type': 'Technical', 'size': 'm', 'cat': 'total', 'lo': 1, 'hi': 2, 'n': 100}}); check('fest cannot set benchmark', e is not None, e)
b, _ = lead.rpc('bootstrap'); check('benchmarks visible to everyone', len(b['benchmarks']) == 1)
admin.rpc('admin_add_company', {'p': {'name': 'Cloudnest Technologies', 'cat': 'tech', 'city': 'Bengaluru', 'contactName': 'X', 'email': 'x@y.z'}})
b, _ = admin.rpc('bootstrap'); dupe = [c['id'] for c in b['companies'] if c['name'] == 'Cloudnest Technologies'][0]
r, e = admin.rpc('merge_companies', {'p': {'keepId': cloud, 'dropId': dupe}}); check('admin merges duplicate', e is None, e)
r, e = lead.rpc('mark_notifs_read'); b, _ = lead.rpc('bootstrap'); check('notifications marked read', all(n['read'] for n in b['notifs']))
r, e = lead.rpc('delete_account'); check('user deletes own account', e is None, e)
b, _ = lead.rpc('bootstrap'); check('deleted user has no profile', b['profile'] is None)
r, e = admin.rpc('delete_account'); check('sole admin cannot delete', e is not None, e)
print('FAILS:', fails)
