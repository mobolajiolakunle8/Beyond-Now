import type { MediaItem } from "@/lib/content";
import { uid } from "@/lib/content";

export const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024; // 12MB before compression
const MAX_EDGE = 1600;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (value: HTMLImageElement | null) => {
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => done(null), 8000);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });
}

/**
 * Reads a local file, downscales it to a sensible web size and returns a
 * self-contained media record. No external hosting or URL is required.
 */
export async function processImageFile(file: File): Promise<MediaItem> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error(`"${file.name}" is not a JPG, PNG or WebP image.`);
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(`"${file.name}" is larger than ${formatBytes(MAX_SOURCE_BYTES)}.`);
  }

  const original = await readAsDataUrl(file);
  const img = await loadImage(original);

  // If the browser cannot decode it we still keep the file, just uncompressed.
  const naturalW = img?.naturalWidth ?? 0;
  const naturalH = img?.naturalHeight ?? 0;
  const scale = naturalW && naturalH ? Math.min(1, MAX_EDGE / Math.max(naturalW, naturalH)) : 1;
  const width = Math.max(0, Math.round(naturalW * scale));
  const height = Math.max(0, Math.round(naturalH * scale));

  let dataUrl = original;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = width && height ? canvas.getContext("2d") : null;
    if (ctx && img) {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      // PNG keeps transparency (important for logos); everything else compresses.
      const outType = file.type === "image/png" ? "image/png" : "image/webp";
      const encoded = canvas.toDataURL(outType, 0.86);
      if (encoded.startsWith("data:image") && encoded.length < original.length) {
        dataUrl = encoded;
      }
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
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };
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
