# BEYOND NOW — Database Reference

Complete reference for every collection, document, field, storage path and
access rule in the Beyond Now Firebase project (`beyond-now-14935`).

All timestamps are **Unix epoch milliseconds** (`Date.now()`) unless the field
name ends in `At` and is described as ISO — the CMS document uses ISO strings
so the admin UI can display exactly what was stored.

---

## 1. Overview

```
Cloud Firestore
├── site/main                      Live website content (CMS)
├── media/{mediaId}                Media library metadata
├── articles/{articleId}           Long-form articles for members
├── admins/{uid}                   Administrator allow-list
├── users/{uid}                    Member profile
│   ├── saved/{itemId}             Bookmarked resources
│   └── notifications/{itemId}     In-app notifications
└── threads/{uid}                  One private conversation per member
    └── messages/{messageId}       Chat messages

Cloud Storage
├── media/{mediaId}.{webp|png|jpg} CMS images
└── avatars/{uid}/avatar.{webp|png} Member profile pictures

Firebase Authentication
└── Email/Password users           uid is the primary key everywhere
```

### Key design decisions

| Decision | Why |
|---|---|
| `threads/{uid}` — thread id **is** the member's uid | Race-free creation, single-document listener for the member, no query needed for the admin to open any conversation. |
| Sub-collections under `users/{uid}` for `saved` and `notifications` | Ownership is expressed by the path, so security rules are trivial and cannot leak across users. |
| Admin = claim **or** root email **or** `admins/{uid}` | Works without any server code on day one; scales to multiple admins; the Admin SDK claim remains supported. |
| CMS content is a single document | The whole site is ~40 KB of JSON; one realtime listener keeps every visitor in sync. Edits are written whole so removed fields are purged. |
| Media stored by reference (`media:<id>`) inside content | Keeps the CMS document small; replacing an image updates every usage. |

---

## 2. Authentication

Provider: **Email / Password** (Firebase Authentication).

| Auth field | Used for |
|---|---|
| `uid` | Primary key for `users`, `threads`, `admins`, Storage avatar path |
| `email` | Displayed in dashboards; root-admin match in rules |
| `displayName` | Kept in sync with `users/{uid}.name` |

Sessions persist in the browser (IndexedDB) so the same account signed in on
Chrome, Firefox, Edge or a phone sees identical realtime data.

### Administrator resolution (server-enforced)

A request is treated as an administrator when **any** of the following is true:

1. ID-token custom claim `isAdmin == true` (set with the Firebase Admin SDK)
2. ID-token email equals `beyondnow.ng@gmail.com` (root admin bootstrap)
3. A document exists at `admins/{uid}` (created by an existing admin)

The client mirrors this in `resolveIsAdmin()` purely to decide which UI to show.

---

## 3. Collections

### 3.1 `site/main` — website content

Single document. Public read, admin write. Written **in full** on every save.

| Field | Type | Description |
|---|---|---|
| `published` | `SiteContent` | The entire website copy, images and settings (see §4) |
| `updatedAt` | string (ISO) | When the last edit was saved |
| `updatedBy` | string | `uid` of the administrator who saved |

### 3.2 `media/{mediaId}`

Metadata for an image in the media library. Public read, admin write.

| Field | Type | Description |
|---|---|---|
| `id` | string | Same as document id |
| `name` | string | Display file name (editable) |
| `url` | string | Public download URL from Storage |
| `storagePath` | string | e.g. `media/abc123.webp` |
| `width`, `height` | number | Pixels after client-side resize (max edge 1600) |
| `size` | number | Bytes |
| `type` | string | MIME type stored (`image/webp` or `image/png`) |
| `uploadedAt` | string (ISO) | Upload time |

### 3.3 `articles/{articleId}`

Long-form pieces visible to signed-in members. Member read, admin write.

| Field | Type |
|---|---|
| `id` | string |
| `title`, `summary`, `body`, `category` | string |
| `published` | boolean — hidden from members when `false` |
| `authorId`, `authorName` | string |
| `createdAt`, `updatedAt` | number (ms) |

### 3.4 `admins/{uid}` — allow-list

Existence of this document grants administrator rights. Admin write only.

| Field | Type | Description |
|---|---|---|
| `uid` | string | Same as document id |
| `email` | string | For auditing |
| `grantedBy` | string | `uid` of the granting admin, or `"bootstrap"` |
| `grantedAt` | number (ms) | |

### 3.5 `users/{uid}` — member profile

Created on sign-up by the member's own client (rules force `role: "user"`,
`status: "active"`). Members can edit their profile but **cannot** change
`role`, `status`, `uid` or `createdAt`; only administrators can.

| Field | Type | Description |
|---|---|---|
| `uid` | string | Same as document id |
| `email` | string | Lower-cased |
| `name` | string | Display name |
| `role` | `"user"` \| `"admin"` | Mirrors admin status for UI; rules remain the source of truth |
| `status` | `"active"` \| `"suspended"` | Suspended members cannot send messages |
| `bio` | string | Optional |
| `avatarUrl` | string | Public Storage URL or `""` |
| `preferences.notifyMessages` | boolean | Default `true` |
| `preferences.notifyResources` | boolean | Default `false` |
| `activity.saved` | number | Count of saved resources (kept with `increment`) |
| `activity.messages` | number | Messages the member has sent |
| `activity.notifications` | number | Notifications ever created |
| `createdAt` | number (ms) | Sign-up time |
| `updatedAt` | number (ms) | Last profile edit |
| `lastSeenAt` | number (ms) | Last sign-in |

#### 3.5.1 `users/{uid}/saved/{itemId}`

Document id = sanitised `ref`, so saving twice is idempotent.

| Field | Type | Description |
|---|---|---|
| `id` | string | Same as document id |
| `userId` | string | Owner uid |
| `ref` | string | `resource:<trackId>:<itemId>` — stable pointer into CMS content |
| `title`, `description` | string | Snapshot at save time |
| `savedAt` | number (ms) | |

#### 3.5.2 `users/{uid}/notifications/{itemId}`

| Field | Type | Description |
|---|---|---|
| `id` | string | `n_<timestamp>_<rand>` |
| `userId` | string | Owner uid |
| `kind` | `"message"` \| `"system"` \| `"resource"` | Drives the icon colour |
| `title`, `body` | string | |
| `href` | string | In-app link, e.g. `#/account/messages` |
| `read` | boolean | |
| `createdAt` | number (ms) | |

Producers: the member's own client (welcome notice) and administrators
(when replying to a message).

### 3.6 `threads/{uid}` — private conversation

Exactly one per member. Created automatically the first time the member signs
in (or by an administrator who wants to reach out first).

| Field | Type | Description |
|---|---|---|
| `id` | string | Same as document id and as `userId` |
| `userId` | string | Member uid |
| `userName`, `userEmail`, `userAvatar` | string | Denormalised for the admin inbox list |
| `status` | `"open"` \| `"resolved"` | Admin can resolve; any new message reopens |
| `lastMessage` | string | First 200 chars of the latest message |
| `lastSender` | `"user"` \| `"admin"` \| `""` | |
| `lastMessageAt` | number (ms) | Admin inbox is ordered by this |
| `unreadByUser` | number | Incremented by admin replies; reset when the member opens Messages |
| `unreadByAdmin` | number | Incremented by member messages; reset when an admin opens the thread |
| `createdAt`, `updatedAt` | number (ms) | |

#### 3.6.1 `threads/{uid}/messages/{messageId}`

Immutable once written (only admins may moderate).

| Field | Type | Description |
|---|---|---|
| `id` | string | `m_<timestamp>_<rand>` |
| `threadId` | string | Parent thread / member uid |
| `senderUid` | string | Must equal the caller's uid (enforced) |
| `senderRole` | `"user"` \| `"admin"` | Enforced against the caller's role |
| `senderName` | string | Display name at send time |
| `text` | string | 1–2000 characters (enforced) |
| `createdAt` | number (ms) | Messages are ordered by this |

---

## 4. `SiteContent` (inside `site/main.published`)

Only the shape is listed; every value is editable in **Admin → Website Content**.

| Key | Contents |
|---|---|
| `brand` | `logoUrl`, `wordmarkPrimary`, `wordmarkAccent`, `tagline`, `coreMessage` |
| `nav` | `links[] {id,label,href}`, `ctaLabel` |
| `hero` | `badge`, `headingLead`, `headingAccent`, `body`, `ctaPrimary`, `ctaSecondary`, `trust[]`, `quote`, `quoteLabel`, `imageMain`, `imageMainAlt` |
| `about` | `eyebrow`, `headingLead`, `headingAccent`, `paragraphs[]`, `founderEyebrow`, `founderQuote`, `founderName`, `imageMain`, `imageMainAlt` |
| `pillarsSection` | `eyebrow`, `headingLead`, `headingAccent`, `headingTail`, `lead` |
| `pillars[]` | `id`, `index`, `title`, `line`, `body`, `prompts[]` |
| `methodSection` | `eyebrow`, `headingLead`, `headingAccent`, `lead` |
| `method[]` | `id`, `title`, `kicker`, `body` |
| `storiesSection` | `eyebrow`, `headingLead`, `headingAccent`, `lead`, `shareLabel` |
| `stories[]` | `id`, `category`, `title`, `who`, `teaser`, `body[]`, `lesson`, `accent`, `image`, `imageAlt`, `link`, `status`, `updatedAt` |
| `resources[]` | `id`, `label`, `audience`, `intro`, `status`, `updatedAt`, `items[] {id,title,detail,link,status}` |
| `finalCta` | `eyebrow`, `heading`, `body`, `whatsappLabel`, `emailLabel`, `accountTitle`, `accountBody`, `accountCta`, `safetyNote` |
| `footer` | `blurb`, `quote`, `safeguarding`, `coreMessage`, `tagline` |
| `settings` | `email`, `whatsapp`, `whatsappDisplay`, `seoTitle`, `seoDescription`, `favicon`, `socials[] {id,label,url}` |

Image fields hold either a full URL or a reference `media:<mediaId>` that is
resolved against the `media` collection at render time.

---

## 5. Cloud Storage

| Path | Read | Write | Limits |
|---|---|---|---|
| `media/{id}.{ext}` | public | admin | image/jpeg·png·webp, < 15 MB |
| `avatars/{uid}/avatar.{ext}` | public | owner or admin | image/jpeg·png·webp, < 5 MB |

Images are resized client-side before upload (max edge 1600 px, WebP unless the
source is PNG with transparency).

---

## 6. Access matrix

| Path | Public | Member (self) | Member (other) | Admin |
|---|:-:|:-:|:-:|:-:|
| `site/main` | R | R | R | RW |
| `media/*` | R | R | R | RW |
| `articles/*` | – | R | R | RW |
| `admins/{uid}` | – | R (own) | – | RW |
| `users/{uid}` | – | R · U (no role/status) · C | – | RW · D |
| `users/{uid}/saved/*` | – | RW | – | RW |
| `users/{uid}/notifications/*` | – | RW | – | RW |
| `threads/{uid}` | – | R · C · U (active only) | – | RW · D |
| `threads/{uid}/messages/*` | – | R · C (as self, active only) | – | RW · D |

R = read, C = create, U = update, D = delete.

---

## 7. Data lifecycle

| Event | Writes |
|---|---|
| **Sign up** | Auth user → `users/{uid}` (role `user`, status `active`) |
| **First sign-in** | `users/{uid}.lastSeenAt`, `threads/{uid}` created, welcome notification |
| **Admin sign-in** | `users/{uid}.role = "admin"`, `admins/{uid}` created if missing |
| **Member sends message** | `threads/{uid}/messages/*` + thread `lastMessage`, `unreadByAdmin +1`, `status = open`; `users/{uid}.activity.messages +1` |
| **Admin replies** | `threads/{uid}/messages/*` + thread `unreadByUser +1`; `users/{uid}/notifications/*` (kind `message`) |
| **Member opens Messages** | thread `unreadByUser = 0` |
| **Admin opens thread** | thread `unreadByAdmin = 0` |
| **Save resource** | `users/{uid}/saved/{ref}`; `activity.saved +1` |
| **Remove saved** | delete + `activity.saved −1` |
| **Admin edits website** | `site/main` (whole document, ~1 s debounce) |
| **Upload media** | Storage object + `media/{id}` |
| **Suspend member** | `users/{uid}.status = "suspended"` → message rules deny |
| **Promote member** | `users/{uid}.role = "admin"` + `admins/{uid}` |

---

## 8. Indexes

All queries use a single ordered field, which Firestore indexes automatically:

| Collection | Query |
|---|---|
| `users` | `orderBy createdAt desc` |
| `threads` | `orderBy lastMessageAt desc` |
| `threads/{uid}/messages` | `orderBy createdAt asc` |
| `users/{uid}/saved` | `orderBy savedAt desc` |
| `users/{uid}/notifications` | `orderBy createdAt desc` |
| `articles` | `orderBy updatedAt desc` |

`firestore.indexes.json` is intentionally empty — no composite indexes are required.

---

## 9. Privacy & retention

- Messages are private to the member and administrators; no other member can
  read them (enforced by path-based rules, not by client filtering).
- Passwords are never stored in Firestore — Firebase Authentication handles
  credentials; password resets go through Firebase's email flow.
- To delete a member entirely: delete the Auth user, then `users/{uid}` (and
  its sub-collections), `threads/{uid}` (and messages), `admins/{uid}` if
  present, and `avatars/{uid}/` in Storage. A Cloud Function on
  `auth.user().onDelete` is the recommended way to automate this.
- Suspension is reversible and keeps all data.

---

## 10. Example documents

```jsonc
// users/9fX2…
{
  "uid": "9fX2…", "email": "amara@example.com", "name": "Amara",
  "role": "user", "status": "active", "bio": "SS3, Lagos",
  "avatarUrl": "https://firebasestorage.googleapis.com/…/avatars%2F9fX2…%2Favatar.webp?alt=media&token=…",
  "preferences": { "notifyMessages": true, "notifyResources": false },
  "activity": { "saved": 3, "messages": 5, "notifications": 4 },
  "createdAt": 1737000000000, "updatedAt": 1737100000000, "lastSeenAt": 1737200000000
}

// threads/9fX2…
{
  "id": "9fX2…", "userId": "9fX2…", "userName": "Amara", "userEmail": "amara@example.com",
  "userAvatar": "https://…", "status": "open",
  "lastMessage": "Thank you, that really helped.", "lastSender": "user", "lastMessageAt": 1737200500000,
  "unreadByUser": 0, "unreadByAdmin": 1, "createdAt": 1737000100000, "updatedAt": 1737200500000
}

// threads/9fX2…/messages/m_1737200500000_k3j9a
{
  "id": "m_1737200500000_k3j9a", "threadId": "9fX2…", "senderUid": "9fX2…",
  "senderRole": "user", "senderName": "Amara",
  "text": "Thank you, that really helped.", "createdAt": 1737200500000
}
```
