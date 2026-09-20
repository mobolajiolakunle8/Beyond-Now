# BEYOND NOW — Firebase Setup & Deployment

One-time setup for project **`beyond-now-14935`**, then the commands you run
every time you ship.

> Schema, fields and access rules are documented in [`DATABASE.md`](./DATABASE.md).
> Member accounts and chat behaviour are in [`ACCOUNTS_SETUP.md`](./ACCOUNTS_SETUP.md).

---

## 1. Configuration — nothing to set up

The production Firebase config for **`beyond-now-14935`** is compiled into
`src/lib/firebase.ts`. A Firebase web config is public by design (it identifies
the project; it authorises nothing — Security Rules and Authentication do that),
so shipping it removes a whole class of deploy failures: a CI build without the
git-ignored `.env` used to produce an app that could not reach Firebase at all.

```
apiKey             AIzaSyBFCcuKcHSPsMIKK3o5kZjFnfoKaRPG5Sw
authDomain         beyond-now-14935.firebaseapp.com
databaseURL        https://beyond-now-14935-default-rtdb.firebaseio.com
projectId          beyond-now-14935
storageBucket      beyond-now-14935.firebasestorage.app
messagingSenderId  198562263965
appId              1:198562263965:web:26b12df22078a93886b574
measurementId      G-SHHCW15QQJ
```

`.env` is **optional** and only needed to point a build at a *different*
project (staging, a fork). Copy `.env.example` → `.env` and override any of
`VITE_FIREBASE_*`, `VITE_ADMIN_EMAIL`, `VITE_ADMIN_NAME`.

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

```bash
firebase deploy --only firestore:rules,storage
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
