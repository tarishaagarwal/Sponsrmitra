# Legacy: the first landing page (built in Google AI Studio)

This is the React and Vite project exported from Google AI Studio. It was the first landing page and was deployed to Vercel as a preview. It is **superseded** by the main app and kept only for reference.

Known problems, so nobody reuses it by mistake:

- **The waitlist does not work as a waitlist.** Every visitor has to sign in with their own Google account and grant Sheets and Drive access, and the sheet is then created in *that visitor's* Drive, not yours. You never get one shared list of signups.
- It contains no backend. Everything runs in the browser.

Setup, if you ever need to run it: copy `firebase-applet-config.example.json` to `firebase-applet-config.json` and fill in your own Firebase values. The real file is git-ignored so keys stay out of the repository. Then `npm install` and `npm run dev`.

For a real launch page, use the `public/` build of the main app (it shows an "opening soon" page until it is connected) or build a new page with a waitlist form that saves to your own database.
