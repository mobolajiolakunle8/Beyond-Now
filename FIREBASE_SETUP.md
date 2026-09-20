# BEYOND NOW — Firebase Setup & Deployment

Configuration and deployment guide for project **`beyond-now-14935`**.

> Database schema, fields and access rules are in [`DATABASE.md`](./DATABASE.md).
> Member accounts and realtime chat behaviour are in [`ACCOUNTS_SETUP.md`](./ACCOUNTS_SETUP.md).

---

## 1. Firebase Configuration

The client SDK configuration for `beyond-now-14935` is built directly into the application with automatic fallback:

```ts
const firebaseConfig = {
  apiKey: "AIzaSyBFCcuKcHSPsMIKK3o5kZjFnfoKaRPG5Sw",
  authDomain: "beyond-now-14935.firebaseapp.com",
  databaseURL: "https://beyond-now-14935-default-rtdb.firebaseio.com",
  projectId: "beyond-now-14935",
  storageBucket: "beyond-now-14935.firebasestorage.app",
  messagingSenderId: "198562263965",
  appId: "1:198562263965:web:26b12df22078a93886b574",
  measurementId: "G-SHHCW15QQJ"
};
```

Environment variables (in `.env`) allow overriding any parameter at build time:

| Variable | Config Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyBFCcuKcHSPsMIKK3o5kZjFnfoKaRPG5Sw` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `beyond-now-14935.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | `https://beyond-now-14935-default-rtdb.firebaseio.com` |
| `VITE_FIREBASE_PROJECT_ID` | `beyond-now-14935` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `beyond-now-14935.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `198562263965` |
| `VITE_FIREBASE_APP_ID` | `1:198562263965:web:26b12df22078a93886b574` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-SHHCW15QQJ` |
| `VITE_ADMIN_EMAIL` | `beyondnow.ng@gmail.com` |
| `VITE_ADMIN_NAME` | `Master Administrator` |

---

## 2. One-Time Console Setup

1. **Authentication → Sign-in method** → enable **Email/Password**.
2. **Authentication → Users → Add user**:
   - Email: `beyondnow.ng@gmail.com`
   - Set a strong password.
3. **Firestore Database → Create database** → production mode.
4. **Storage → Get started** (bucket: `beyond-now-14935.firebasestorage.app`).

---

## 3. Deploying Rules and Hosting

```bash
# 1. Build the production application
npm run build

# 2. Deploy Firestore & Storage Security Rules
firebase deploy --only firestore:rules,storage

# 3. Deploy Hosting
firebase deploy --only hosting
```

---

## 4. Cross-Browser Realtime Sync Verification

1. **Sign Up / Sign In:** User accounts register directly in Firebase Auth and create Firestore member documents at `users/{uid}`.
2. **Realtime Chat:**
   - When a member sends a message in `#/account/messages`, it is written to `threads/{uid}/messages` with `unreadByAdmin + 1`.
   - The Admin `#/admin/messages` receives the message instantly via Firestore `onSnapshot`.
   - When the admin replies, the user's view updates immediately across all open tabs/devices.
3. **Content Auto-Publish:**
   - Edits made in the Admin Dashboard automatically sync to `site/main`.
   - Any open visitor browser updates live without a page refresh.
