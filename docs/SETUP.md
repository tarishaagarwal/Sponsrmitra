# SponsrMitra live setup

This is everything you need to do outside Claude to turn the app into a live product that several people can use at the same time. Plan on one to two hours the first time. You don’t need to write any code.

Menu names in Supabase and Vercel change now and then. If a name below doesn’t match exactly, look for the closest one.

## What is in this repository

| Path | What it is |
| --- | --- |
| `public/index.html` | The whole app, built from `src/`. This is what you deploy. |
| `public/config.js` | The settings you fill in: your Supabase address and key, links to your terms and privacy pages, and a contact email. |
| `supabase/schema.sql` | The database and its rules. You run this once in Supabase. |
| `vercel.json` | Tells Vercel to serve the `public` folder, plus basic security headers. |
| `src/`, `scripts/build.py` | The readable source code and the script that builds `public/index.html`. Only needed if a developer edits the app. |
| `demo/sponsrmitra-demo.html` | A presentation build with made-up sample data. It is never deployed with the real app. |
| `tests/` | Automated checks. See `tests/README.md`. |
| `docs/` | This guide, the job spec, the feature list, the design screens and links. |

The real app contains no sample people, companies or fests. Everything in it comes from your own database. Until `public/config.js` is filled in, visitors see a plain “We’re opening soon” page (with your `contactEmail` if you set one), so you can deploy the site safely before the database is connected.

## Part 1. Before you launch

### 1. Create the database (Supabase)

1. Go to supabase.com and sign up. Choose **New project**.
2. Give it a name such as `sponsrmitra`. Create a strong database password and save it in a password manager.
3. For the region choose **South Asia (Mumbai)** so the app is fast for Indian students.
4. Wait a couple of minutes until the project is ready.

### 2. Load the database rules

1. In your project open **SQL Editor** and choose **New query**.
2. Open `supabase/schema.sql`, copy everything, paste it into the editor and press **Run**.
3. You should see “Success”. Open **Table Editor**: you should now see three tables called `profiles`, `entities` and `notifs`.

Nobody can read these tables directly from the app. All access goes through functions that check who is asking. Please don’t turn off “Row Level Security” on any table.

### 3. Make sign-in emails show the code

The app signs people in with a short code sent by email, not a password. By default Supabase sends a link instead, so change two email templates.

1. Go to **Authentication**, then **Emails** (also called **Email Templates**).
2. Open **Confirm signup**. Set the subject to `Your SponsrMitra code` and the body to:

   `<p>Your SponsrMitra sign-in code is <b>{{ .Token }}</b>. It works for one hour. If you didn’t ask for it, ignore this email.</p>`

3. Open **Magic Link** and paste the same subject and body.
4. In **Authentication**, **Providers**, **Email**, check that email sign-in is on. Leave the code length at 6 (the app accepts 4 to 10 digits).

### 4. Set up a real email sender

Supabase’s built-in sender only allows a handful of emails per hour. That is fine for testing yourself, but a fest team signing up together will hit the limit and never receive a code.

1. Create an account with an email sending service. Resend, Brevo and Amazon SES all work. Pick whichever you can verify fastest.
2. Add and verify your sending domain with them. This usually means adding two or three records at your domain provider. Skipping this makes emails land in spam.
3. In Supabase go to **Authentication**, **SMTP Settings**, switch on **custom SMTP** and paste the host, port, username, password and a “from” address such as `no-reply@yourdomain.com`.
4. Open **Authentication**, **Rate Limits** and raise the emails-per-hour limit to something sensible, for example 100 to start.

### 5. Connect the app to the database

1. In Supabase open **Project Settings**, then **API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `public/config.js` and paste them in:

   ```
   supabaseUrl: 'https://xxxx.supabase.co',
   supabaseAnonKey: 'eyJ...',
   contactEmail: 'hello@yourdomain.com',
   ```

4. Never put the **service_role** key anywhere in this repository. It can read everything. The anon key is meant to be public and is safe because of the rules from step 2.

### 6. Put the app on the internet (done)

The site is published on GitHub Pages at https://sponsrmitra.live. The domain is verified and HTTPS is on. `.github/workflows/pages.yml` publishes the `public` folder every time a change reaches the `main` branch.

One thing is left for when the database exists: in Supabase go to **Authentication**, **URL Configuration** and set **Site URL** to `https://sponsrmitra.live`.

### 7. Create your own verification desk account

1. Open your live site and sign in with your own email. When it asks “Tell us who you are”, don’t choose anything. Just leave the page.
2. In Supabase open **SQL Editor** and run this, using your email:

   ```
   select public.make_admin('you@yourdomain.com');
   ```

3. Reload the site. You should now land on the **Verification desk**. Add a second desk account the same way for a teammate, so you are not the only person who can verify.

### 8. Fill in the real data

The app starts empty. The numbers students see only mean something once real information is in.

1. **Companies.** On the Verification desk choose **Add a company** for every brand you have actually spoken to. Log how you checked the contact. This is the manual pilot from the validation plan: 25 to 30 companies before you invite fests.
2. **Benchmarks.** On the **Insights** tab use **Benchmarks, Add or update** to enter what fest leads told you they raised, by fest type, size and sponsor type, with how many fests each range is based on. Until a row has at least 5 fests behind it, students see “Not enough data yet” instead of a number. Don’t enter figures you haven’t collected.
3. **Test the full loop with real people** before announcing anything. Use two phones and two email addresses:
   1. Person A registers a fest. You verify it.
   2. Person B joins as an alumnus of the same college. You verify them.
   3. Person A sends B a warm introduction request. B accepts. A sees it.
   4. Person A sends a pitch to a brand you added, and that brand’s contact registers and declines it.
   5. A records a deal and opens the sponsor link in a private window.

### 9. Legal pages and consent

You will store names, emails, college details and brand contact details of people who haven’t used the app. Before inviting anyone:

1. Write a privacy policy and terms of use. Say what you collect, why, how long you keep it, who can see it, and how someone asks for their data to be deleted. Name a person who handles complaints.
2. Host both pages anywhere public and put the links in `config.js` as `termsUrl` and `privacyUrl`.
3. Tell each brand contact that you listed them and how to be removed. Their listing shows only what you entered.
4. Have a lawyer review this against India’s Digital Personal Data Protection Act. This guide is not legal advice.

### 10. Backups

Check which plan your Supabase project is on and whether backups are included. Once real fests depend on the data, use a plan with daily backups. Until then, open **Database**, **Backups** regularly, or export the `entities` table from **Table Editor** each week.

## Part 2. Running it day to day

| Job | Where | How often |
| --- | --- | --- |
| Verify new fests, brands and alumni | Verification desk | Every day. Aim to answer within one working day, because unverified fests can’t send requests. |
| Re-check contacts | Verification desk, “Re-check due” items | Contacts older than 60 days show as due. Keep every contact under 90 days. |
| Fix bounced contacts | Verification desk, “Bounced contact” items | When a student reports one. |
| Review reports | Reports tab | Every day. |
| Merge duplicate companies | Quality tab | Weekly. |
| Update benchmarks | Insights tab | After each batch of interviews. |

**If a company asks to be removed.** Open SQL Editor and run:

```
update public.entities
set data = data || '{"status":"rejected","contact":{"name":"Removed","role":"","email":"","channel":"Email","replyDays":5}}'::jsonb
where kind = 'companies' and data->>'name' = 'Exact Company Name';
```

This hides the company from the directory and erases the contact details, but keeps the fests’ history intact so their pipelines don’t break.

**If someone asks for their data.** They can use **Download my data** or **Delete account** on their own Profile page. For other requests, search the `entities` and `profiles` tables in Table Editor.

## Part 3. What is not built yet

| Not built | What it would take |
| --- | --- |
| Email or WhatsApp alerts | Today alerts appear inside the app only. Email needs an email service plus a small background function. WhatsApp needs a WhatsApp Business account with Meta, a verified business and approved message templates, which can take days to weeks. |
| Photo storage | Photos are stored inside the database. That is fine for a pilot with a few fests. When many photos build up, a developer should move them to Supabase Storage. |
| Instant updates | The app checks for changes every 20 seconds and whenever you return to the tab. It is not instant. |
| Payments | Payments are only recorded. No money moves through the app. |
| Importing companies in bulk | Companies are added one at a time on the Verification desk. |
| Other countries | Everything assumes India. |
| Support inbox | Decide where students email for help and put that address on the sign-in page. |

## Part 4. If something goes wrong

| Problem | Likely cause and fix |
| --- | --- |
| The code email never arrives | Check spam first. Then check Supabase **Authentication**, **Logs**. If you see a rate-limit message, finish step 4. |
| The email has a link but no code | Step 3 wasn’t saved for both templates. |
| “We could not connect” | `config.js` is empty or has a typo, or the Supabase project is paused. Free projects can pause after a week of no use. Open the project and restore it. |
| “Please sign in again” | The session expired. Sign out and sign back in. |
| “Someone else just changed this” | Two teammates edited the same item at once. The page refreshed. Repeat your change. |
| A fest can’t send requests | It isn’t verified yet. Check the Verification desk. |
| An alumnus doesn’t show for a fest | Their college is spelled differently from the fest’s. Ask them to re-register choosing the exact college from the list. |
| The sponsor link says “Link not found” | The deal isn’t recorded as committed, or the link was copied wrongly. |

## What was tested, and what wasn’t

**Tested here:** the database rules and every function against a real Postgres database (85 checks covering who can see and change what, privacy of contact emails and fest data, notifications, caps and verification), and the full app with six people signed in at once on separate browsers sharing one database (39 checks, from sign-in to a deal and the public sponsor page). The app contains no sample data. A separate demo build with made-up people exists only for presentations and is kept in `demo/` and is never deployed.

**Not tested, because it needs your accounts:** real email delivery from Supabase, the app talking to a hosted Supabase project over the internet, your GitHub Pages site, behaviour under heavy use, and legal compliance. Treat your first week as a supervised pilot with a handful of fests, and run the test in step 8 on the real site before inviting anyone.
