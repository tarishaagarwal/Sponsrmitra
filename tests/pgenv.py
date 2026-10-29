import pgserver, psycopg2, tempfile, json, uuid, os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
_SRV = None
SHIM = """
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
"""
def start(schema_path=str(ROOT / 'supabase' / 'schema.sql')):
    global _SRV
    d = tempfile.mkdtemp()
    _SRV = pgserver.get_server(d, cleanup_mode='stop')
    conn = psycopg2.connect(_SRV.get_uri()); conn.autocommit = True
    cur = conn.cursor(); cur.execute(SHIM); cur.execute(open(schema_path).read())
    return conn
def new_user(conn, email):
    cur = conn.cursor(); uid = str(uuid.uuid4())
    cur.execute("insert into auth.users(id,email) values (%s,%s)", (uid, email)); return uid
class Client:
    """Runs one function call as an authenticated user, like PostgREST does."""
    def __init__(self, uri, uid): self.uri = uri; self.uid = uid
    def rpc(self, fn, args=None, anon=False):
        c = psycopg2.connect(self.uri); cur = c.cursor()
        try:
            cur.execute("begin")
            cur.execute("set local role " + ("anon" if anon else "authenticated"))
            claims = {} if anon or not self.uid else {'sub': self.uid, 'role': 'authenticated'}
            cur.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps(claims),))
            if args is None: cur.execute("select %s()" % fn)
            else:
                names = list(args.keys())
                parts = []; vals = []
                for n in names:
                    if isinstance(args[n], str): parts.append('%s := %%s::text' % n); vals.append(args[n])
                    else: parts.append('%s := %%s::jsonb' % n); vals.append(json.dumps(args[n]))
                cur.execute("select %s(%s)" % (fn, ','.join(parts)), vals)
            row = cur.fetchone(); c.commit()
            v = row[0]
            if v == '': return None, None
            return (json.loads(v) if isinstance(v, str) else v), None
        except Exception as e:
            c.rollback(); return None, str(e).split('\n')[0].replace('ERROR:  ', '')
        finally: c.close()
def uri(): return _SRV.get_uri()
