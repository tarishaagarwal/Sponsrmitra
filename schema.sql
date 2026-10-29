-- =====================================================================
-- SponsrMitra backend for Supabase (Postgres)
-- Run this whole file once in the Supabase SQL editor.
--
-- Design: the browser never touches tables directly. Every read and write
-- goes through the functions below, which check who is calling and what
-- they are allowed to see or change.
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null,
  initials text not null,
  role text not null check (role in ('fest', 'brand', 'alumni', 'admin')),
  fest_role text check (fest_role in ('lead', 'member', 'convenor')),
  entity_id text,
  title text,
  created_at timestamptz not null default now()
);
create index if not exists profiles_entity_idx on public.profiles (role, entity_id);

create table if not exists public.entities (
  kind text not null check (kind in ('fests', 'companies', 'alumni', 'pipeline', 'shortlists', 'intros', 'requests', 'archive', 'reports', 'audit', 'benchmarks')),
  id text not null,
  data jsonb not null,
  fest_id text,
  company_id text,
  alumnus_id text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);
create index if not exists entities_fest_idx on public.entities (kind, fest_id);
create index if not exists entities_company_idx on public.entities (kind, company_id);
create index if not exists entities_alumnus_idx on public.entities (kind, alumnus_id);
create unique index if not exists entities_one_pipeline_per_pair on public.entities (fest_id, company_id) where kind = 'pipeline';

create table if not exists public.notifs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  link text not null default '',
  ts bigint not null,
  read boolean not null default false
);
create index if not exists notifs_user_idx on public.notifs (user_id, ts desc);

alter table public.profiles enable row level security;
alter table public.entities enable row level security;
alter table public.notifs enable row level security;
revoke all on public.profiles, public.entities, public.notifs from anon, authenticated;

-- ---------- small helpers (never exposed to the browser) ----------
create or replace function public._ms() returns bigint language sql stable as $$
  select (extract(epoch from clock_timestamp()) * 1000)::bigint
$$;

create or replace function public._rid(prefix text) returns text language sql volatile as $$
  select prefix || substr(md5(random()::text || clock_timestamp()::text || random()::text), 1, 12)
$$;

create or replace function public._out(e public.entities) returns jsonb language sql immutable as $$
  select e.data || jsonb_build_object('id', e.id, '_v', e.version)
$$;

create or replace function public._name(k text, i text) returns text language sql stable as $$
  select data->>'name' from public.entities where kind = k and id = i
$$;

create or replace function public._uname(u uuid) returns text language sql stable as $$
  select name from public.profiles where id = u
$$;

create or replace function public._team(fid text, include_convenor boolean) returns uuid[] language sql stable as $$
  select coalesce(array_agg(id), '{}') from public.profiles
  where role = 'fest' and entity_id = fid and (include_convenor or fest_role <> 'convenor')
$$;

create or replace function public._admins() returns uuid[] language sql stable as $$
  select coalesce(array_agg(id), '{}') from public.profiles where role = 'admin'
$$;

create or replace function public._notify(ids uuid[], t text, l text) returns void language sql volatile as $$
  insert into public.notifs (user_id, text, link, ts)
  select distinct x, t, coalesce(l, ''), public._ms() from unnest(ids) as x where x is not null
$$;

create or replace function public._audit(t text) returns void language sql volatile as $$
  insert into public.entities (kind, id, data)
  values ('audit', public._rid('au_'), jsonb_build_object('by', auth.uid()::text, 'ts', public._ms(), 'text', t))
$$;

create or replace function public._changed(od jsonb, nd jsonb) returns text[] language sql immutable as $$
  select coalesce(array_agg(k), '{}') from (
    select k from jsonb_object_keys(coalesce(od, '{}'::jsonb)) k
    union
    select k from jsonb_object_keys(coalesce(nd, '{}'::jsonb)) k
  ) s
  where k not in ('id', '_v') and (od -> k) is distinct from (nd -> k)
$$;

create or replace function public._only(ch text[], allowed text[]) returns void language plpgsql immutable as $$
begin
  if exists (select 1 from unnest(ch) x where x <> all (allowed)) then
    raise exception 'You cannot change that';
  end if;
end $$;

-- ---------- triggers on entities ----------
create or replace function public._entities_before() returns trigger language plpgsql as $$
begin
  new.data := new.data || jsonb_build_object('id', new.id);
  new.fest_id := case new.kind when 'fests' then new.id else new.data->>'festId' end;
  new.company_id := case new.kind when 'companies' then new.id else new.data->>'companyId' end;
  new.alumnus_id := case new.kind when 'alumni' then new.id when 'intros' then new.data->>'alumnusId' else null end;
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.version := old.version + 1; end if;
  return new;
end $$;

drop trigger if exists entities_before on public.entities;
create trigger entities_before before insert or update on public.entities
for each row execute function public._entities_before();

create or replace function public._entities_after() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  fname text; cname text; aname text; st text; ost text; fid text; reason text; el text;
begin
  st := new.data->>'status';
  ost := case when tg_op = 'UPDATE' then old.data->>'status' else null end;

  if new.kind = 'intros' then
    fname := coalesce(_name('fests', new.fest_id), 'a fest');
    cname := coalesce(_name('companies', new.company_id), 'a company');
    aname := coalesce(_name('alumni', new.alumnus_id), 'An alumnus');
    if tg_op = 'INSERT' then
      perform _notify((select coalesce(array_agg(id), '{}') from profiles where role = 'alumni' and entity_id = new.alumnus_id),
        coalesce(_uname((new.data->>'by')::uuid), 'A student') || ' asked you to introduce ' || fname || ' to ' || cname, '#/a/inbox');
    elsif st is distinct from ost and st in ('accepted', 'declined', 'redirected') then
      perform _notify(_team(new.fest_id, false),
        case st when 'accepted' then aname || ' accepted and will introduce ' || fname || ' to ' || cname
                when 'declined' then aname || ' could not introduce ' || fname || ' this time'
                else aname || ' suggested someone else for ' || cname end, '#/alumni');
    end if;

  elsif new.kind = 'requests' then
    fname := coalesce(_name('fests', new.fest_id), 'A fest');
    cname := coalesce(_name('companies', new.company_id), 'A company');
    if tg_op = 'INSERT' then
      perform _notify((select coalesce(array_agg(id), '{}') from profiles where role = 'brand' and entity_id = new.company_id),
        fname || ' sent a sponsorship request', '#/b/inbox');
    elsif st is distinct from ost and st in ('accepted', 'declined', 'question') then
      reason := coalesce(new.data->>'reason', '');
      perform _notify(_team(new.fest_id, false),
        case st when 'accepted' then cname || ' accepted your sponsorship request'
                when 'declined' then cname || ' declined: ' || lower(reason)
                else cname || ' has a question about your request' end, '#/pipeline');
    end if;

  elsif new.kind in ('fests', 'companies', 'alumni') then
    if tg_op = 'INSERT' and st = 'pending' then
      perform _notify(_admins(), coalesce(new.data->>'name', 'A new listing') || ' is waiting for verification', '#/ad/verify');
    elsif tg_op = 'UPDATE' and st is distinct from ost and st in ('verified', 'rejected') then
      perform _notify(
        (select coalesce(array_agg(id), '{}') from profiles where entity_id = new.id and role = case new.kind when 'fests' then 'fest' when 'companies' then 'brand' else 'alumni' end),
        case when st = 'verified' then coalesce(new.data->>'name', 'You') || ' is verified' else coalesce(new.data->>'name', 'Your listing') || ' was not approved' end,
        case new.kind when 'fests' then '#/home' when 'companies' then '#/b/dash' else '#/a/inbox' end);
    end if;
    if new.kind = 'companies' and tg_op = 'UPDATE' and (new.data->'invited') is distinct from (old.data->'invited') then
      for el in select jsonb_array_elements_text(coalesce(new.data->'invited', '[]'::jsonb)) loop
        if not (coalesce(old.data->'invited', '[]'::jsonb) ? el) then
          perform _notify(_team(el, false), coalesce(new.data->>'name', 'A brand') || ' invited ' || coalesce(_name('fests', el), 'your fest') || ' to send a pitch', '#/company/' || new.id);
        end if;
      end loop;
    end if;

  elsif new.kind = 'reports' and tg_op = 'INSERT' then
    perform _notify(_admins(), 'New report: ' || coalesce(new.data->>'kind', 'problem'), '#/ad/reports');
  end if;
  return null;
end $$;

drop trigger if exists entities_after on public.entities;
create trigger entities_after after insert or update on public.entities
for each row execute function public._entities_after();

-- ---------- permission rules for ordinary edits ----------
create or replace function public._check(p public.profiles, k text, op text, i text, od jsonb, nd jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare ch text[]; fid text; el text;
begin
  if k not in ('fests', 'companies', 'alumni', 'pipeline', 'shortlists', 'archive', 'reports', 'audit', 'benchmarks') then
    raise exception 'Not allowed';
  end if;

  if p.role = 'fest' then
    if p.fest_role = 'convenor' then raise exception 'You have view-only access'; end if;
    fid := p.entity_id;
    if k = 'fests' then
      if op <> 'update' or i <> fid then raise exception 'Not allowed'; end if;
      perform _only(_changed(od, nd), array['name', 'college', 'city', 'type', 'visitors', 'start', 'audience', 'pastSponsors', 'target', 'packages', 'proof', 'handover', 'contribs', 'contributed']);
      return nd;
    elsif k = 'pipeline' then
      if coalesce(nd->>'festId', od->>'festId') is distinct from fid then raise exception 'Not allowed'; end if;
      if op = 'delete' then
        if od->>'stage' = 'committed' then raise exception 'A recorded deal cannot be removed'; end if;
        return null;
      end if;
      if (nd->>'stage') is null or (nd->>'stage') <> all (array['shortlisted', 'intro', 'contacted', 'replied', 'meeting', 'negotiating', 'committed', 'declined']) then
        raise exception 'Unknown stage';
      end if;
      if not exists (select 1 from entities where kind = 'companies' and id = nd->>'companyId') then raise exception 'Unknown company'; end if;
      if nd->>'owner' is not null and not exists (select 1 from profiles where id = (nd->>'owner')::uuid and role = 'fest' and entity_id = fid and fest_role <> 'convenor') then
        raise exception 'The owner must be on your team';
      end if;
      if op = 'update' then
        if nd->>'companyId' is distinct from od->>'companyId' or nd->>'festId' is distinct from od->>'festId' then raise exception 'Not allowed'; end if;
        if od ? 'shareToken' then nd := nd || jsonb_build_object('shareToken', od->'shareToken'); else nd := nd - 'shareToken'; end if;
      else
        nd := nd - 'shareToken';
      end if;
      if nd->>'stage' = 'committed' and not (nd ? 'shareToken') then
        nd := nd || jsonb_build_object('shareToken', gen_random_uuid()::text);
      end if;
      return nd;
    elsif k = 'shortlists' then
      if coalesce(nd->>'festId', od->>'festId') is distinct from fid then raise exception 'Not allowed'; end if;
      return nd;
    elsif k = 'archive' then
      if op <> 'insert' or nd->>'festId' is distinct from fid then raise exception 'Not allowed'; end if;
      return nd;
    elsif k = 'reports' then
      if op <> 'insert' then raise exception 'Not allowed'; end if;
      return nd || jsonb_build_object('by', p.id::text, 'status', 'open', 'ts', _ms());
    end if;
    raise exception 'Not allowed';

  elsif p.role = 'brand' then
    if k = 'companies' then
      if op <> 'update' or i <> p.entity_id then raise exception 'Not allowed'; end if;
      ch := _changed(od, nd);
      perform _only(ch, array['city', 'band', 'tags', 'contact', 'inbound', 'visible', 'invited', 'sub', 'status']);
      if 'status' = any (ch) and not (od->>'status' = 'verified' and nd->>'status' = 'pending') then
        raise exception 'Only the verification desk can change verification';
      end if;
      if (od->'contact'->>'email') is distinct from (nd->'contact'->>'email') and od->>'status' = 'verified' then
        nd := nd || jsonb_build_object('status', 'pending');
      end if;
      for el in select jsonb_array_elements_text(coalesce(nd->'invited', '[]'::jsonb)) loop
        if not (coalesce(od->'invited', '[]'::jsonb) ? el) and not exists (select 1 from entities where kind = 'fests' and id = el and data->>'status' = 'verified') then
          raise exception 'Unknown fest';
        end if;
      end loop;
      return nd;
    elsif k = 'reports' then
      if op <> 'insert' then raise exception 'Not allowed'; end if;
      return nd || jsonb_build_object('by', p.id::text, 'status', 'open', 'ts', _ms());
    end if;
    raise exception 'Not allowed';

  elsif p.role = 'alumni' then
    if k = 'alumni' then
      if op <> 'update' or i <> p.entity_id then raise exception 'Not allowed'; end if;
      perform _only(_changed(od, nd), array['role', 'helps', 'cap']);
      return nd;
    elsif k = 'reports' then
      if op <> 'insert' then raise exception 'Not allowed'; end if;
      return nd || jsonb_build_object('by', p.id::text, 'status', 'open', 'ts', _ms());
    end if;
    raise exception 'Not allowed';

  elsif p.role = 'admin' then
    if k = 'audit' then
      if op <> 'insert' then raise exception 'Not allowed'; end if;
      return nd || jsonb_build_object('by', p.id::text, 'ts', _ms());
    end if;
    return nd;
  end if;
  raise exception 'Not allowed';
end $$;

create or replace function public.apply_changes(changes jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  p profiles; c jsonb; k text; i text; op text; nd jsonb; od jsonb; cur entities;
  versions jsonb := '{}'::jsonb; basev int; newv int;
begin
  select * into p from profiles where id = auth.uid();
  if not found then raise exception 'Sign in first' using errcode = '28000'; end if;
  if jsonb_typeof(changes) <> 'array' then raise exception 'Bad request'; end if;
  if jsonb_array_length(changes) > 60 then raise exception 'Too many changes at once'; end if;
  for c in select * from jsonb_array_elements(changes) loop
    k := c->>'kind'; i := c->>'id'; op := coalesce(c->>'op', 'upsert');
    if i is null or length(i) < 3 or length(i) > 64 then raise exception 'Bad id'; end if;
    nd := (c->'data') - '_v';
    if nd is not null and pg_column_size(nd) > 900000 then raise exception 'That item is too large'; end if;
    select * into cur from entities where kind = k and id = i for update;
    if op = 'delete' then
      if not found then continue; end if;
      perform _check(p, k, 'delete', i, cur.data, null);
      delete from entities where kind = k and id = i;
      versions := versions || jsonb_build_object(k || '|' || i, 0);
    else
      if nd is null or jsonb_typeof(nd) <> 'object' then raise exception 'Bad data'; end if;
      nd := nd || jsonb_build_object('id', i);
      if found then
        basev := coalesce((c->>'baseV')::int, 0);
        if basev <> cur.version then raise exception 'conflict' using errcode = '40001'; end if;
        nd := _check(p, k, 'update', i, cur.data, nd);
        update entities set data = nd where kind = k and id = i;
        select version into newv from entities where kind = k and id = i;
      else
        nd := _check(p, k, 'insert', i, null, nd);
        insert into entities (kind, id, data) values (k, i, nd);
        newv := 1;
      end if;
      versions := versions || jsonb_build_object(k || '|' || i, newv);
    end if;
  end loop;
  return jsonb_build_object('versions', versions);
end $$;

-- ---------- pipeline helper used by the cross-role actions ----------
create or replace function public._upsert_pipeline(fid text, cid text, by uuid, stg text, ask numeric, act text, promote text[]) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare e entities; item jsonb; owner uuid; nid text; entry jsonb;
begin
  entry := jsonb_build_object('id', _rid('ac_'), 'ts', _ms(), 'by', by::text, 'text', act);
  select * into e from entities where kind = 'pipeline' and fest_id = fid and company_id = cid for update;
  if found then
    item := e.data;
    if stg is not null and (promote is null or item->>'stage' = any (promote)) then item := item || jsonb_build_object('stage', stg); end if;
    if ask is not null and ask > 0 then item := item || jsonb_build_object('ask', ask); end if;
    item := item || jsonb_build_object('activity', jsonb_build_array(entry) || coalesce(item->'activity', '[]'::jsonb), 'lastTouch', _ms());
    update entities set data = item where kind = 'pipeline' and id = e.id;
    return e.id;
  end if;
  if exists (select 1 from profiles where id = by and role = 'fest' and entity_id = fid and fest_role <> 'convenor') then
    owner := by;
  else
    select id into owner from profiles where role = 'fest' and entity_id = fid and fest_role <> 'convenor' order by (fest_role = 'lead') desc, created_at limit 1;
  end if;
  nid := _rid('p_');
  item := jsonb_build_object('id', nid, 'festId', fid, 'companyId', cid, 'stage', coalesce(stg, 'shortlisted'), 'owner', owner::text,
    'ask', coalesce(ask, 0), 'amount', 0, 'followUp', null, 'meetingAt', null, 'lastTouch', _ms(), 'createdAt', _ms(),
    'notes', '[]'::jsonb, 'activity', jsonb_build_array(entry), 'decline', null, 'deckSent', false,
    'payments', '[]'::jsonb, 'deliverables', '[]'::jsonb, 'proof', '[]'::jsonb, 'committedOn', null, 'kind', 'cash');
  insert into entities (kind, id, data) values ('pipeline', nid, item);
  return nid;
end $$;

create or replace function public._add_activity(fid text, cid text, by uuid, act text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare e entities;
begin
  select * into e from entities where kind = 'pipeline' and fest_id = fid and company_id = cid for update;
  if found then
    update entities set data = e.data || jsonb_build_object(
      'activity', jsonb_build_array(jsonb_build_object('id', _rid('ac_'), 'ts', _ms(), 'by', by::text, 'text', act)) || coalesce(e.data->'activity', '[]'::jsonb),
      'lastTouch', _ms())
    where kind = 'pipeline' and id = e.id;
  end if;
end $$;

-- ---------- fest team actions ----------
create or replace function public.send_intro(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; fest entities; comp entities; alum entities; fid text; cid text; aid text; used int; msg text; ask numeric; iid text; pid text;
begin
  select * into me from profiles where id = auth.uid();
  if not found or me.role <> 'fest' or me.fest_role = 'convenor' then raise exception 'Only fest team members can do this'; end if;
  fid := me.entity_id; cid := p->>'companyId'; aid := p->>'alumnusId';
  select * into fest from entities where kind = 'fests' and id = fid;
  if fest.data->>'status' <> 'verified' then raise exception 'Your fest needs to be verified first'; end if;
  select * into comp from entities where kind = 'companies' and id = cid;
  if not found or comp.data->>'status' <> 'verified' then raise exception 'That company is not available'; end if;
  select * into alum from entities where kind = 'alumni' and id = aid;
  if not found or alum.data->>'status' <> 'verified' or alum.data->>'companyId' <> cid
     or alum.data->>'college' <> fest.data->>'college' or alum.data->>'helps' <> 'introduce' then
    raise exception 'That alumnus cannot introduce you';
  end if;
  select count(*) into used from entities where kind = 'intros' and alumnus_id = aid
    and (data->>'createdAt')::bigint >= _ms() - 30::bigint * 86400000 and data->>'status' <> 'declined';
  if used >= coalesce((alum.data->>'cap')::int, 3) then raise exception '% has reached the monthly limit', alum.data->>'name'; end if;
  msg := trim(coalesce(p->>'message', ''));
  if msg = '' or length(msg) > 2000 then raise exception 'Write a short message first'; end if;
  ask := coalesce((p->>'ask')::numeric, 0);
  iid := _rid('i_');
  insert into entities (kind, id, data) values ('intros', iid, jsonb_build_object('festId', fid, 'companyId', cid, 'alumnusId', aid,
    'by', me.id::text, 'ask', ask, 'message', msg, 'status', 'sent', 'createdAt', _ms(), 'respondedAt', null));
  pid := _upsert_pipeline(fid, cid, me.id, 'intro', ask, 'Asked ' || (alum.data->>'name') || ' for an introduction', null);
  return jsonb_build_object('introId', iid, 'pipelineId', pid);
end $$;

create or replace function public.send_pitch(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; fest entities; comp entities; fid text; cid text; msg text; ask numeric; rid text; pid text; wk int; ftype text;
begin
  select * into me from profiles where id = auth.uid();
  if not found or me.role <> 'fest' or me.fest_role = 'convenor' then raise exception 'Only fest team members can do this'; end if;
  fid := me.entity_id; cid := p->>'companyId';
  select * into fest from entities where kind = 'fests' and id = fid;
  if fest.data->>'status' <> 'verified' then raise exception 'Your fest needs to be verified first'; end if;
  select * into comp from entities where kind = 'companies' and id = cid;
  if not found or comp.data->>'status' <> 'verified' then raise exception 'That company is not available'; end if;
  if coalesce((comp.data->'inbound'->>'paused')::boolean, false) then raise exception '% has paused new requests', comp.data->>'name'; end if;
  ftype := fest.data->>'type';
  if comp.data->'inbound'->'types' is not null and not (comp.data->'inbound'->'types' ? ftype) then
    raise exception '% is not taking % fests right now', comp.data->>'name', ftype;
  end if;
  select count(*) into wk from entities where kind = 'requests' and company_id = cid and (data->>'createdAt')::bigint > _ms() - 7::bigint * 86400000;
  if wk >= coalesce((comp.data->'inbound'->>'weeklyCap')::int, 6) then raise exception '% is at its weekly limit. Try again next week.', comp.data->>'name'; end if;
  if exists (select 1 from entities where kind = 'requests' and fest_id = fid and company_id = cid and data->>'status' in ('new', 'question')) then
    raise exception 'You already have an open request with %', comp.data->>'name';
  end if;
  msg := trim(coalesce(p->>'message', ''));
  if msg = '' or length(msg) > 2000 then raise exception 'Write a short message first'; end if;
  ask := coalesce((p->>'ask')::numeric, 0);
  rid := _rid('r_');
  insert into entities (kind, id, data) values ('requests', rid, jsonb_build_object('festId', fid, 'companyId', cid, 'ask', ask,
    'message', msg, 'status', 'new', 'reason', '', 'createdAt', _ms(), 'by', me.id::text));
  pid := _upsert_pipeline(fid, cid, me.id, 'contacted', ask, 'Sent a pitch request', array['shortlisted', 'intro']);
  return jsonb_build_object('requestId', rid, 'pipelineId', pid);
end $$;

-- ---------- brand and alumnus replies ----------
create or replace function public.respond_request(p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; r entities; act text; txt text; reason text; cname text; pid text; fid text; cid text;
begin
  select * into me from profiles where id = auth.uid();
  if not found or me.role <> 'brand' then raise exception 'Only brands can do this'; end if;
  select * into r from entities where kind = 'requests' and id = p->>'requestId' for update;
  if not found or r.company_id <> me.entity_id then raise exception 'Request not found'; end if;
  if r.data->>'status' not in ('new', 'question') then raise exception 'You already answered this request'; end if;
  act := p->>'action'; txt := trim(coalesce(p->>'text', '')); reason := left(trim(coalesce(p->>'reason', '')), 200);
  fid := r.fest_id; cid := r.company_id; cname := coalesce(_name('companies', cid), 'The brand');
  if act = 'accept' then
    update entities set data = data || jsonb_build_object('status', 'accepted', 'respondedAt', _ms()) where kind = 'requests' and id = r.id;
    perform _upsert_pipeline(fid, cid, me.id, 'replied', null, cname || ' accepted your request. ' || split_part(me.name, ' ', 1) || ' will be in touch.', array['shortlisted', 'intro', 'contacted']);
  elsif act = 'decline' then
    if reason = '' then raise exception 'Choose a reason'; end if;
    update entities set data = data || jsonb_build_object('status', 'declined', 'reason', reason, 'respondedAt', _ms()) where kind = 'requests' and id = r.id;
    pid := _upsert_pipeline(fid, cid, me.id, 'declined', null, cname || ' declined: ' || lower(reason), null);
    update entities set data = data || jsonb_build_object('decline', reason) where kind = 'pipeline' and id = pid;
  elsif act = 'ask' then
    if txt = '' or length(txt) > 1000 then raise exception 'Write your question'; end if;
    update entities set data = data || jsonb_build_object('status', 'question', 'question', txt) where kind = 'requests' and id = r.id;
    perform _upsert_pipeline(fid, cid, me.id, 'replied', null, cname || ' asked: ' || txt, array['shortlisted', 'intro', 'contacted']);
  elsif act = 'forward' then
    update entities set data = data || jsonb_build_object('forwarded', true) where kind = 'requests' and id = r.id;
  else
    raise exception 'Unknown action';
  end if;
end $$;

create or replace function public.respond_intro(p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; i entities; act text; aname text; fname text; cname text; txt text; st text; rn text;
begin
  select * into me from profiles where id = auth.uid();
  if not found or me.role <> 'alumni' then raise exception 'Only alumni can do this'; end if;
  select * into i from entities where kind = 'intros' and id = p->>'introId' for update;
  if not found or i.alumnus_id <> me.entity_id then raise exception 'Request not found'; end if;
  if i.data->>'status' not in ('sent', 'seen') then raise exception 'You already answered this request'; end if;
  act := p->>'action'; rn := left(trim(coalesce(p->>'redirectName', '')), 120);
  aname := coalesce(_name('alumni', i.alumnus_id), me.name); fname := coalesce(_name('fests', i.fest_id), 'the fest'); cname := coalesce(_name('companies', i.company_id), 'the company');
  if act = 'accept' then st := 'accepted'; txt := aname || ' accepted and will introduce ' || fname || ' to ' || cname;
  elsif act = 'decline' then st := 'declined'; txt := aname || ' could not introduce ' || fname || ' this time';
  elsif act = 'redirect' then
    if rn = '' then raise exception 'Name someone first'; end if;
    st := 'redirected'; txt := aname || ' suggested ' || rn || ' for ' || cname;
  else raise exception 'Unknown action'; end if;
  update entities set data = data || jsonb_build_object('status', st, 'respondedAt', _ms()) || case when st = 'redirected' then jsonb_build_object('redirectName', rn) else '{}'::jsonb end
  where kind = 'intros' and id = i.id;
  perform _add_activity(i.fest_id, i.company_id, me.id, txt);
end $$;

create or replace function public.mark_intros_seen() returns void
language sql security definer set search_path = public, pg_temp as $$
  update entities e set data = e.data || jsonb_build_object('status', 'seen')
  where e.kind = 'intros' and e.data->>'status' = 'sent'
    and e.alumnus_id = (select entity_id from profiles where id = auth.uid() and role = 'alumni')
$$;

-- ---------- registration ----------
create or replace function public._need_new_profile() returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare em text;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '28000'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'You already have an account'; end if;
  select email into em from auth.users where id = auth.uid();
  return em;
end $$;

create or replace function public._initials(n text) returns text language sql immutable as $$
  select upper(coalesce(string_agg(left(w, 1), ''), '?')) from (select w from unnest(regexp_split_to_array(trim(n), '\s+')) w where w <> '' limit 2) s
$$;

create or replace function public.register_fest(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare em text; fid text; nm text; fn text;
begin
  em := _need_new_profile();
  nm := trim(coalesce(p->>'name', '')); fn := trim(coalesce(p->>'fest', ''));
  if nm = '' or fn = '' or trim(coalesce(p->>'college', '')) = '' or trim(coalesce(p->>'city', '')) = '' then raise exception 'Please fill in every field'; end if;
  if (p->>'type') <> all (array['Technical', 'Cultural', 'Management', 'Sports', 'Society or department']) then raise exception 'Choose a fest type'; end if;
  fid := _rid('f_');
  insert into entities (kind, id, data) values ('fests', fid, jsonb_build_object(
    'name', fn, 'college', trim(p->>'college'), 'city', trim(p->>'city'), 'type', p->>'type',
    'visitors', coalesce((p->>'visitors')::int, 0), 'start', (p->>'start')::bigint,
    'audience', coalesce(nullif(trim(p->>'audience'), ''), 'Students of ' || trim(p->>'college')),
    'pastSponsors', '[]'::jsonb, 'status', 'pending', 'verifiedOn', null, 'contributed', false, 'target', 0,
    'packages', '[]'::jsonb, 'proof', jsonb_build_object('footfall', null, 'photos', '[]'::jsonb, 'logos', '[]'::jsonb, 'testimonials', '[]'::jsonb),
    'handover', '{}'::jsonb, 'joinCode', upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)), 'viewCode', upper(substr(md5(random()::text || clock_timestamp()::text || 'v'), 1, 8))));
  insert into profiles (id, email, name, initials, role, fest_role, entity_id, title)
  values (auth.uid(), em, nm, _initials(nm), 'fest', 'lead', fid, 'Sponsorship lead, ' || fn);
  return jsonb_build_object('festId', fid);
end $$;

create or replace function public.join_fest(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare em text; f entities; nm text; code text; fr text;
begin
  em := _need_new_profile();
  nm := trim(coalesce(p->>'name', '')); code := upper(trim(coalesce(p->>'code', '')));
  if nm = '' or code = '' then raise exception 'Enter your name and the team code'; end if;
  select * into f from entities where kind = 'fests' and (data->>'joinCode' = code or data->>'viewCode' = code) limit 1;
  if not found then raise exception 'That team code does not match a fest'; end if;
  fr := case when f.data->>'joinCode' = code then 'member' else 'convenor' end;
  insert into profiles (id, email, name, initials, role, fest_role, entity_id, title)
  values (auth.uid(), em, nm, _initials(nm), 'fest', fr, f.id, case when fr = 'member' then 'Team member' else 'Convenor, view only' end);
  return jsonb_build_object('festId', f.id);
end $$;

create or replace function public.register_brand(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare em text; cid text; nm text; cn text; tags jsonb;
begin
  em := _need_new_profile();
  nm := trim(coalesce(p->>'name', '')); cn := trim(coalesce(p->>'company', ''));
  if nm = '' or cn = '' or trim(coalesce(p->>'role', '')) = '' or trim(coalesce(p->>'city', '')) = '' or trim(coalesce(p->>'email', '')) = '' then raise exception 'Please fill in every field'; end if;
  if (p->>'cat') <> all (array['tech', 'bev', 'local', 'bank', 'app', 'edu', 'media']) then raise exception 'Choose a category'; end if;
  tags := case when jsonb_typeof(p->'tags') = 'array' and jsonb_array_length(p->'tags') > 0 then p->'tags' else '["Cash"]'::jsonb end;
  cid := _rid('c_');
  insert into entities (kind, id, data) values ('companies', cid, jsonb_build_object(
    'name', cn, 'sub', coalesce(nullif(trim(p->>'sub'), ''), 'Company'), 'cat', p->>'cat', 'city', trim(p->>'city'), 'tags', tags, 'band', 'Under 1L',
    'color', coalesce(nullif(p->>'color', ''), '#1F5C56'),
    'contact', jsonb_build_object('name', nm, 'role', trim(p->>'role'), 'email', trim(p->>'email'), 'channel', 'Email', 'replyDays', 5),
    'verifiedOn', null, 'status', 'pending', 'bench', jsonb_build_object('lo', 0, 'hi', 0, 'n', 0), 'past', '[]'::jsonb,
    'inbound', jsonb_build_object('paused', false, 'weeklyCap', 6, 'types', '["Technical","Cultural","Management","Sports","Society or department"]'::jsonb),
    'visible', jsonb_build_object('email', false, 'band', true)));
  insert into profiles (id, email, name, initials, role, entity_id, title)
  values (auth.uid(), em, nm, _initials(nm), 'brand', cid, trim(p->>'role') || ', ' || cn);
  return jsonb_build_object('companyId', cid);
end $$;

create or replace function public.register_alumnus(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare em text; aid text; nm text; cname text;
begin
  em := _need_new_profile();
  nm := trim(coalesce(p->>'name', ''));
  if nm = '' or trim(coalesce(p->>'college', '')) = '' or trim(coalesce(p->>'role', '')) = '' then raise exception 'Please fill in every field'; end if;
  select data->>'name' into cname from entities where kind = 'companies' and id = p->>'companyId' and data->>'status' = 'verified';
  if cname is null then raise exception 'Choose a listed company'; end if;
  aid := _rid('a_');
  insert into entities (kind, id, data) values ('alumni', aid, jsonb_build_object(
    'name', nm, 'initials', _initials(nm), 'cohort', coalesce((p->>'cohort')::int, 0), 'companyId', p->>'companyId', 'role', trim(p->>'role'),
    'helps', case when p->>'helps' = 'advise' then 'advise' else 'introduce' end, 'cap', least(greatest(coalesce((p->>'cap')::int, 3), 1), 10),
    'college', trim(p->>'college'), 'status', 'pending', 'userId', auth.uid()::text));
  insert into profiles (id, email, name, initials, role, entity_id, title)
  values (auth.uid(), em, nm, _initials(nm), 'alumni', aid, 'Alumnus, ' || cname);
  return jsonb_build_object('alumnusId', aid);
end $$;

-- ---------- verification desk ----------
create or replace function public._require_admin() returns profiles language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles;
begin
  select * into me from profiles where id = auth.uid();
  if not found or me.role <> 'admin' then raise exception 'Only the verification desk can do this'; end if;
  return me;
end $$;

create or replace function public.verify_entity(p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; k text; e entities; method text; newemail text; label text;
begin
  me := _require_admin();
  k := p->>'kind'; method := left(coalesce(p->>'method', 'Checked'), 200); newemail := trim(coalesce(p->>'newEmail', ''));
  if k not in ('fests', 'companies', 'alumni') then raise exception 'Unknown kind'; end if;
  select * into e from entities where kind = k and id = p->>'id' for update;
  if not found then raise exception 'Not found'; end if;
  update entities set data = data || jsonb_build_object('status', 'verified', 'verifiedOn', _ms()) where kind = k and id = e.id;
  if k = 'companies' and newemail <> '' then
    update entities set data = jsonb_set(data, '{contact,email}', to_jsonb(newemail)) where kind = k and id = e.id;
  end if;
  label := case k when 'fests' then 'fest ' when 'companies' then 'contact for ' else 'alumnus ' end;
  perform _audit('Verified ' || label || (e.data->>'name') || ' (' || method || ')');
end $$;

create or replace function public.reject_entity(p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; k text; e entities;
begin
  me := _require_admin();
  k := p->>'kind';
  if k not in ('fests', 'companies', 'alumni') then raise exception 'Unknown kind'; end if;
  select * into e from entities where kind = k and id = p->>'id' for update;
  if not found then raise exception 'Not found'; end if;
  update entities set data = data || jsonb_build_object('status', 'rejected') where kind = k and id = e.id;
  perform _audit('Rejected ' || k || ' ' || (e.data->>'name'));
end $$;

create or replace function public.merge_companies(p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; keep text; drop_ text; kn text; dn text; r record;
begin
  me := _require_admin();
  keep := p->>'keepId'; drop_ := p->>'dropId';
  if keep = drop_ or not exists (select 1 from entities where kind = 'companies' and id = keep) or not exists (select 1 from entities where kind = 'companies' and id = drop_) then raise exception 'Choose two different companies'; end if;
  kn := _name('companies', keep); dn := _name('companies', drop_);
  for r in select * from entities where kind = 'pipeline' and company_id = drop_ loop
    if exists (select 1 from entities where kind = 'pipeline' and fest_id = r.fest_id and company_id = keep) then
      delete from entities where kind = 'pipeline' and id = r.id;
    else
      update entities set data = data || jsonb_build_object('companyId', keep) where kind = 'pipeline' and id = r.id;
    end if;
  end loop;
  update entities set data = data || jsonb_build_object('companyId', keep) where kind in ('requests', 'intros', 'alumni') and data->>'companyId' = drop_;
  update entities set data = jsonb_set(data, '{companyIds}', (
    select coalesce(jsonb_agg(distinct case when x = drop_ then keep else x end), '[]'::jsonb) from jsonb_array_elements_text(data->'companyIds') x))
  where kind = 'shortlists' and (data->'companyIds') ? drop_;
  update profiles set entity_id = keep where role = 'brand' and entity_id = drop_;
  delete from entities where kind = 'companies' and id = drop_;
  perform _audit('Merged duplicate ' || dn || ' into ' || kn);
end $$;

create or replace function public.report_action(p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; r entities; act text; tt text; tid text;
begin
  me := _require_admin();
  select * into r from entities where kind = 'reports' and id = p->>'reportId' for update;
  if not found then raise exception 'Not found'; end if;
  act := p->>'action'; tt := r.data->>'targetType'; tid := r.data->>'targetId';
  if act = 'bounce' and tt = 'company' then
    update entities set data = data || jsonb_build_object('status', 'bounced') where kind = 'companies' and id = tid;
    perform _audit('Marked ' || coalesce(_name('companies', tid), tid) || ' contact as bounced after a report');
  elsif act = 'suspend' and tt = 'fest' then
    update entities set data = data || jsonb_build_object('status', 'rejected') where kind = 'fests' and id = tid;
    perform _audit('Suspended fest listing ' || coalesce(_name('fests', tid), tid) || ' after a report');
  elsif act = 'resolve' then
    perform _audit('Resolved report: ' || (r.data->>'kind'));
  else
    raise exception 'Unknown action';
  end if;
  update entities set data = data || jsonb_build_object('status', 'resolved') where kind = 'reports' and id = r.id;
  if (r.data->>'by') is not null then
    perform _notify(array[(r.data->>'by')::uuid], 'Your report was reviewed: ' || (r.data->>'kind'), '');
  end if;
end $$;

create or replace function public.admin_add_company(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; cid text; nm text; tags jsonb;
begin
  me := _require_admin();
  nm := trim(coalesce(p->>'name', ''));
  if nm = '' or trim(coalesce(p->>'contactName', '')) = '' or trim(coalesce(p->>'email', '')) = '' or trim(coalesce(p->>'city', '')) = '' then raise exception 'Name, city, contact and email are required'; end if;
  if (p->>'cat') <> all (array['tech', 'bev', 'local', 'bank', 'app', 'edu', 'media']) then raise exception 'Choose a category'; end if;
  tags := case when jsonb_typeof(p->'tags') = 'array' and jsonb_array_length(p->'tags') > 0 then p->'tags' else '["Cash"]'::jsonb end;
  cid := _rid('c_');
  insert into entities (kind, id, data) values ('companies', cid, jsonb_build_object(
    'name', nm, 'sub', coalesce(nullif(trim(p->>'sub'), ''), 'Company'), 'cat', p->>'cat', 'city', trim(p->>'city'), 'tags', tags,
    'band', coalesce(nullif(p->>'band', ''), 'Under 1L'), 'color', coalesce(nullif(p->>'color', ''), '#1F5C56'),
    'contact', jsonb_build_object('name', trim(p->>'contactName'), 'role', coalesce(nullif(trim(p->>'contactRole'), ''), 'Contact'), 'email', trim(p->>'email'),
      'channel', coalesce(nullif(p->>'channel', ''), 'Email'), 'replyDays', coalesce((p->>'replyDays')::int, 5)),
    'verifiedOn', _ms(), 'status', 'verified',
    'bench', jsonb_build_object('lo', coalesce((p->>'benchLo')::numeric, 0), 'hi', coalesce((p->>'benchHi')::numeric, 0), 'n', coalesce((p->>'benchN')::int, 0)),
    'past', coalesce(p->'past', '[]'::jsonb),
    'inbound', jsonb_build_object('paused', false, 'weeklyCap', 6, 'types', '["Technical","Cultural","Management","Sports","Society or department"]'::jsonb),
    'visible', jsonb_build_object('email', false, 'band', true)));
  perform _audit('Added company ' || nm || ' (' || coalesce(nullif(p->>'method', ''), 'Added by the verification desk') || ')');
  return jsonb_build_object('companyId', cid);
end $$;

create or replace function public.admin_set_benchmark(p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare me profiles; bid text;
begin
  me := _require_admin();
  bid := (p->>'type') || '|' || (p->>'size') || '|' || (p->>'cat');
  if (p->>'size') <> all (array['xs', 's', 'm', 'l']) then raise exception 'Unknown size'; end if;
  if (p->>'cat') <> all (array['total', 'title', 'tech', 'bev', 'local', 'bank', 'app', 'edu', 'media']) then raise exception 'Unknown category'; end if;
  if coalesce((p->>'lo')::numeric, 0) > coalesce((p->>'hi')::numeric, 0) then raise exception 'The low figure must not exceed the high figure'; end if;
  insert into entities (kind, id, data) values ('benchmarks', bid, jsonb_build_object('type', p->>'type', 'size', p->>'size', 'cat', p->>'cat',
    'lo', (p->>'lo')::numeric, 'hi', (p->>'hi')::numeric, 'n', (p->>'n')::int))
  on conflict (kind, id) do update set data = excluded.data;
  perform _audit('Set benchmark ' || bid);
end $$;

create or replace function public._alum_out(e public.entities) returns jsonb language sql stable as $$
  select public._out(e) || jsonb_build_object('used', (
    select count(*) from public.entities i where i.kind = 'intros' and i.alumnus_id = e.id
      and (i.data->>'createdAt')::bigint >= public._ms() - 30::bigint * 86400000 and i.data->>'status' <> 'declined'))
$$;

-- ---------- reads ----------
create or replace function public.bootstrap() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me profiles; fest entities; res jsonb; fid text; cid text; aid text; college text;
  fests jsonb; companies jsonb; alumni jsonb; pipeline jsonb; shortlists jsonb; intros jsonb; requests jsonb; archive jsonb; reports jsonb; audit jsonb; benchmarks jsonb; users jsonb; notifs jsonb;
begin
  select * into me from profiles where id = auth.uid();
  if not found then return jsonb_build_object('profile', null); end if;
  fests := '[]'; companies := '[]'; alumni := '[]'; pipeline := '[]'; shortlists := '[]'; intros := '[]'; requests := '[]'; archive := '[]'; reports := '[]'; audit := '[]'; users := '[]';

  select coalesce(jsonb_agg(_out(e)), '[]') into benchmarks from entities e where kind = 'benchmarks';
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'userId', user_id, 'text', text, 'link', link, 'ts', ts, 'read', read) order by ts desc), '[]') into notifs
    from (select * from notifs where user_id = me.id order by ts desc limit 50) n;
  select coalesce(jsonb_agg(_out(e)), '[]') into reports from entities e where kind = 'reports' and (me.role = 'admin' or e.data->>'by' = me.id::text);

  if me.role = 'fest' then
    fid := me.entity_id;
    select * into fest from entities where kind = 'fests' and id = fid;
    college := fest.data->>'college';
    select coalesce(jsonb_agg(case when me.fest_role = 'lead' then _out(e) else _out(e) - 'joinCode' - 'viewCode' end), '[]') into fests from entities e where kind = 'fests' and id = fid;
    select coalesce(jsonb_agg(case when exists (select 1 from entities pp where pp.kind = 'pipeline' and pp.fest_id = fid and pp.company_id = e.id and pp.data->>'stage' <> 'shortlisted')
                                   then _out(e) else jsonb_set(_out(e), '{contact}', (_out(e)->'contact') - 'email') end), '[]') into companies
      from entities e where kind = 'companies' and (e.data->>'status' = 'verified' or exists (
        select 1 from entities x where x.company_id = e.id and x.fest_id = fid and x.kind in ('pipeline', 'requests', 'intros')));
    select coalesce(jsonb_agg(_alum_out(e)), '[]') into alumni from entities e where kind = 'alumni' and e.data->>'status' = 'verified' and e.data->>'college' = college;
    select coalesce(jsonb_agg(_out(e)), '[]') into pipeline from entities e where kind = 'pipeline' and fest_id = fid;
    select coalesce(jsonb_agg(_out(e)), '[]') into shortlists from entities e where kind = 'shortlists' and fest_id = fid;
    select coalesce(jsonb_agg(_out(e)), '[]') into intros from entities e where kind = 'intros' and fest_id = fid;
    select coalesce(jsonb_agg(_out(e)), '[]') into requests from entities e where kind = 'requests' and fest_id = fid;
    select coalesce(jsonb_agg(_out(e)), '[]') into archive from entities e where kind = 'archive' and fest_id = fid;
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'initials', initials, 'role', role, 'festRole', fest_role, 'entityId', entity_id, 'title', title)), '[]') into users
      from profiles where role = 'fest' and entity_id = fid;

  elsif me.role = 'brand' then
    cid := me.entity_id;
    select coalesce(jsonb_agg(
      jsonb_set(_out(e), '{proof}', jsonb_build_object('footfall', e.data->'proof'->'footfall', 'logos', coalesce(e.data->'proof'->'logos', '[]'::jsonb),
        'testimonials', '[]'::jsonb, 'photos', (select coalesce(jsonb_agg('x'::text), '[]'::jsonb) from jsonb_array_elements(coalesce(e.data->'proof'->'photos', '[]'::jsonb))))) - 'target' - 'contribs' - 'handover' - 'joinCode' - 'viewCode'), '[]') into fests
      from entities e where kind = 'fests' and (e.data->>'status' = 'verified' or exists (select 1 from entities x where x.kind = 'requests' and x.fest_id = e.id and x.company_id = cid));
    select coalesce(jsonb_agg(_out(e)), '[]') into companies from entities e where kind = 'companies' and id = cid;
    select coalesce(jsonb_agg(_out(e)), '[]') into pipeline from entities e where kind = 'pipeline' and company_id = cid and e.data->>'stage' = 'committed';
    select coalesce(jsonb_agg(_out(e)), '[]') into requests from entities e where kind = 'requests' and company_id = cid;
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'initials', initials, 'role', role, 'festRole', fest_role, 'entityId', entity_id, 'title', title)), '[]') into users
      from profiles where role = 'brand' and entity_id = cid;

  elsif me.role = 'alumni' then
    aid := me.entity_id;
    select data->>'college' into college from entities where kind = 'alumni' and id = aid;
    select coalesce(jsonb_agg(_alum_out(e)), '[]') into alumni from entities e where kind = 'alumni' and (id = aid or (e.data->>'status' = 'verified' and e.data->>'college' = college));
    select coalesce(jsonb_agg(_out(e)), '[]') into intros from entities e where kind = 'intros' and alumnus_id = aid;
    select coalesce(jsonb_agg(jsonb_set(_out(e), '{contact}', (_out(e)->'contact') - 'email')), '[]') into companies from entities e where kind = 'companies' and (
      e.id in (select company_id from entities where kind = 'intros' and alumnus_id = aid)
      or e.id in (select data->>'companyId' from entities where kind = 'alumni' and (id = aid or (data->>'status' = 'verified' and data->>'college' = college))));
    select coalesce(jsonb_agg(jsonb_set(_out(e), '{proof}', jsonb_build_object('footfall', e.data->'proof'->'footfall', 'logos', '[]'::jsonb, 'testimonials', '[]'::jsonb, 'photos', '[]'::jsonb)) - 'target' - 'contribs' - 'handover' - 'joinCode' - 'viewCode'), '[]') into fests
      from entities e where kind = 'fests' and e.id in (select fest_id from entities where kind = 'intros' and alumnus_id = aid);
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'initials', initials, 'role', role, 'festRole', fest_role, 'entityId', entity_id, 'title', title)), '[]') into users
      from profiles where id = me.id or id in (select (data->>'by')::uuid from entities where kind = 'intros' and alumnus_id = aid);

  else
    select coalesce(jsonb_agg(_out(e)), '[]') into fests from entities e where kind = 'fests';
    select coalesce(jsonb_agg(_out(e)), '[]') into companies from entities e where kind = 'companies';
    select coalesce(jsonb_agg(_alum_out(e)), '[]') into alumni from entities e where kind = 'alumni';
    select coalesce(jsonb_agg(_out(e)), '[]') into pipeline from entities e where kind = 'pipeline';
    select coalesce(jsonb_agg(_out(e)), '[]') into shortlists from entities e where kind = 'shortlists';
    select coalesce(jsonb_agg(_out(e)), '[]') into intros from entities e where kind = 'intros';
    select coalesce(jsonb_agg(_out(e)), '[]') into requests from entities e where kind = 'requests';
    select coalesce(jsonb_agg(_out(e) order by e.created_at desc), '[]') into audit from (select * from entities where kind = 'audit' order by created_at desc limit 200) e;
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'initials', initials, 'role', role, 'festRole', fest_role, 'entityId', entity_id, 'title', title, 'email', email)), '[]') into users from profiles;
  end if;

  return jsonb_build_object('profile', jsonb_build_object('id', me.id, 'name', me.name, 'initials', me.initials, 'role', me.role, 'festRole', me.fest_role, 'entityId', me.entity_id, 'title', me.title, 'email', me.email),
    'users', users, 'fests', fests, 'companies', companies, 'alumni', alumni, 'pipeline', pipeline, 'shortlists', shortlists, 'intros', intros,
    'requests', requests, 'archive', archive, 'reports', reports, 'audit', audit, 'benchmarks', benchmarks, 'notifs', notifs, 'serverTime', _ms());
end $$;

create or replace function public.mark_notifs_read() returns void language sql security definer set search_path = public, pg_temp as $$
  update notifs set read = true where user_id = auth.uid() and not read
$$;

create or replace function public.delete_account() returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '28000'; end if;
  if exists (select 1 from profiles where id = auth.uid() and role = 'admin') and (select count(*) from profiles where role = 'admin') < 2 then
    raise exception 'You are the only verification desk account';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

-- public page the sponsor opens from the share link (no sign-in)
create or replace function public.public_sponsor(token text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare e entities; f entities; c entities;
begin
  if token is null or length(token) < 20 then return null; end if;
  select * into e from entities where kind = 'pipeline' and data->>'shareToken' = token and data->>'stage' = 'committed';
  if not found then return null; end if;
  select * into f from entities where kind = 'fests' and id = e.fest_id;
  select * into c from entities where kind = 'companies' and id = e.company_id;
  return jsonb_build_object(
    'item', jsonb_build_object('amount', e.data->'amount', 'kind', e.data->'kind', 'payments', e.data->'payments', 'deliverables', e.data->'deliverables', 'proof', e.data->'proof'),
    'fest', jsonb_build_object('name', f.data->'name', 'college', f.data->'college', 'city', f.data->'city', 'start', f.data->'start'),
    'company', jsonb_build_object('name', c.data->'name', 'color', c.data->'color'));
end $$;


-- lists a new alumnus needs before they have a profile
create or replace function public.reg_options() returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'companies', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', data->>'name') order by data->>'name'), '[]'::jsonb) from entities where kind = 'companies' and data->>'status' = 'verified'),
    'colleges', (select coalesce(jsonb_agg(c order by c), '[]'::jsonb) from (select distinct data->>'college' as c from entities where kind = 'fests' and data->>'status' = 'verified') x))
$$;

-- ---------- operator helpers (run in the SQL editor, not callable from the app) ----------
create or replace function public.make_admin(admin_email text) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare u auth.users;
begin
  select * into u from auth.users where lower(email) = lower(admin_email);
  if not found then return 'No account with that email yet. Sign in to the app once with it, then run this again.'; end if;
  insert into profiles (id, email, name, initials, role, entity_id, title)
  values (u.id, u.email, initcap(split_part(u.email, '@', 1)), _initials(split_part(u.email, '@', 1)), 'admin', null, 'Verification desk')
  on conflict (id) do update set role = 'admin', fest_role = null, entity_id = null, title = 'Verification desk';
  return 'Done. ' || u.email || ' is now a verification desk account.';
end $$;

-- ---------- who may call what ----------
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.bootstrap() to authenticated;
grant execute on function public.apply_changes(jsonb) to authenticated;
grant execute on function public.send_intro(jsonb) to authenticated;
grant execute on function public.send_pitch(jsonb) to authenticated;
grant execute on function public.respond_request(jsonb) to authenticated;
grant execute on function public.respond_intro(jsonb) to authenticated;
grant execute on function public.mark_intros_seen() to authenticated;
grant execute on function public.mark_notifs_read() to authenticated;
grant execute on function public.register_fest(jsonb) to authenticated;
grant execute on function public.join_fest(jsonb) to authenticated;
grant execute on function public.register_brand(jsonb) to authenticated;
grant execute on function public.register_alumnus(jsonb) to authenticated;
grant execute on function public.verify_entity(jsonb) to authenticated;
grant execute on function public.reject_entity(jsonb) to authenticated;
grant execute on function public.merge_companies(jsonb) to authenticated;
grant execute on function public.report_action(jsonb) to authenticated;
grant execute on function public.admin_add_company(jsonb) to authenticated;
grant execute on function public.admin_set_benchmark(jsonb) to authenticated;
grant execute on function public.delete_account() to authenticated;
grant execute on function public.public_sponsor(text) to anon, authenticated;
grant execute on function public.reg_options() to authenticated;
