# Tests

| File | What it checks |
| --- | --- |
| `test_sql.py` | The database rules and functions against a real Postgres: who can see and change what, hidden contact emails, notifications, caps, verification. |
| `test_team_cap.py` | A fest team is capped at 4 people (lead, members and view-only convenor together), including two people joining at the same moment. |
| `test_live.py` | The real app with six people signed in at once on separate browsers sharing one database. |
| `test_holding.py` | The real app (`public/app/`) contains no sample data and shows the "opening soon" page when not connected. |
| `test_landing.py` | The landing page and 404 page: no invented statistics or usage claims, no email written into any page, the `appOpen` launch switch, the email card built from `config.js`, social preview tags, no sideways scrolling at 360 px and reduced motion. |
| `test_demo.py`, `test_demo_routes.py` | The demo build (sample data), as a regression check. |

Run everything (it first checks that the committed files in `public/` and `demo/` match a fresh build of `src/`):

```
pip install -r tests/requirements.txt
playwright install chromium
bash tests/run_all.sh
```

The tests start their own throwaway Postgres (through `pgserver`), so they never touch a real Supabase project. In `test_live.py` the Supabase client is replaced by a small stand-in that calls the same SQL functions, so real email delivery and the hosted API are not covered.
