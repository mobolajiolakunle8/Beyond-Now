# BEYOND NOW — Firebase Setup & Deployment

One-time setup for project **`beyond-now-14935`**, then the commands you run
every time you ship.

> Schema, fields and access rules are documented in [`DATABASE.md`](./DATABASE.md).
> Member accounts and chat behaviour are in [`ACCOUNTS_SETUP.md`](./ACCOUNTS_SETUP.md).

---

## 1. Environment variables

```bash
cp .env.example .env
```

`.env` is already filled for `beyond-now-14935`. Vite exposes only `VITE_*` vars.

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `beyond-now-14935.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `beyond-now-14935` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `beyond-now-14935.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender id |
| `VITE_FIREBASE_APP_ID` | Web app id |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics (optional) |
| `VITE_ADMIN_EMAIL` | Root administrator email (`beyondnow.ng@gmail.com`) |
| `VITE_ADMIN_NAME` | Display name for the root administrator |

`.env` is git-ignored. Commit `.env.example` only.

If `.env` is missing, the app runs in **local mode** (content in the browser
only; the admin signs in with `VITE_ADMIN_EMAIL` and any 8+ character password).

---

## 2. Firebase console (once)

1. **Authentication → Sign-in method** → enable **Email/Password**.
2. **Authentication → Users → Add user**
   `beyondnow.ng@gmail.com` + a strong password.
   ⚠️ Do this **before** the site is public — the root-admin rule matches on
   this email, so it must belong to you.
3. **Realtime Database → Create Database** → use the default location. Confirm its URL is
   `https://beyond-now-14935-default-rtdb.firebaseio.com/`.
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

**Option A (Firebase Console - fastest, takes 15 seconds):**
1. Open [Firebase Console](https://console.firebase.google.com/) → project **beyond-now-14935**
2. Go to **Build** → **Realtime Database** (`https://beyond-now-14935-default-rtdb.firebaseio.com/`) → **Rules** tab
3. Copy the entire contents of `database.rules.json` and paste it into the editor
4. Click **Publish** (active immediately!)
5. (Optional) In **Storage** → **Rules** tab → paste `storage.rules` → click **Publish**

**Option B (Firebase CLI):**
```bash
npm run deploy:rules
# runs: firebase deploy --only database,storage
```

### Website (Hosting)

```bash
npm run build
firebase deploy --only hosting
```

`firebase deploy --only hosting` deploys directly to `beyond-now-14935`.
`firebase.json` serves
`dist/`, rewrites every path to `index.html` (the app uses hash routing), and
sets no-cache + security headers on the document.

### Everything at once

```bash
npm run build && firebase deploy
```

---

## 5. How publishing works

There is **no draft/publish step**. Every edit made in the admin dashboard is
written to `site/main` about one second after you stop typing, and every open
browser — visitors and admins — receives it through a realtime listener.

| Action | Effect |
|---|---|
| Edit any field | Saved locally instantly; pushed to Realtime Database after ~1 s |
| Close the tab mid-edit | Pending write is flushed on `pagehide` |
| Firebase unreachable | Public site keeps rendering from cache; admin sees **Sync error** |
| Hide a story / resource | Removed from the public page immediately |

The header badge shows **Publishing…** while a write is in flight and **Live**
once it has landed.

### Media processing

All local uploads are processed in the browser before storage. The dashboard
shows the final dimensions, original dimensions when resized, original bytes,
final bytes and percentage saved.

| Upload | Recommended dimensions | Processing profile |
|---|---:|---|
| CMS photography / story images | 1600 × 900 px or higher | Longest edge capped at 1600 px; WebP at quality 0.82 |
| Hero image | 1400 × 1750 px (4:5) | Longest edge capped at 1600 px |
| About image | 1200 × 1500 px (4:5) | Longest edge capped at 1600 px |
| Official logo | 1200 × 400 px (3:1) | Longest edge capped at 1200 px; transparent PNG preserved |
| Favicon / avatar | 512 × 512 px square | Longest edge capped at 512 px; transparent PNG preserved |

The official logo is uploaded locally under **Admin → Site Settings → Official
logo**. Unlocking that panel is a deliberate safety step; the local file picker
uploads it to the media library and preserves its aspect ratio everywhere it is
rendered.

### Member Library release

Administrators can prepare packs in **Admin → Resources** at any time. In
**Admin → Member Library**, they can preview the exact member catalogue while
it remains private, edit the Coming soon copy, then activate it with one switch.
Until activated, the member Library displays only the Coming soon state.

---

## 6. Verify

1. Open the site → it paints immediately.
2. `/#/admin` → sign in with the root admin.
3. Change the hero headline → within ~2 s a second browser shows the new text.
4. `/#/account/signup` in a private window → create a member → **Messages** → send.
5. Admin **Messages** shows the thread with a **1 new** badge instantly; reply.
6. Member sees the reply and a notification without refreshing.
7. `/#/admin` as the member → "Administrators only" screen (and Realtime Database denies admin writes).

---

## 7. Checklist

- [ ] Email/Password enabled
- [ ] Root admin user created (`beyondnow.ng@gmail.com`)
- [ ] `database.rules.json` + `storage.rules` published
- [ ] `npm run deploy`
- [ ] `.env` not committed
- [ ] Admin password rotated after first sign-in (Admin → Admin Account)
