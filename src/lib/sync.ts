import { get, onValue, ref, remove, set, update, type Unsubscribe } from "firebase/database";
import { deleteObject, getDownloadURL, ref as storageRef, type UploadMetadata } from "firebase/storage";
import type { MediaItem, SiteContent } from "@/lib/content";
import { uid } from "@/lib/content";
import { databaseErrorMessage, getFirebase } from "@/lib/firebase";
import { processImageFile, uploadResumable, withTimeout, DB_WRITE_TIMEOUT_MS, type ImageProcessOptions, type UploadHooks } from "@/lib/media";

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
    originalSize: item.originalSize,
    originalWidth: item.originalWidth,
    originalHeight: item.originalHeight,
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

export async function uploadMediaToCloud(file: File, options?: ImageProcessOptions, hooks: UploadHooks = {}): Promise<MediaItem> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase is not configured.");

  hooks.onProgress?.({ loaded: 10, total: 100, percent: 10 });
  const processed = await processImageFile(file, options);
  hooks.onProgress?.({ loaded: 50, total: 100, percent: 50 });

  const id = processed.id || uid();
  let url = processed.dataUrl;
  let storagePath = "";

  // Attempt Cloud Storage with a fast 2.5s timeout. If unavailable (e.g. 404 bucket),
  // seamlessly fall back to storing the compressed WebP dataUrl in RTDB.
  try {
    const ext = processed.type === "image/png" ? "png" : "webp";
    const path = `${STORAGE_PREFIX}/${id}.${ext}`;
    const sRef = storageRef(fb.storage, path);
    const blob = await (await fetch(processed.dataUrl)).blob();
    const meta: UploadMetadata = {
      contentType: blob.type || "image/webp",
      customMetadata: {
        originalName: file.name,
        width: String(processed.width),
        height: String(processed.height),
      },
    };
    await withTimeout(uploadResumable(sRef, blob, meta, { ...hooks, timeoutMs: 2500 }), 2500, "Storage timeout");
    url = await withTimeout(getDownloadURL(sRef), 2000, "URL timeout");
    storagePath = path;
  } catch {
    // Storage is not provisioned or failed: use the already-compressed WebP dataUrl!
    url = processed.dataUrl;
    storagePath = "";
  }

  hooks.onProgress?.({ loaded: 80, total: 100, percent: 80 });

  const cloud: CloudMedia = {
    id,
    name: file.name,
    url,
    storagePath,
    width: processed.width,
    height: processed.height,
    size: processed.size,
    originalSize: processed.originalSize,
    originalWidth: processed.originalWidth,
    originalHeight: processed.originalHeight,
    type: processed.type,
    uploadedAt: new Date().toISOString(),
  };

  await withTimeout(
    set(ref(fb.rtdb, `media/${id}`), cloud),
    DB_WRITE_TIMEOUT_MS,
    `Saving "${file.name}" to the media library took too long. Please try again.`,
  );

  hooks.onProgress?.({ loaded: 100, total: 100, percent: 100 });
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

export async function replaceMediaInCloud(id: string, file: File, options?: ImageProcessOptions, hooks: UploadHooks = {}): Promise<MediaItem> {
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

  hooks.onProgress?.({ loaded: 10, total: 100, percent: 10 });
  const processed = await processImageFile(file, options);
  processed.id = id;
  hooks.onProgress?.({ loaded: 50, total: 100, percent: 50 });

  let url = processed.dataUrl;
  let storagePath = "";

  try {
    const ext = processed.type === "image/png" ? "png" : "webp";
    const path = `${STORAGE_PREFIX}/${id}.${ext}`;
    const sRef = storageRef(fb.storage, path);
    const blob = await (await fetch(processed.dataUrl)).blob();
    await withTimeout(
      uploadResumable(sRef, blob, {
        contentType: blob.type || "image/webp",
        customMetadata: { originalName: file.name },
      }, { ...hooks, timeoutMs: 2500 }),
      2500,
      "Storage timeout",
    );
    url = await withTimeout(getDownloadURL(sRef), 2000, "URL timeout");
    storagePath = path;
  } catch {
    url = processed.dataUrl;
    storagePath = "";
  }

  hooks.onProgress?.({ loaded: 80, total: 100, percent: 80 });

  const cloud: CloudMedia = {
    id,
    name: file.name,
    url,
    storagePath,
    width: processed.width,
    height: processed.height,
    size: processed.size,
    originalSize: processed.originalSize,
    originalWidth: processed.originalWidth,
    originalHeight: processed.originalHeight,
    type: processed.type,
    uploadedAt: new Date().toISOString(),
  };

  await withTimeout(
    set(ref(fb.rtdb, `media/${id}`), cloud),
    DB_WRITE_TIMEOUT_MS,
    `Saving the replacement for "${file.name}" took too long. Please try again.`,
  );

  hooks.onProgress?.({ loaded: 100, total: 100, percent: 100 });
  return cloudToMediaItem(cloud);
}
