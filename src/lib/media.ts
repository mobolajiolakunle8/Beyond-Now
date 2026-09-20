import { uploadBytesResumable, type UploadMetadata } from "firebase/storage";
import type { StorageReference } from "firebase/storage";
import type { MediaItem } from "@/lib/content";
import { uid } from "@/lib/content";

export const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024; // 12MB before compression
export const MAX_COMPRESSED_EDGE = 1600;
export const LOGO_MAX_EDGE = 1200;
export const ICON_MAX_EDGE = 512;

/** Favicon/avatar uploads have a smaller source limit. */
export const ICON_SOURCE_BYTES = 5 * 1024 * 1024;

/** Timeouts keep every upload stage from hanging forever. */
export const READ_TIMEOUT_MS = 15_000;
export const DECODE_TIMEOUT_MS = 12_000;
export const PROCESS_TIMEOUT_MS = 30_000;
export const UPLOAD_TIMEOUT_MS = 120_000;
export const URL_TIMEOUT_MS = 20_000;
export const DB_WRITE_TIMEOUT_MS = 20_000;

export type UploadProfile = "image" | "logo" | "icon";

export type ImageProcessOptions = {
  /** Image content uses 1600px, logos 1200px, favicons 512px. */
  profile?: UploadProfile;
  /** Preserve PNG alpha where it matters (logos and icons). */
  preserveTransparency?: boolean;
};

export type UploadProgress = { loaded: number; total: number; percent: number };

export type UploadHooks = {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
};

/** Races any promise against a timer so no stage can hang indefinitely. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** e.g. "62% smaller" or "optimised". */
export function compressionLabel(originalSize?: number, compressedSize?: number): string {
  if (!originalSize || !compressedSize || compressedSize >= originalSize) return "optimised";
  const saved = Math.max(0, Math.round((1 - compressedSize / originalSize) * 100));
  return `${saved}% smaller`;
}

export function formatDate(iso: string | number | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | number | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string | number): string {
  const d = typeof iso === "number" ? iso : new Date(iso).getTime();
  if (Number.isNaN(d)) return "never";
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

function readAsDataUrl(file: File): Promise<string> {
  return withTimeout(
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.onabort = () => reject(new Error("Reading the file was cancelled."));
      reader.readAsDataURL(file);
    }),
    READ_TIMEOUT_MS,
    `Reading "${file.name}" took too long. Please try again.`,
  );
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (value: HTMLImageElement | null) => {
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => done(null), DECODE_TIMEOUT_MS);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });
}

/** Unused externally; kept internal to the upload pipeline. */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    // Sample the resized canvas in a small number of rows for a fast alpha test.
    const step = Math.max(1, Math.floor(Math.max(width, height) / 150));
    const image = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (image[(y * width + x) * 4 + 3] < 250) return true;
      }
    }
  } catch {
    // If pixel access is unavailable, retaining PNG is safer than losing alpha.
    return true;
  }
  return false;
}

/**
 * Reads a local file, downscales it to a sensible web size and returns a
 * self-contained media record. No external hosting or URL is required.
 * The whole step is time-boxed so a corrupt file can never hang the UI.
 */
export async function processImageFile(file: File, options: ImageProcessOptions = {}): Promise<MediaItem> {
  return withTimeout(
    (async () => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        throw new Error(`"${file.name}" is not a JPG, PNG or WebP image.`);
      }
      if (file.size > MAX_SOURCE_BYTES) {
        throw new Error(`"${file.name}" is larger than ${formatBytes(MAX_SOURCE_BYTES)}.`);
      }
      if (file.size === 0) {
        throw new Error(`"${file.name}" is empty. Please choose a different file.`);
      }

      const original = await readAsDataUrl(file);
      const img = await loadImage(original);

      // If the browser cannot decode it we report a clear error instead of
      // storing a broken 0×0 record that hangs later stages.
      const naturalW = img?.naturalWidth ?? 0;
      const naturalH = img?.naturalHeight ?? 0;
      if (!img || !naturalW || !naturalH) {
        throw new Error(`"${file.name}" could not be read as an image. It may be corrupt — please try another file.`);
      }
      const profile = options.profile ?? "image";
      const maxEdge = profile === "logo" ? LOGO_MAX_EDGE : profile === "icon" ? ICON_MAX_EDGE : MAX_COMPRESSED_EDGE;
      const scale = Math.min(1, maxEdge / Math.max(naturalW, naturalH));
      const width = Math.max(1, Math.round(naturalW * scale));
      const height = Math.max(1, Math.round(naturalH * scale));

      let dataUrl = original;
      let outputType = file.type;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx && img) {
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);
          const keepPng = file.type === "image/png" && (options.preserveTransparency || profile !== "image") && hasTransparency(ctx, width, height);
          outputType = keepPng ? "image/png" : "image/webp";
          // Always re-encode: this is the auto-compression guarantee for every upload.
          dataUrl = canvas.toDataURL(outputType, outputType === "image/webp" ? 0.82 : undefined);
        }
      } catch {
        /* keep the original data URL */
      }

      return {
        id: uid(),
        name: file.name,
        dataUrl,
        width,
        height,
        size: Math.round((dataUrl.length * 3) / 4),
        originalSize: file.size,
        originalWidth: naturalW,
        originalHeight: naturalH,
        type: outputType,
        uploadedAt: new Date().toISOString(),
      };
    })(),
    PROCESS_TIMEOUT_MS,
    `Processing "${file.name}" took too long. Please try a smaller image.`,
  );
}

/** Friendly, actionable copy for every Firebase Storage failure mode. */
export function mapStorageError(err: unknown, fileName?: string): string {
  const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
  const name = fileName ? `"${fileName}" — ` : "";
  switch (code) {
    case "storage/unauthorized":
      return `${name}Storage upload was denied. Sign in as the root administrator (beyondnow.ng@gmail.com) and make sure storage.rules is deployed, then try again.`;
    case "storage/canceled":
      return `${name}Upload was cancelled. Nothing was saved — try again whenever you're ready.`;
    case "storage/quota-exceeded":
      return `${name}Storage quota exceeded. Free up space in Firebase Storage and try again.`;
    case "storage/retry-limit-exceeded":
    case "storage/network-error":
    case "storage/server-file-wrong-size":
      return `${name}Network interrupted the upload. Check your connection and try again.`;
    case "storage/unknown":
      return `${name}Storage returned an unknown error. Please try again.`;
    default:
      if (err instanceof Error) {
        if (/timed out|timeout/i.test(err.message)) return `${name}${err.message}`;
        if (/cancelled/i.test(err.message)) return `${name}${err.message}`;
        return `${name}${err.message}`;
      }
      return `${name}Upload failed. Please try again.`;
  }
}

/**
 * Resumable upload with live progress, cancellation and an overall timeout.
 * Replaces fire-and-forget `uploadBytes` so slow or stalled networks surface
 * progress instead of an endless spinner.
 */
export function uploadResumable(
  sRef: StorageReference,
  blob: Blob,
  meta: UploadMetadata,
  hooks: UploadHooks = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeoutMs = hooks.timeoutMs ?? UPLOAD_TIMEOUT_MS;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        task.cancel();
      } catch {
        /* ignore */
      }
      reject(new Error("Upload timed out. Check your connection and try again."));
    }, timeoutMs);

    const onAbort = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        task.cancel();
      } catch {
        /* ignore */
      }
      reject(new Error("Upload cancelled."));
    };
    hooks.signal?.addEventListener("abort", onAbort, { once: true });

    const task = uploadBytesResumable(sRef, blob, meta);
    task.on(
      "state_changed",
      (snap) => {
        const total = snap.totalBytes || blob.size || 1;
        const percent = Math.min(99, Math.round((snap.bytesTransferred / total) * 100));
        hooks.onProgress?.({ loaded: snap.bytesTransferred, total, percent });
      },
      (err) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        hooks.signal?.removeEventListener("abort", onAbort);
        reject(err);
      },
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        hooks.signal?.removeEventListener("abort", onAbort);
        hooks.onProgress?.({ loaded: blob.size, total: blob.size, percent: 100 });
        resolve();
      },
    );
  });
}


export const MEDIA_PREFIX = "media:";

/** Turns a `media:<id>` reference into its stored data URL. Plain URLs pass through. */
export function resolveMedia(value: string, media: MediaItem[]): string {
  if (!value || !value.startsWith(MEDIA_PREFIX)) return value;
  const id = value.slice(MEDIA_PREFIX.length);
  return media.find((m) => m.id === id)?.dataUrl ?? "";
}

/**
 * Deep-clones content, swapping every `media:<id>` reference for its data URL.
 * Keeping references (not blobs) inside the content document keeps drafts small
 * enough to persist comfortably in browser storage.
 */
export function resolveContentMedia<T>(content: T, media: MediaItem[]): T {
  if (!media.length) return content;
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return resolveMedia(node, media);
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = walk(v);
      return out;
    }
    return node;
  };
  return walk(content) as T;
}
