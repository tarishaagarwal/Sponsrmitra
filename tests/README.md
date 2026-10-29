# Tests

| File | What it checks |
| --- | --- |
| `test_sql.py` | The database rules and functions against a real Postgres: who can see and change what, hidden contact emails, notifications, caps, verification. |
| `test_live.py` | The real app with six people signed in at once on separate browsers sharing one database. |
| `test_holding.py` | The real build contains no sample data and shows the "opening soon" page when not connected. |
| `test_demo.py`, `test_demo_routes.py` | The demo build (sample data), as a regression check. |

Run everything:

```
pip install -r tests/requirements.txt
playwright install chromium
bash tests/run_all.sh
```

The tests start their own throwaway Postgres (through `pgserver`), so they never touch a real Supabase project. In `test_live.py` the Supabase client is replaced by a small stand-in that calls the same SQL functions, so real email delivery and the hosted API are not covered.
