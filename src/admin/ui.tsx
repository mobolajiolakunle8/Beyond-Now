import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ACCEPT_ATTR, MEDIA_PREFIX, formatBytes, formatDate, resolveMedia } from "@/lib/media";
import { useStore } from "@/lib/store";
import type { Status } from "@/lib/content";
import { cn } from "@/utils/cn";

/* ------------------------------- layout ------------------------------- */

/** Resolves `media:<id>` references for display inside the dashboard. */
export function useImg() {
  const { media } = useStore();
  return (value: string) => resolveMedia(value, media);
}

export function Card({
  children,
  className,
  title,
  description,
  action,
}: {
  children?: ReactNode;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-mist bg-white p-5 shadow-[0_1px_2px_rgba(11,45,91,0.05)] sm:p-6", className)}
    >
      {(title || action) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="font-display text-[1.05rem] font-bold text-navy">{title}</h3>}
            {description && <p className="mt-1 text-[0.85rem] text-charcoal/60">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[1.6rem] font-extrabold text-navy sm:text-[1.9rem]">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-[0.9rem] text-charcoal/65">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/* ------------------------------- buttons ------------------------------- */

type BtnVariant = "primary" | "accent" | "ghost" | "outline" | "danger" | "teal";

const variants: Record<BtnVariant, string> = {
  primary: "bg-navy text-white hover:bg-navy-soft",
  accent: "bg-sun text-navy-deep hover:bg-[#ffd35c]",
  teal: "bg-teal text-white hover:bg-[#00c9a2]",
  outline: "border border-mist bg-white text-navy hover:border-navy/35 hover:bg-bone",
  ghost: "text-charcoal/70 hover:bg-mist/60 hover:text-navy",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function AdminBtn({
  children,
  onClick,
  variant = "outline",
  size = "md",
  className,
  type = "button",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: "sm" | "md";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-display font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-[0.78rem]" : "px-4 py-2.5 text-[0.85rem]",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------- fields ------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="font-display text-[0.75rem] font-bold tracking-[0.06em] text-charcoal/70 uppercase">
          {label}
        </span>
        {hint && <span className="text-[0.7rem] text-charcoal/45">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[0.75rem] font-medium text-red-600">{error}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-[0.9rem] text-charcoal transition-colors placeholder:text-charcoal/35 focus:outline-none";

export function TextInput({
  value,
  onChange,
  placeholder,
  invalid,
  type = "text",
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  type?: string;
  onBlur?: () => void;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={cn(inputBase, invalid ? "border-red-400 focus:border-red-500" : "border-mist focus:border-navy")}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        inputBase,
        "resize-y leading-relaxed",
        invalid ? "border-red-400 focus:border-red-500" : "border-mist focus:border-navy",
      )}
    />
  );
}

/** Editable list of short strings (bullets, prompts, chips). */
export function ListEditor({
  values,
  onChange,
  addLabel = "Add item",
  placeholder,
  multiline = false,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  addLabel?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      {values.length === 0 && (
        <p className="rounded-lg border border-dashed border-mist px-3 py-3 text-[0.8rem] text-charcoal/45">
          Nothing here yet.
        </p>
      )}
      {values.map((value, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 w-5 shrink-0 text-right font-display text-[0.7rem] font-bold text-charcoal/35">
            {i + 1}
          </span>
          {multiline ? (
            <TextArea
              rows={3}
              value={value}
              placeholder={placeholder}
              onChange={(v) => onChange(values.map((x, idx) => (idx === i ? v : x)))}
            />
          ) : (
            <TextInput
              value={value}
              placeholder={placeholder}
              onChange={(v) => onChange(values.map((x, idx) => (idx === i ? v : x)))}
            />
          )}
          <div className="flex shrink-0 gap-1">
            <AdminBtn
              size="sm"
              variant="ghost"
              title="Move up"
              disabled={i === 0}
              onClick={() => {
                const next = [...values];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                onChange(next);
              }}
            >
              ↑
            </AdminBtn>
            <AdminBtn
              size="sm"
              variant="ghost"
              title="Remove"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            >
              ✕
            </AdminBtn>
          </div>
        </div>
      ))}
      <AdminBtn size="sm" variant="outline" onClick={() => onChange([...values, ""])}>
        + {addLabel}
      </AdminBtn>
    </div>
  );
}

/* ------------------------------- status ------------------------------- */

export function StatusBadge({ status }: { status: Status }) {
  const published = status === "published";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[0.68rem] font-bold tracking-[0.08em] uppercase",
        published ? "bg-teal/12 text-teal-ink" : "bg-sun/20 text-[#8a6500]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", published ? "bg-teal" : "bg-sun-deep")} />
      {published ? "Published" : "Draft"}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5"
    >
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-teal" : "bg-mist",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </span>
      <span className="font-display text-[0.8rem] font-semibold text-charcoal/75">{label}</span>
    </button>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon = "◇",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-mist bg-bone/60 px-6 py-14 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-navy/40 shadow-sm">
        {icon}
      </span>
      <h4 className="mt-4 font-display text-[1.05rem] font-bold text-navy">{title}</h4>
      <p className="mx-auto mt-1.5 max-w-sm text-[0.85rem] text-charcoal/60">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-charcoal/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 3.5 3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-mist bg-white py-2.5 pr-3 pl-9 text-[0.85rem] transition-colors focus:border-navy focus:outline-none"
      />
    </div>
  );
}

/* ------------------------------- modal ------------------------------- */

let lockCount = 0;

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
  stacked = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Renders above an already-open modal (e.g. the media browser). */
  stacked?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    lockCount += 1;
    document.body.classList.add("no-scroll");
    window.addEventListener("keydown", onKey);
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className={cn(
        "fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-6",
        stacked ? "z-[95]" : "z-[80]",
      )}
    >
      <div className="absolute inset-0 bg-navy-deep/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          wide ? "sm:max-w-4xl" : "sm:max-w-lg",
        )}
      >
        <header className="flex items-center justify-between gap-4 border-b border-mist px-5 py-4">
          <h3 className="font-display text-[1.05rem] font-bold text-navy">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-charcoal/50 transition-colors hover:bg-mist hover:text-navy"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-mist bg-bone px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  tone = "danger",
  wide = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary" | "teal";
  wide?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      wide={wide}
      footer={
        <>
          <AdminBtn variant="outline" onClick={onCancel}>
            Cancel
          </AdminBtn>
          <AdminBtn variant={tone} onClick={onConfirm}>
            {confirmLabel}
          </AdminBtn>
        </>
      }
    >
      <div className="text-[0.9rem] leading-relaxed text-charcoal/75">{body}</div>
    </Modal>
  );
}

/* --------------------------- media selection --------------------------- */

/**
 * Image field: upload straight from the device, or pick something already in
 * the media library. No external URL is ever required.
 */
export function ImagePicker({
  label,
  value,
  onChange,
  hint,
  aspect = "aspect-[16/10]",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  aspect?: string;
}) {
  const { media, uploadMedia } = useStore();
  const img = useImg();
  const [browsing, setBrowsing] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const preview = img(value);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const added = await uploadMedia(files);
    setBusy(false);
    if (added[0]) onChange(`${MEDIA_PREFIX}${added[0].id}`);
  };

  return (
    <div>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="font-display text-[0.75rem] font-bold tracking-[0.06em] text-charcoal/70 uppercase">
          {label}
        </span>
        {hint && <span className="text-[0.7rem] text-charcoal/45">{hint}</span>}
      </span>

      <div className="overflow-hidden rounded-xl border border-mist bg-bone">
        {preview ? (
          <img src={preview} alt="" className={cn("w-full bg-white object-cover", aspect)} />
        ) : (
          <div className={cn("flex items-center justify-center bg-mist/40 text-[0.8rem] text-charcoal/45", aspect)}>
            No image selected
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t border-mist bg-white p-3">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={ACCEPT_ATTR}
            multiple={false}
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <AdminBtn size="sm" variant="primary" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? "Uploading…" : "Upload from device"}
          </AdminBtn>
          <AdminBtn size="sm" variant="outline" onClick={() => setBrowsing(true)}>
            Media library ({media.length})
          </AdminBtn>
          {value && (
            <AdminBtn size="sm" variant="ghost" onClick={() => onChange("")}>
              Clear
            </AdminBtn>
          )}
        </div>
      </div>

      <MediaBrowser
        open={browsing}
        onClose={() => setBrowsing(false)}
        onSelect={(url) => {
          onChange(url);
          setBrowsing(false);
        }}
      />
    </div>
  );
}

export function MediaBrowser({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const { media, uploadMedia } = useStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = media.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Modal open={open} onClose={onClose} title="Choose an image" wide stacked>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search media library…" />
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={(e) => {
            void uploadMedia(e.target.files ?? []);
            e.target.value = "";
          }}
        />
        <AdminBtn variant="primary" size="sm" onClick={() => inputRef.current?.click()}>
          Upload new
        </AdminBtn>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon="🖼"
          title={media.length ? "No matches" : "Your media library is empty"}
          body={
            media.length
              ? "Try a different file name."
              : "Upload JPG, PNG or WebP images from your device to use them across the website."
          }
          action={
            <AdminBtn variant="primary" size="sm" onClick={() => inputRef.current?.click()}>
              Upload images
            </AdminBtn>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(`${MEDIA_PREFIX}${item.id}`)}
                className="group w-full overflow-hidden rounded-xl border border-mist bg-white text-left transition-all hover:-translate-y-0.5 hover:border-navy hover:shadow-md"
              >
                <img src={item.dataUrl} alt={item.name} className="aspect-[4/3] w-full object-cover" />
                <span className="block px-2.5 py-2">
                  <span className="block truncate font-display text-[0.75rem] font-semibold text-navy">
                    {item.name}
                  </span>
                  <span className="block text-[0.68rem] text-charcoal/50">
                    {item.width}×{item.height} · {formatBytes(item.size)} · {formatDate(item.uploadedAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/* ------------------------------- toasts ------------------------------- */

export function ToastStack() {
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
            toast.tone === "success" && "border-teal/30 bg-teal/95 text-white",
            toast.tone === "error" && "border-red-300 bg-red-600/95 text-white",
            toast.tone === "info" && "border-navy/20 bg-navy/95 text-white",
          )}
        >
          <span aria-hidden="true" className="mt-0.5 font-bold">
            {toast.tone === "success" ? "✓" : toast.tone === "error" ? "!" : "i"}
          </span>
          <p className="flex-1 text-[0.85rem] leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
