# SponsrMitra: project notes for Claude Code

A verified sponsorship marketplace for Indian college fests. Fest teams find verified sponsors, see what comparable fests raised, ask their own alumni for warm introductions and run the pipeline as a team. Brands receive verified requests. A verification desk checks every fest, brand, alumnus and contact. Read `README.md` for the overview and `docs/SETUP.md` for going live.

## Status

- The app and backend are built and tested. They are **not live yet**: the owner still has to create the Supabase project, set up an email sender and host the site (see `docs/SETUP.md`).
- The real build (`public/index.html`) contains **no sample data**. Until `public/config.js` is filled in it shows an "opening soon" page.
- The owner is a student working alone and is not an engineer. Explain changes in plain language and say what needs doing outside the code.

## Layout

- `src/*.js`, `src/style.css`: the app. Plain JavaScript, no framework, no bundler.
- `scripts/build.py`: joins `src/` into `public/index.html` (real) and `demo/sponsrmitra-demo.html` (sample data). **Edit `src/`, then rebuild. Never edit the built files by hand.**
- `supabase/schema.sql`: the whole backend (tables, rules, server functions, notification triggers).
- `tests/`: run `bash tests/run_all.sh` (needs `pip install -r tests/requirements.txt` and `playwright install chromium`). The tests start a throwaway Postgres, so they never touch a real project.
- `docs/`: setup guide, job spec, feature list, idea summary, design screens, links.
- `legacy/ai-studio-landing/`: the first landing page. Superseded. Do not build on it.

Source order matters (all files share one scope): `data.js`, `ui.js`, `backend.js`, `auth.js`, `fest.js`, `fest2.js`, `brand.js`, `admin.js`, `main.js`.

## How it works

- Two modes, decided by `public/config.js`:
  - **Live mode** (`SERVER` true): Supabase Auth by emailed code, data in Postgres, 20 second polling.
  - **Demo mode** (`DEMO_OK` true): only in `demo/sponsrmitra-demo.html`, data in localStorage with made-up people.
- The browser never touches tables. Every read and write goes through SQL functions that check `auth.uid()`:
  - `bootstrap()` returns only what the caller may see (contact emails hidden until outreach, alumni only for the same college, no other fests' private data).
  - `apply_changes()` handles ordinary edits with per-role field rules and a version check (`_v`) so teammates don't overwrite each other.
  - Cross-role actions are separate functions: `send_intro`, `send_pitch`, `respond_request`, `respond_intro`, `verify_entity`, `reject_entity`, `merge_companies`, `report_action`, `admin_add_company`, `admin_set_benchmark`, registration functions.
  - Notifications are created by database triggers, never by the client.
  - The sponsor page uses a secret token from `public_sponsor(token)`.
- On the client, `mutate(fn)` edits local state, re-renders, then in live mode diffs and sends the changes through `apply_changes`. Actions that cross roles call `serverDo(name, args, ...)` instead.

## Rules to keep

1. **No sample data in the real build.** The build asserts this. Sample people live only between `/*SEED_START*/` and `/*SEED_END*/` in `src/data.js`.
2. **Security.** Never commit the Supabase `service_role` key or any secret. The `anon` key may be public. Never disable Row Level Security. Any new table needs RLS on and no direct grants to `anon` or `authenticated`. Any new function must be `security definer`, set `search_path`, check the caller, and have its execute grant listed explicitly at the end of `schema.sql`.
3. **Benchmarks must be real.** In live mode ranges come from the `benchmarks` rows the verification desk enters. Never invent figures. Below 5 fests show "Not enough data yet".
4. **Privacy.** Contact details are personal data. Keep emails hidden until outreach, keep brand and fest private fields out of other roles' `bootstrap()` output.
5. **Tests.** Change the schema or a flow, then update and run the tests. Add a test for every new permission rule. All suites must pass before committing.
6. **UI copy.** Plain, short sentences. Use the typographic apostrophe and quotation marks (’ “ ”) in anything people read. No emoji in the interface. Amounts in Indian format (₹12,00,000) and dates like "6 Feb 2027".
7. **Design.** Noticeboard look: kraft paper background, marigold buttons, teal for verified, brick for warnings. Fonts: Space Grotesk for headings and controls, Source Serif 4 for body. Light and dark themes both supported. Mobile first, 360 px minimum.
8. Keep the app one self-contained HTML file. Scripts may only come from `cdn.jsdelivr.net` with a pinned version (currently supabase-js 2.45.4).

## Known limits (do not claim otherwise)

Alerts appear in the app only (no email or WhatsApp). Photos are stored inside the database, fine for a pilot, move to Supabase Storage later. Updates arrive by polling, not instantly. Payments are recorded, not processed. Companies are added one at a time by the verification desk. Everything assumes India. `docs/feature-list.md` ends with the exact build status.

## Likely next jobs

- Help the owner finish go-live from `docs/SETUP.md` (Supabase, email sender, hosting, first desk account).
- Replace the landing page waitlist (see `legacy/ai-studio-landing/LEGACY.md` and `landing/README.md`) with a form that saves to the same Supabase project.
- Email alerts via a Supabase Edge Function and an email service, then WhatsApp.
- Move photos to Supabase Storage.
- Bulk import of companies for the verification desk.
- Privacy policy and terms pages (the owner needs a lawyer to review them; do not present them as legal advice).

## Working with the owner

Ask before anything that costs money, deletes data or changes who can see what. Say plainly what was tested and what could not be tested here (real email delivery, the hosted Supabase project, the live site).
