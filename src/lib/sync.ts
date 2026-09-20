import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata,
} from "firebase/storage";
import type { MediaItem, SiteContent } from "@/lib/content";
import { uid } from "@/lib/content";
import { firestoreErrorMessage, getFirebase } from "@/lib/firebase";
import { processImageFile } from "@/lib/media";

/**
 * The live website document. Every admin edit is written here directly —
 * there is no separate draft; what is stored is what visitors see.
 */
export type SiteDocument = {
  published: SiteContent;
  updatedAt: string;
  updatedBy: string;
};

const SITE_DOC = "main";
const SITE_COLLECTION = "site";
const MEDIA_COLLECTION = "media";
const STORAGE_PREFIX = "media";

export type SyncStatus = "local" | "connecting" | "synced" | "offline" | "error";

/** Strip undefined values — Firestore rejects them. */
function scrub<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function siteRef() {
  const fb = getFirebase();
  return doc(fb.db, SITE_COLLECTION, SITE_DOC);
}

function mediaCol() {
  const fb = getFirebase();
  return collection(fb.db, MEDIA_COLLECTION);
}

/* -------------------------------------------------------------------------- */
/*                               Site content                                 */
/* -------------------------------------------------------------------------- */

export async function pullSiteDocument(): Promise<SiteDocument | null> {
  const refDoc = siteRef();
  if (!refDoc) return null;
  try {
    const snap = await getDoc(refDoc);
    if (!snap.exists()) return null;
    return snap.data() as SiteDocument;
  } catch (err) {
    throw new Error(firestoreErrorMessage(err));
  }
}

/** Full-document write (not a merge) so fields removed from the schema are purged. */
export async function pushSiteDocument(published: SiteContent, updatedBy: string): Promise<string> {
  const refDoc = siteRef();
  const updatedAt = new Date().toISOString();
  try {
    const payload: SiteDocument = { published, updatedAt, updatedBy };
    await setDoc(refDoc, scrub(payload));
    return updatedAt;
  } catch (err) {
    throw new Error(firestoreErrorMessage(err));
  }
}

/**
 * Real-time listener for the site document.
 * Fires immediately with the current snapshot, then on every remote change.
 */
export function subscribeSiteDocument(
  onData: (doc: SiteDocument | null) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const refDoc = siteRef();
  return onSnapshot(
    refDoc,
    (snap) => {
      onData(snap.exists() ? (snap.data() as SiteDocument) : null);
    },
    (err) => {
      onError?.(firestoreErrorMessage(err));
    },
  );
}

/* -------------------------------------------------------------------------- */
/*                               Media library                                */
/* -------------------------------------------------------------------------- */

export type CloudMedia = Omit<MediaItem, "dataUrl"> & {
  /** Public download URL from Firebase Storage. */
  url: string;
  storagePath: string;
};

/** Convert a cloud media record into the shape the rest of the app expects. */
export function cloudToMediaItem(item: CloudMedia): MediaItem {
  return {
    id: item.id,
    name: item.name,
    dataUrl: item.url,
    width: item.width,
    height: item.height,
    size: item.size,
    type: item.type,
    uploadedAt: item.uploadedAt,
  };
}

export async function pullMediaLibrary(): Promise<MediaItem[]> {
  const col = mediaCol();
  if (!col) return [];
  try {
    const snap = await getDocs(col);
    return snap.docs
      .map((d) => cloudToMediaItem(d.data() as CloudMedia))
      .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  } catch (err) {
    throw new Error(firestoreErrorMessage(err));
  }
}

export function subscribeMediaLibrary(
  onData: (items: MediaItem[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const col = mediaCol();
  if (!col) {
    onData([]);
    return () => undefined;
  }
  return onSnapshot(
    col,
    (snap) => {
      const items = snap.docs
        .map((d) => cloudToMediaItem(d.data() as CloudMedia))
        .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
      onData(items);
    },
    (err) => onError?.(firestoreErrorMessage(err)),
  );
}

/**
 * Compresses the file client-side, uploads the blob to Storage, and writes
 * metadata to Firestore. Returns a MediaItem whose `dataUrl` is the public URL.
 */
export async function uploadMediaToCloud(file: File): Promise<MediaItem> {
  const fb = getFirebase();

  // Reuse the existing compressor — it returns a data URL we convert to a Blob.
  const processed = await processImageFile(file);
  const blob = await (await fetch(processed.dataUrl)).blob();

  const id = processed.id || uid();
  const ext =
    blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${STORAGE_PREFIX}/${id}.${ext}`;
  const storageRef = ref(fb.storage, storagePath);

  const meta: UploadMetadata = {
    contentType: blob.type || file.type || "image/jpeg",
    customMetadata: {
      originalName: file.name,
      width: String(processed.width),
      height: String(processed.height),
    },
  };

  await uploadBytes(storageRef, blob, meta);
  const url = await getDownloadURL(storageRef);

  const cloud: CloudMedia = {
    id,
    name: file.name,
    url,
    storagePath,
    width: processed.width,
    height: processed.height,
    size: blob.size,
    type: blob.type || file.type,
    uploadedAt: new Date().toISOString(),
  };

  await setDoc(doc(fb.db, MEDIA_COLLECTION, id), scrub(cloud));
  return cloudToMediaItem(cloud);
}

export async function deleteMediaFromCloud(item: MediaItem & { storagePath?: string }): Promise<void> {
  const fb = getFirebase();

  // Best-effort Storage delete. Metadata always goes.
  try {
    // Prefer an explicit path; otherwise derive the common pattern from the id.
    const path =
      item.storagePath ||
      // Try common extensions
      `${STORAGE_PREFIX}/${item.id}.webp`;
    await deleteObject(ref(fb.storage, path)).catch(async () => {
      // Fallbacks if the extension guess was wrong
      for (const ext of ["png", "jpg", "jpeg", "webp"]) {
        try {
          await deleteObject(ref(fb.storage, `${STORAGE_PREFIX}/${item.id}.${ext}`));
          break;
        } catch {
          /* try next */
        }
      }
    });
  } catch {
    /* file may already be gone */
  }

  await deleteDoc(doc(fb.db, MEDIA_COLLECTION, item.id));
}

export async function renameMediaInCloud(id: string, name: string): Promise<void> {
  const fb = getFirebase();
  await setDoc(doc(fb.db, MEDIA_COLLECTION, id), { name }, { merge: true });
}

/**
 * Replaces the binary for an existing media id (keeps the same id so content
 * references of the form `media:<id>` keep working).
 */
export async function replaceMediaInCloud(id: string, file: File): Promise<MediaItem> {
  const fb = getFirebase();

  // Remove any existing object for this id, then upload under the same id.
  try {
    for (const ext of ["webp", "png", "jpg", "jpeg"]) {
      try {
        await deleteObject(ref(fb.storage, `${STORAGE_PREFIX}/${id}.${ext}`));
      } catch {
        /* ok */
      }
    }
  } catch {
    /* ok */
  }

  const processed = await processImageFile(file);
  // Force the preserved id
  processed.id = id;
  const blob = await (await fetch(processed.dataUrl)).blob();
  const ext =
    blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${STORAGE_PREFIX}/${id}.${ext}`;
  await uploadBytes(ref(fb.storage, storagePath), blob, {
    contentType: blob.type || file.type,
    customMetadata: { originalName: file.name },
  });
  const url = await getDownloadURL(ref(fb.storage, storagePath));

  const cloud: CloudMedia = {
    id,
    name: file.name,
    url,
    storagePath,
    width: processed.width,
    height: processed.height,
    size: blob.size,
    type: blob.type || file.type,
    uploadedAt: new Date().toISOString(),
  };
  await setDoc(doc(fb.db, MEDIA_COLLECTION, id), scrub(cloud));
  return cloudToMediaItem(cloud);
}
