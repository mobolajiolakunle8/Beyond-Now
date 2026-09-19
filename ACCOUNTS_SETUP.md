# BEYOND NOW — User Accounts & Realtime Chat

This document explains how to enable the new user account system, the admin
user management tools and the realtime chat. Nothing in this layer changes the
existing landing page design or the existing CMS — they remain separate
hash-routed apps.

## Routes

```
#home                     → Public landing page (unchanged)
/#/account/signin         → Sign in
/#/account/signup         → Create account
/#/account/reset          → Password reset
/#/account/dashboard      → User overview
/#/account/profile        → My profile + avatar
/#/account/messages       → Private chat with Beyond Now
/#/account/resources      → Browse published resources, save them
/#/account/saved          → Bookmarked resources
/#/account/progress       → Milestones + activity counters
/#/account/notifications  → Notifications
/#/account/settings       → Password change, preferences
/#/account/logout         → Sign out
/#/account/admin          → Admin shortcut (if profile.role == "admin")
/#/admin/...              → Admin CMS (existing)
```

## Firebase console setup

1. **Authentication → Sign-in method**
   - Enable **Email/Password**.
   - (Optional) Enable **Google** if you want the social sign-in placeholder
     to light up.
2. **Firestore → Indexes** — leave default; the rules use single-key queries.

### Create the first administrator

You cannot grant admin from the UI alone — admin custom claims must be set
with privileged credentials. The simplest path:

```bash
# One-off Cloud Function (deploy separately, then call from a trusted shell)
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const grantAdmin = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth?.token?.isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
  await admin.auth().setCustomUserClaims(data.uid, { isAdmin: true });
  await admin.firestore().doc(`users/${data.uid}`).set({ role: "admin" }, { merge: true });
  return { ok: true };
});
```

Or — for development only — promote the first admin directly from the client
using `grantAdminClaim(uid)` exposed at `src/lib/userStore.tsx`. This sets the
Firestore role and the dashboard will treat them as admin immediately. To
make those client-side privileges stick across browsers, deploy the Cloud
Function above to write the matching `isAdmin` custom claim.

### Creating regular users

Users sign themselves up via `#/account/signup`. Their profile document is
seeded client-side; you can replace this with a Cloud Function on
`auth.user().onCreate` for stricter guarantees:

```js
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  await admin.firestore().doc(`users/${user.uid}`).set({
    uid: user.uid,
    email: user.email,
    name: user.displayName || user.email.split("@")[0],
    role: "user",
    status: "active",
    bio: "",
    avatarUrl: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastSeenAt: Date.now(),
    activity: { saved: 0, messages: 0, notifications: 0 },
  });
  // Optional: create empty thread
  await admin.firestore().collection("threads").add({
    userId: user.uid,
    userName: user.displayName || user.email,
    userEmail: user.email,
    userAvatar: "",
    status: "open",
    lastMessage: "",
    lastSender: "user",
    lastMessageAt: Date.now(),
    unreadByUser: 0,
    unreadByAdmin: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
});
```

## Data model

```
users/{uid}
  uid, email, name, role, status, bio, avatarUrl,
  createdAt, updatedAt, lastSeenAt, activity { saved, messages, notifications }
  saved/{itemId}            ← user bookmarked resources
  notifications/{itemId}    ← in-app notifications

threads/{threadId}
  userId, userName, userEmail, userAvatar,
  status ("open" | "resolved"),
  lastMessage, lastSender, lastMessageAt,
  unreadByUser, unreadByAdmin,
  createdAt, updatedAt
  messages/{msgId}
    senderUid, senderRole, senderName, text, createdAt, read

articles/{articleId}         ← admin-published long-form articles
  title, summary, body, category, published, authorId, authorName,
  createdAt, updatedAt
```

## Security rules summary

(Full rules are in `firestore.rules` and `storage.rules`.)

| Collection | Read | Write |
|---|---|---|
| `users/{uid}` | self or admin | self (no role/status escalation) or admin |
| `users/{uid}/saved` | self or admin | self or admin |
| `users/{uid}/notifications` | self or admin | self or admin |
| `threads/{threadId}` | owner or admin | owner (limited) or admin |
| `threads/{threadId}/messages/*` | owner or admin | sender (matching role) or admin |
| `articles/{articleId}` | any signed-in user | admin |
| `media/**` (Storage) | public | admin only, image type, 15 MB |
| `avatars/{uid}/**` (Storage) | public | owner or admin, image type, 5 MB |

The admin `isAdmin` claim must be set via a Cloud Function or the Firebase
console; **no client-side code can grant it**. The dashboard reads `profile.role`
for instant UI gating, but the Firestore rules require the ID-token claim —
that is the real source of truth.

## Realtime behaviour

- **User → Admin** — `sendUserMessage()` writes to `threads/{threadId}/messages`
  and bumps `unreadByAdmin`. The admin dashboard listener `subscribeAllThreads()`
  pushes the change instantly.
- **Admin → User** — `sendAdminMessage()` writes a message and pushes a
  notification into `users/{uid}/notifications`. The user's dashboard listener
  updates the bell badge and the messages list without refresh.
- **Cross-device** — Firebase sessions persist via IndexedDB. The same user
  signed in on Chrome and Firefox sees the same messages within ~1 second.
- **Notifications badge** — every unread record increments `activity.notifications`,
  displayed on the dashboard and `Messages` sidebar badge.

## Manual test plan

| Test | Pass criteria |
|---|---|
| Sign up new user | Redirected to dashboard; welcome notification visible |
| Profile edit | Name + bio saved; avatar uploaded to `avatars/{uid}/`; visible after reload |
| Cross-tab sign-in | Same user on two browsers; message from one appears in the other within ~2 s |
| User sends message | Admin Messages page shows unread badge immediately |
| Admin replies | User dashboard messages list updates without refresh; notification bell updates |
| User tries to open `/admin` | Firestore rule denies; user sees “Page not found” |
| User tries to read another user’s `saved` | Rule denies; data never reaches the client |
| Admin promotes a user to admin | After page reload (or `refreshProfile`) the user sees admin nav |
| Password reset email | User receives reset link; can sign in with the new password |
