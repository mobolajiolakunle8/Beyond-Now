# BEYOND NOW — Firebase Setup & Deployment

One-time setup for project **`beyond-now-14935`**, then the commands you run
every time you ship.

> Schema, fields and access rules are documented in [`DATABASE.md`](./DATABASE.md).
> Member accounts and chat behaviour are in [`ACCOUNTS_SETUP.md`](./ACCOUNTS_SETUP.md).

---

## 1. Environment files

Vite picks the file by mode and bakes the values into the bundle **at build time**:

| File | Loaded by | Committed? |
|---|---|---|
| `.env.production` | `npm run build` → what Firebase Hosting serves | **Yes** |
| `.env.development` | `npm run dev` | **Yes** |
| `.env.local`, `.env.*.local` | personal overrides | No (git-ignored) |

Both committed files are already filled in for `beyond-now-14935`. They contain
the Firebase *web* config, which every browser downloads anyway — it is public
by design and protected by `firestore.rules` / `storage.rules`, not by secrecy.
Committing them is what guarantees a CI or teammate build produces a working
site instead of "Firebase is not configured".

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `beyond-now-14935.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL (reserved) |
| `VITE_FIREBASE_PROJECT_ID` | `beyond-now-14935` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `beyond-now-14935.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender id |
| `VITE_FIREBASE_APP_ID` | Web app id |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics (optional) |
| `VITE_ADMIN_EMAIL` | Root administrator (`beyondnow.ng@gmail.com`) |
| `VITE_ADMIN_NAME` | Root administrator display name |

`npm run preflight` verifies all of this before any deploy.

---

## 2. Firebase console (once)

1. **Authentication → Sign-in method** → enable **Email/Password**.
2. **Authentication → Users → Add user**
   `beyondnow.ng@gmail.com` + a strong password.
   ⚠️ Do this **before** the site is public — the root-admin rule matches on
   this email, so it must belong to you.
3. **Firestore Database → Create database** → production mode → choose a region.
4. **Storage → Get started** (default bucket).

---

## 3. Firebase CLI (once)

```bash
npm install -g firebase-tools
firebase login
firebase use default        # → beyond-now-14935 (from .firebaserc)
```

---

## 4. Deploy

### Security rules (deploy first, and again whenever `*.rules` change)

**Option A (Firebase Console - fastest):**
1. Open [Firebase Console](https://console.firebase.google.com/) → project **beyond-now-14935**
2. Go to **Firestore Database** → **Rules** tab
3. Copy the entire contents of `firestore.rules` and paste it into the editor
4. Click **Publish** (active immediately!)
5. (Optional) Go to **Storage** → **Rules** tab → paste `storage.rules` → **Publish**

**Option B (Firebase CLI):**
```bash
npm run deploy:rules
# or: firebase deploy --only firestore:rules,storage
```

### Website (Hosting)

```bash
npm run build
firebase deploy --only hosting:default
```

`firebase deploy --only hosting` is equivalent — `.firebaserc` maps the
`default` hosting target to `beyond-now-14935`. `firebase.json` serves
`dist/`, rewrites every path to `index.html` (the app uses hash routing), and
sets no-cache + security headers on the document.

### Everything at once (recommended)

```bash
npm run deploy
```

This runs, in order: **preflight → rules → build → hosting**. Rules go first
on purpose — hosting is never shipped against a deny-all database, which is
exactly what produces "Missing or insufficient permissions" after a deploy.
If preflight finds a problem it aborts before anything is uploaded.

---

## 5. How publishing works

There is **no draft/publish step**. Every edit made in the admin dashboard is
written to `site/main` about one second after you stop typing, and every open
browser — visitors and admins — receives it through a realtime listener.

| Action | Effect |
|---|---|
| Edit any field | Saved locally instantly; pushed to Firestore after ~1 s |
| Close the tab mid-edit | Pending write is flushed on `pagehide` |
| Firebase unreachable | Public site keeps rendering from cache; admin sees **Sync error** |
| Hide a story / resource | Removed from the public page immediately |

The header badge shows **Publishing…** while a write is in flight and **Live**
once it has landed.

---

## 6. Verify

1. Open the site → it paints immediately.
2. `/#/admin` → sign in with the root admin.
3. Change the hero headline → within ~2 s a second browser shows the new text.
4. `/#/account/signup` in a private window → create a member → **Messages** → send.
5. Admin **Messages** shows the thread with a **1 new** badge instantly; reply.
6. Member sees the reply and a notification without refreshing.
7. `/#/admin` as the member → "Administrators only" screen (and Firestore denies writes).

---

## 7. Checklist

- [ ] Email/Password enabled
- [ ] Root admin user created (`beyondnow.ng@gmail.com`)
- [ ] `firestore.rules` + `storage.rules` deployed
- [ ] `npm run build && firebase deploy --only hosting:default`
- [ ] `.env` not committed
- [ ] Admin password rotated after first sign-in (Admin → Admin Account)
