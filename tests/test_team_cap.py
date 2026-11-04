import json, time, threading
import pgenv
from pgenv import Client
import psycopg2

conn = pgenv.start(); U = pgenv.uri()
fails = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + ((' :: ' + str(extra)) if (not cond and extra) else ''))
    if not cond: fails.append(name)
def mk(email): return Client(U, pgenv.new_user(conn, email))
now_ms = lambda: int(time.time() * 1000)

def make_fest(lead, fname):
    r, e = lead.rpc('register_fest', {'p': {'name': 'Lead One', 'fest': fname, 'college': 'X College', 'city': 'Pune', 'type': 'Technical', 'visitors': 1000, 'start': now_ms() + 100 * 86400000, 'audience': 'Students'}})
    assert e is None, e
    b, _ = lead.rpc('bootstrap')
    f = [x for x in b['fests'] if x['name'] == fname][0]
    return f['id'], f['joinCode'], f['viewCode']

# --- cap counts every fest profile: lead + members + convenor, 4 total ---
lead, m1, m2, conv, fifth = [mk(e + '@t.test') for e in ['cap_lead', 'cap_m1', 'cap_m2', 'cap_conv', 'cap_fifth']]
fid, jc, vc = make_fest(lead, 'Cap Fest')
r, e = m1.rpc('join_fest', {'p': {'name': 'Member One', 'code': jc}}); check('2nd person (member) joins', e is None, e)
r, e = m2.rpc('join_fest', {'p': {'name': 'Member Two', 'code': jc}}); check('3rd person (member) joins', e is None, e)
r, e = conv.rpc('join_fest', {'p': {'name': 'Faculty One', 'code': vc}}); check('4th person (view-only convenor) joins', e is None, e)
r, e = fifth.rpc('join_fest', {'p': {'name': 'Member Three', 'code': jc}}); check('5th person blocked even with valid edit code', e is not None and 'maximum of 4' in e, e)
b, _ = fifth.rpc('bootstrap'); check('blocked 5th person has no profile', b.get('profile') is None, b.get('profile'))
r, e = (mk('cap_fifthv@t.test')).rpc('join_fest', {'p': {'name': 'Faculty Two', 'code': vc}}); check('5th person blocked with view-only code too', e is not None and 'maximum of 4' in e, e)
cur = conn.cursor()
cur.execute("select count(*) from profiles where role='fest' and entity_id=%s", (fid,))
check('fest still has exactly 4 people', cur.fetchone()[0] == 4)

# --- race: two joins competing for the last slot, exactly one wins ---
lead2, a3, b3 = [mk(e + '@t.test') for e in ['race_lead', 'race_a', 'race_b']]
fid2, jc2, vc2 = make_fest(lead2, 'Race Fest')
r, e = (mk('race_m1@t.test')).rpc('join_fest', {'p': {'name': 'M1', 'code': jc2}}); assert e is None, e
# fest now has lead + 1 member = 2; lock the fest row, add a 3rd directly, then release
lock = psycopg2.connect(U); lock.autocommit = False
lc = lock.cursor()
lc.execute("begin; select id from entities where id=%s for update", (fid2,))
result = {}
def contender():
    r, e = a3.rpc('join_fest', {'p': {'name': 'Contender', 'code': jc2}})
    result['r'], result['e'] = r, e
t = threading.Thread(target=contender); t.start()
time.sleep(1.5)  # contender is now blocked on the row lock
uid3 = pgenv.new_user(conn, 'race_m2@t.test')
lc.execute("insert into profiles (id, email, name, initials, role, fest_role, entity_id, title) values (%s, 'race_m2@t.test', 'M2', 'M2', 'fest', 'member', %s, 'Team member')", (uid3, fid2))
lock.commit()  # slot 3 taken; contender should now see 3... wait, count is lead+m1+m2 = 3, contender becomes 4th - allowed
t.join(10)
check('contender joins as 4th after lock release', result.get('e') is None, result.get('e'))
# now at 4; repeat the race with a 5th blocked behind a lock that adds nobody
lock2 = psycopg2.connect(U); lc2 = lock2.cursor()
lc2.execute("begin; select id from entities where id=%s for update", (fid2,))
result2 = {}
late = mk('race_late@t.test')
def contender2():
    r, e = late.rpc('join_fest', {'p': {'name': 'Late', 'code': jc2}})
    result2['r'], result2['e'] = r, e
t2 = threading.Thread(target=contender2); t2.start()
time.sleep(1.5)
lc2.execute("select count(*) from profiles where role='fest' and entity_id=%s", (fid2,))
held_count = lc2.fetchone()[0]
lock2.commit(); t2.join(10)
check('count seen under lock was already 4', held_count == 4, held_count)
check('5th concurrent join blocked after lock release', result2.get('e') is not None and 'maximum of 4' in result2['e'], result2.get('e'))
cur.execute("select count(*) from profiles where role='fest' and entity_id=%s", (fid2,))
check('race fest ends with exactly 4 people', cur.fetchone()[0] == 4)

print()
print('FAILURES:', fails if fails else 'none')
