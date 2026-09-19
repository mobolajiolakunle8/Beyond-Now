# BEYOND NOW — Member Accounts & Realtime Chat

How the member area, the admin inbox and the realtime conversation between
them work. Field-level detail lives in [`DATABASE.md`](./DATABASE.md).

---

## Routes

```
/#home                        Public website
/#/account/signin             Sign in
/#/account/signup             Create account
/#/account/reset              Password reset (Firebase email link)
/#/account/dashboard          Overview
/#/account/profile            Name, bio, profile picture
/#/account/messages           Private chat with Beyond Now
/#/account/resources          Browse & save published guidance
/#/account/saved              Bookmarks
/#/account/progress           Milestones from real activity
/#/account/notifications      In-app notifications
/#/account/settings           Password, notification preferences
/#/account/logout             Sign out

/#/admin                      Admin dashboard (administrators only)
/#/admin/users                Members: search, profile, suspend, promote, chat
/#/admin/messages             Inbox of every conversation, realtime
```

---

## Who is an administrator?

A signed-in user is an administrator when **any** of these is true — and the
Firestore/Storage rules check exactly the same three conditions server-side:

1. Custom claim `isAdmin: true` on their ID token
2. Their email is `beyondnow.ng@gmail.com`
3. A document exists at `admins/{uid}`

**First admin:** create `beyondnow.ng@gmail.com` in Authentication and sign in.
On first sign-in the app writes `users/{uid}.role = "admin"` and `admins/{uid}`.

**More admins:** Admin → Users → open a member → **Make admin**. This writes
`admins/{uid}` (server-enforced) and sets their role. **Revoke admin** removes it.

Members can never grant themselves admin: the `users` rules reject any change
to `role`/`status` by the owner, and only admins may write to `admins/*`.

Optional hardening with the Admin SDK (a Cloud Function or one-off script):

```ts
await admin.auth().setCustomUserClaims(uid, { isAdmin: true });
```

---

## Realtime chat — how a message travels

```
Member types → sendUserMessage()
  ├─ threads/{uid}/messages/{id}         (new message)
  ├─ threads/{uid}.lastMessage / unreadByAdmin +1 / status "open"
  └─ users/{uid}.activity.messages +1
        │
        ▼  onSnapshot (admin inbox is subscribed to /threads)
Admin sees "1 new" instantly → opens → unreadByAdmin reset → replies
  ├─ threads/{uid}/messages/{id}         (senderRole "admin")
  ├─ threads/{uid}.unreadByUser +1
  └─ users/{uid}/notifications/{id}      (kind "message")
        │
        ▼  onSnapshot (member is subscribed to their own thread + messages)
Member sees the reply + a notification without refreshing
```

- One thread per member, keyed by the member's `uid` — created automatically
  on first sign-in, so an administrator can also start the conversation.
- Suspended members can read their history but cannot send (rule-enforced).
- Works identically across Chrome, Firefox, Edge and mobile browsers; the same
  account on two devices stays in sync within ~1 second.

---

## What the rules guarantee

| Guarantee | Enforced by |
|---|---|
| A member can only read/write their own thread | `threads/{uid}` where `uid == request.auth.uid` |
| A member cannot forge `senderUid` or `senderRole` | message `create` rule |
| A member cannot promote themself | `users` update rule requires `role` and `status` unchanged |
| A member cannot read another member's profile, saves or notifications | path-scoped rules under `users/{uid}` |
| A non-admin cannot edit the website or media | `site/*`, `media/*` require `isAdmin()` |
| Passwords never touch Firestore | Firebase Authentication |

---

## Manual test plan

| # | Test | Expected |
|---|---|---|
| 1 | Sign up a new member | Lands on dashboard; welcome notification appears |
| 2 | Edit name + bio, upload avatar | Saved; visible after reload and on another device |
| 3 | Member sends a message | Admin **Messages** shows thread + "1 new" within ~1 s |
| 4 | Admin replies | Member's Messages updates live; Notifications gains an item |
| 5 | Same member on a second browser | Both browsers show identical transcript |
| 6 | Member opens `/#/admin` | "Administrators only" screen |
| 7 | Member tries to read another `threads/{otherUid}` (e.g. via console) | `permission-denied` |
| 8 | Admin suspends member | Member's Send is rejected by rules |
| 9 | Admin promotes a member | After re-login they see the admin link and dashboard |
| 10 | Password reset | Email arrives; new password signs in |
