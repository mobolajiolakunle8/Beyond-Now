import { get, onValue, ref, remove, set, update, type Unsubscribe } from "firebase/database";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes, type UploadMetadata } from "firebase/storage";
import type { MediaItem, SiteContent } from "@/lib/content";
import { uid } from "@/lib/content";
import { databaseErrorMessage, getFirebase } from "@/lib/firebase";
import { processImageFile } from "@/lib/media";

export type SiteDocument = {
  published: SiteContent;
  updatedAt: string;
  updatedBy: string;
  rev: number;
};

const STORAGE_PREFIX = "media";
const noop: Unsubscribe = () => undefined;

export type SyncStatus = "local" | "connecting" | "synced" | "offline" | "error";

function getRtdb() {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");
  return fb.rtdb;
}

/* -------------------------------------------------------------------------- */
/*                               Site content                                 */
/* -------------------------------------------------------------------------- */

export async function pullSiteDocument(): Promise<SiteDocument | null> {
  const fb = getFirebase();
  if (!fb) return null;
  try {
    const snap = await get(ref(fb.rtdb, "site/main"));
    if (!snap.exists()) return null;
    return snap.val() as SiteDocument;
  } catch (err) {
    throw new Error(databaseErrorMessage(err));
  }
}

export async function pushSiteDocument(published: SiteContent, updatedBy: string, rev?: number): Promise<string> {
  const db = getRtdb();
  const updatedAt = new Date().toISOString();
  try {
    const payload: SiteDocument = { published, updatedAt, updatedBy, rev: rev ?? 1 };
    await set(ref(db, "site/main"), payload);
    return updatedAt;
  } catch (err) {
    throw new Error(databaseErrorMessage(err));
  }
}

export function subscribeSiteDocument(
  onData: (doc: SiteDocument | null) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) {
    onData(null);
    return noop;
  }
  try {
    return onValue(
      ref(fb.rtdb, "site/main"),
      (snap) => {
        onData(snap.exists() ? (snap.val() as SiteDocument) : null);
      },
      (err) => {
        onError?.(databaseErrorMessage(err));
      },
    );
  } catch (err) {
    onError?.(databaseErrorMessage(err));
    return noop;
  }
}

/* -------------------------------------------------------------------------- */
/*                               Media library                                */
/* -------------------------------------------------------------------------- */

export type CloudMedia = Omit<MediaItem, "dataUrl"> & {
  url: string;
  storagePath: string;
};

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
  const fb = getFirebase();
  if (!fb) return [];
  try {
    const snap = await get(ref(fb.rtdb, "media"));
    if (!snap.exists()) return [];
    const all = snap.val() as Record<string, CloudMedia>;
    return Object.values(all)
      .map(cloudToMediaItem)
      .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  } catch (err) {
    throw new Error(databaseErrorMessage(err));
  }
}

export function subscribeMediaLibrary(
  onData: (items: MediaItem[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const fb = getFirebase();
  if (!fb) {
    onData([]);
    return noop;
  }
  try {
    return onValue(
      ref(fb.rtdb, "media"),
      (snap) => {
        if (!snap.exists()) {
          onData([]);
          return;
        }
        const all = snap.val() as Record<string, CloudMedia>;
        const items = Object.values(all)
          .map(cloudToMediaItem)
          .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
        onData(items);
      },
      (err) => onError?.(databaseErrorMessage(err)),
    );
  } catch (err) {
    onError?.(databaseErrorMessage(err));
    return noop;
  }
}

export async function uploadMediaToCloud(file: File): Promise<MediaItem> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");

  const processed = await processImageFile(file);
  const blob = await (await fetch(processed.dataUrl)).blob();

  const id = processed.id || uid();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${STORAGE_PREFIX}/${id}.${ext}`;
  const sRef = storageRef(fb.storage, path);

  const meta: UploadMetadata = {
    contentType: blob.type || file.type || "image/jpeg",
    customMetadata: {
      originalName: file.name,
      width: String(processed.width),
      height: String(processed.height),
    },
  };

  await uploadBytes(sRef, blob, meta);
  const url = await getDownloadURL(sRef);

  const cloud: CloudMedia = {
    id,
    name: file.name,
    url,
    storagePath: path,
    width: processed.width,
    height: processed.height,
    size: blob.size,
    type: blob.type || file.type,
    uploadedAt: new Date().toISOString(),
  };

  await set(ref(fb.rtdb, `media/${id}`), cloud);
  return cloudToMediaItem(cloud);
}

export async function deleteMediaFromCloud(item: MediaItem & { storagePath?: string }): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");

  try {
    const path = item.storagePath || `${STORAGE_PREFIX}/${item.id}.webp`;
    await deleteObject(storageRef(fb.storage, path)).catch(async () => {
      for (const ext of ["png", "jpg", "jpeg", "webp"]) {
        try {
          await deleteObject(storageRef(fb.storage, `${STORAGE_PREFIX}/${item.id}.${ext}`));
          break;
        } catch {
          // ignore
        }
      }
    });
  } catch {
    // proceed
  }

  await remove(ref(fb.rtdb, `media/${item.id}`));
}

export async function renameMediaInCloud(id: string, name: string): Promise<void> {
  const db = getRtdb();
  await update(ref(db, `media/${id}`), { name });
}

export async function replaceMediaInCloud(id: string, file: File): Promise<MediaItem> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");

  try {
    for (const ext of ["webp", "png", "jpg", "jpeg"]) {
      try {
        await deleteObject(storageRef(fb.storage, `${STORAGE_PREFIX}/${id}.${ext}`));
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  const processed = await processImageFile(file);
  processed.id = id;
  const blob = await (await fetch(processed.dataUrl)).blob();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${STORAGE_PREFIX}/${id}.${ext}`;

  await uploadBytes(storageRef(fb.storage, path), blob, {
    contentType: blob.type || file.type,
    customMetadata: { originalName: file.name },
  });
  const url = await getDownloadURL(storageRef(fb.storage, path));

  const cloud: CloudMedia = {
    id,
    name: file.name,
    url,
    storagePath: path,
    width: processed.width,
    height: processed.height,
    size: blob.size,
    type: blob.type || file.type,
    uploadedAt: new Date().toISOString(),
  };

  await set(ref(fb.rtdb, `media/${id}`), cloud);
  return cloudToMediaItem(cloud);
}
