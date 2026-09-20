
---

## Troubleshooting — "Permission denied" / "Missing or insufficient permissions"

**Symptoms:** Admin Overview shows `SYNC ERROR — Your last change could not be synced`, and member dashboards show `Missing or insufficient permissions.` But sign-in works fine.

**Cause:** Firestore was created in **production mode** (defaults to deny-all) and `firestore.rules` / `storage.rules` have not been deployed — or a `firebase deploy` for rules failed silently. Hosting deployments never deploy rules.

**Fix, in order:**

1. From the project folder:
   ```bash
   npm run deploy:rules        # == firebase deploy --only firestore:rules,storage
   ```
   It must print `✔ Deploy complete!` — any `Error:` line aborts and leaves deny-all in place.
2. Back in the dashboard press **Run cloud check** (Overview). Every step flips green and syncing resumes without a refresh.
3. Signed-in admin must be the account listed in Firebase → **Authentication → Users** as `beyondnow.ng@gmail.com` — the root-admin rule matches that exact address.

**If rules deploy but the error persists:**
- Firebase projects differ: run `firebase use` and confirm it prints `beyond-now-14935`.
- The console opened a second database — rules only cover the one named **(default)**.
- Corporate proxy blocking Firestore (test with `firebase firestore:databases:get`).

**Certified recovery flow (no refresh needed):** the app re-opens every rejected realtime listener with backoff, retries failed saves after re-bootstrapping the `admins/{uid}` allow-list, and re-syncs on tab focus or when connectivity returns.
