# BEYOND NOW — Firebase setup

The admin CMS, public website, user accounts and realtime chat all sync through Firebase so every browser and device sees the same data.

For user accounts, admin user-management and realtime chat setup, see [`ACCOUNTS_SETUP.md`](./ACCOUNTS_SETUP.md) once this guide is complete.

## 1. Environment files

```bash
cp .env.example .env
```

`.env` is already filled for project `beyond-now-14935`. Vite only exposes variables prefixed with `VITE_`.

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `*.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project id |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender |
| `VITE_FIREBASE_APP_ID` | Web app id |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics (optional) |
| `VITE_ADMIN_EMAIL` | Default admin email shown in UI |
| `VITE_ADMIN_NAME` | Default admin display name |

`.env` is gitignored. Commit `.env.example` only.

## 2. Enable Authentication

1. Firebase console → **Authentication** → **Get started**
2. **Sign-in method** → enable **Email/Password**
3. **Users** → **Add user**
   - Email: `beyondnow.ng@gmail.com` (or your `VITE_ADMIN_EMAIL`)
   - Password: choose a strong password (8+ characters)

Sign-in uses Firebase Auth only. There is no client-side password store.

> After the admin signs in to the dashboard, the same Firebase account can sign in to the public user dashboard at `/#/account/signin`. To elevate a regular user to administrator, deploy the `grantAdmin` Cloud Function shown in `ACCOUNTS_SETUP.md`.

## 3. Create Firestore

1. **Build → Firestore Database → Create database**
2. Start in **production mode**
3. Choose a region close to your audience (e.g. `europe-west` or `us-central`)

### Deploy rules

```bash
npm i -g firebase-tools
firebase login
firebase use beyond-now-14935
firebase deploy --only firestore:rules,storage
```

Rules live in:

- `firestore.rules` — public **read** of `site/*` + `media/*`; **write** requires auth
- `storage.rules` — public **read** of `/media/**`; **write** requires auth + image content-type + 15 MB cap

## 4. Enable Storage

1. **Build → Storage → Get started**
2. Use the default bucket (`beyond-now-14935.firebasestorage.app`)
3. Deploy `storage.rules` (command above)

## 5. Analytics (optional)

Measurement ID `G-SHHCW15QQJ` is already in `.env`. Analytics initialises only in real browsers when the ID is set and the environment supports it.

## 6. Data model

```
Firestore
├── site/main
│     published: SiteContent     # live public website
│     draft: SiteContent         # admin working copy
│     meta: { publishedAt, draftSavedAt }
│     updatedAt, updatedBy
└── media/{id}
      name, url, storagePath, width, height, size, type, uploadedAt

Storage
└── media/{id}.{webp|png|jpg}    # compressed originals
```

## 7. How sync works

| Action | Behaviour |
|---|---|
| Edit content | Debounced write to Firestore draft (~1.2s) + local cache |
| Save draft | Immediate push of draft + meta |
| Publish | Writes identical draft + published; every browser updates live via `onSnapshot` |
| Upload image | Client compresses → Storage upload → Firestore metadata doc |
| Offline | Local cache keeps the last known site running; status badge shows `offline` |
| Other browsers | Real-time listeners update draft/published/media automatically |

## 8. Local fallback

If `.env` is missing or incomplete, the app runs in **local mode**:

- Auth accepts `VITE_ADMIN_EMAIL` with any 8+ character password
- Content + media stay in `localStorage` only
- Status badge shows `local`

## 9. Verify

1. `npm run dev` → open `/#/admin`
2. Sign in with the Firebase user
3. Edit a hero headline → Save draft → open the site in a private window → content should **not** change yet
4. Publish → private window updates without a refresh (or after one reload if the tab was cold)
5. Upload an image in Media Library → confirm it appears in Storage and on the live site after publish

## 10. Security checklist

- [ ] Email/Password provider enabled
- [ ] At least one admin user created
- [ ] `firestore.rules` deployed
- [ ] `storage.rules` deployed
- [ ] `.env` not committed
- [ ] Password rotated after first login (Admin Account → Change password)
