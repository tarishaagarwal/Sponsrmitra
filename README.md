# SponsrMitra

A verified sponsorship marketplace for Indian college fests. Fest teams find sponsors that have confirmed they back fests, see what comparable fests raised, ask their own alumni for warm introductions, and run the whole sponsorship pipeline together. Brands receive verified requests in one standard format. A verification desk checks every fest, brand, alumnus and contact.

**Status:** the app and its backend are built and tested. It is not live yet. Going live needs a Supabase project, an email sender and a place to host the site. The steps are in [docs/SETUP.md](docs/SETUP.md). The real app ships with no sample data: until it is connected it shows an "opening soon" page.

## Who uses it

| Person | What they do |
| --- | --- |
| Fest team (lead, members, view-only convenor) | Set a realistic target, find verified sponsors, request alumni introductions, send pitches, track the pipeline as a team, record deals, deliverables and proof, send a sponsor report, hand over to next year's team. |
| Brand manager | Receive requests in one format, accept, decline with a reason or ask a question, compare fests side by side, control how many requests arrive. |
| Alumnus | Answer an introduction request with one tap: introduce, decline or suggest someone else. |
| Verification desk | Verify fests, brands, alumni and contacts, add companies by hand, enter benchmarks, handle reports, merge duplicates, read the audit log. |

## Repository map

| Path | What it is |
| --- | --- |
| `public/` | What gets deployed: `index.html` (the whole app) and `config.js` (your settings). |
| `src/` | The app source, in plain JavaScript and CSS. No framework, no build tools needed. |
| `scripts/build.py` | Builds `public/index.html` (real) and `demo/sponsrmitra-demo.html` (sample data) from `src/`. |
| `supabase/schema.sql` | The whole backend: tables, rules, server functions, notification triggers. |
| `tests/` | Automated tests against a real Postgres. See [tests/README.md](tests/README.md). |
| `demo/` | A presentation build with made-up people. Never deployed with the real app. |
| `docs/` | Setup guide, job spec, feature list, idea summary, design screens, links. |
| `landing/` | A static landing page with the noticeboard design. |
| `legacy/ai-studio-landing/` | The first landing page from Google AI Studio. Superseded. Read `LEGACY.md` before reusing anything. |

## Quick start

**See it:** open `demo/sponsrmitra-demo.html` in a browser. Pick a person on the first screen and switch people from the top right.

**Put it live:** follow [docs/SETUP.md](docs/SETUP.md). It covers the database, sign-in emails, hosting, your first verification desk account, legal pages and backups.

**Change it:**

```
python3 scripts/build.py          # rebuilds public/index.html and demo/sponsrmitra-demo.html
pip install -r tests/requirements.txt && playwright install chromium
bash tests/run_all.sh             # runs every test
```

## Push to GitHub

```
git remote add origin https://github.com/<your-username>/sponsrmitra.git
git push -u origin main
```

The commits are authored as `SponsrMitra <noreply@sponsrmitra.invalid>`. To use your own name and email:

```
git config user.name "Your Name"
git config user.email "you@example.com"
git rebase -r --root --exec "git commit --amend --reset-author --no-edit"
```

Keep the repository private while it contains links to your own tools (see `docs/links.md`).

## How it works

- **The browser app** is one HTML file written in plain JavaScript. People sign in with a code sent to their email (Supabase Auth). There are no passwords.
- **The browser never touches the tables.** Every read and write goes through SQL functions in Supabase that check who is calling and what they may see or change.
- **Reading:** `bootstrap()` returns only what the signed-in person is allowed to see. For example, a brand's contact email is hidden from a fest until the fest has reached out, and alumni only appear to fests from their own college.
- **Ordinary edits** (a fest editing its own pipeline, a brand editing its own listing) go through `apply_changes()`, which checks each field against the caller's role and rejects stale edits so teammates don't overwrite each other.
- **Actions that cross roles** are separate functions: send an introduction request, send a pitch, answer a request, answer an introduction, verify, merge, report actions.
- **Notifications** are created by database triggers, so the app can't forge them.
- **The sponsor page** opens with a secret token and exposes only deliverables, payments and proof.

## Security notes

- The `anon` key in `public/config.js` is public by design. The rules in `supabase/schema.sql` are what protect the data. Never put the `service_role` key in this repository.
- Do not turn off Row Level Security on any table.
- The app stores personal data (names, emails, college and brand contact details). Write a privacy policy and have a lawyer review it against India's Digital Personal Data Protection Act before inviting anyone.

## Known limits

Alerts appear only inside the app (no email or WhatsApp yet). Photos are stored in the database, which is fine for a pilot. The app checks for changes every 20 seconds rather than instantly. Payments are recorded, not processed. Companies are added one at a time. Everything assumes India. [docs/SETUP.md](docs/SETUP.md) lists what each of these would take.

## Documents

- [docs/SETUP.md](docs/SETUP.md): everything to do outside the code to go live
- [docs/job-spec.md](docs/job-spec.md): who needs it, when, and what they should be able to accomplish
- [docs/feature-list.md](docs/feature-list.md): all 80 features with priorities
- [docs/idea-summary.md](docs/idea-summary.md): the idea in the assignment format
- [docs/screens/](docs/screens/): the main user flow as images
- [docs/links.md](docs/links.md): links to the related tools
- [CLAUDE.md](CLAUDE.md): project notes that Claude Code reads at the start of every session

## Licence

No licence file is included, so all rights are reserved by default. Add one if you decide to share the code.
