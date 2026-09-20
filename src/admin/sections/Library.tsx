import { useRef, useState, type ReactNode } from "react";
import {
  AdminBtn,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  ImagePicker,
  PageHeader,
  SearchInput,
  StatusBadge,
  TextArea,
  TextInput,
  Toggle,
  useImg,
} from "@/admin/ui";
import { LogoMark } from "@/components/Logo";
import { setPath, uid, type SiteContent } from "@/lib/content";
import { ACCEPT_ATTR, compressionLabel, formatBytes, formatDate } from "@/lib/media";
import { useStore } from "@/lib/store";
import { cn } from "@/utils/cn";

/* =========================== MEDIA LIBRARY =========================== */

export function MediaLibraryPage({ toolbar }: { toolbar?: ReactNode }) {
  const { media, uploadMedia, deleteMedia, replaceMedia, renameMedia, notify } = useStore();
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);

  const q = query.trim().toLowerCase();
  const results = media.filter((m) => m.name.toLowerCase().includes(q));
  const totalBytes = media.reduce((sum, m) => sum + m.size, 0);

  const startUpload = async (files: FileList | File[] | null, replacementFor?: string) => {
    const list = files ? Array.from(files) : [];
    if (!list.length || uploading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setUploading(true);
    setUploadError(null);
    setProgress(10);
    setUploadLabel(list.length === 1 ? list[0].name : `${list.length} images`);
    if (replacementFor) setReplacingId(replacementFor);
    try {
      if (replacementFor && list[0]) {
        await replaceMedia(replacementFor, list[0], undefined, {
          signal: controller.signal,
          onProgress: (p) => setProgress(p.percent),
        });
      } else {
        await uploadMedia(list, undefined, {
          signal: controller.signal,
          onProgress: (p) => setProgress(p.percent),
        });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message = err instanceof Error ? err.message : "Upload failed. Please try again.";
        setUploadError(message);
        notify("error", message);
      }
    } finally {
      abortRef.current = null;
      setUploading(false);
      setProgress(null);
      setUploadLabel(null);
      setReplacingId(null);
      replaceTarget.current = null;
    }
  };

  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Upload images straight from this device. JPG, PNG and WebP are resized and auto-compressed before storage."
      >
        {toolbar}
        <AdminBtn variant="primary" onClick={() => uploadRef.current?.click()} disabled={uploading}>
          {uploading ? `Uploading… ${progress ?? 0}%` : "Upload images"}
        </AdminBtn>
      </PageHeader>

      <input
        ref={uploadRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => {
          void startUpload(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const target = replaceTarget.current;
          const file = e.target.files?.[0];
          e.target.value = "";
          replaceTarget.current = null;
          if (file && target) void startUpload([file], target);
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void startUpload(e.dataTransfer.files);
        }}
        className={cn(
          "mb-5 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragging ? "border-teal bg-teal/5" : "border-mist bg-white",
        )}
      >
        <p className="font-display text-[0.95rem] font-bold text-navy">
          Drag and drop images here, or browse your device
        </p>
        <p className="mt-1 text-[0.82rem] text-charcoal/55">
          Recommended 1600 × 1200 px or larger · 12 MB source max · auto-compressed to WebP (max 1600 px edge).
        </p>
        {uploading && progress !== null ? (
          <div className="mx-auto mt-4 max-w-md">
            <div className="h-2 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={uploadLabel ? `Uploading ${uploadLabel}` : "Uploading images"}>
              <div className="h-full rounded-full bg-teal transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-[0.8rem] text-charcoal/60">
              Uploading{uploadLabel ? ` ${uploadLabel}` : ""}… {progress}%
            </p>
            <div className="mt-2 flex justify-center">
              <AdminBtn variant="ghost" size="sm" className="text-red-600" onClick={() => abortRef.current?.abort()}>
                Cancel upload
              </AdminBtn>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-center">
            <AdminBtn variant="outline" size="sm" onClick={() => uploadRef.current?.click()}>
              Choose files
            </AdminBtn>
          </div>
        )}
        {uploadError && !uploading && (
          <div className="mx-auto mt-4 flex max-w-md items-start justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left">
            <p role="alert" className="text-[0.8rem] leading-snug text-red-700">{uploadError}</p>
            <button type="button" onClick={() => uploadRef.current?.click()} className="shrink-0 font-display text-[0.75rem] font-semibold text-navy hover:underline">
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by file name…" />
        <p className="text-[0.8rem] text-charcoal/55">
          {media.length} image{media.length === 1 ? "" : "s"} · {formatBytes(totalBytes)} stored
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon="🖼"
          title={media.length ? "No images match" : "Your media library is empty"}
          body={
            media.length
              ? "Try a different file name."
              : "Upload photography and illustrations here, then assign them to any section of the website."
          }
          action={
            <AdminBtn variant="primary" size="sm" onClick={() => uploadRef.current?.click()}>
              Upload images
            </AdminBtn>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((item) => (
            <li
              key={item.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-mist bg-white shadow-[0_1px_2px_rgba(11,45,91,0.05)]"
            >
              <img src={item.dataUrl} alt={item.name} className="aspect-[4/3] w-full bg-bone object-cover" />
              <div className="flex flex-1 flex-col p-3.5">
                <p className="truncate font-display text-[0.85rem] font-bold text-navy" title={item.name}>
                  {item.name}
                </p>
                <dl className="mt-2 space-y-1 text-[0.72rem] text-charcoal/55">
                  <div className="flex justify-between gap-2">
                    <dt>Dimensions</dt>
                    <dd className="font-medium text-charcoal/75">
                      {item.width} × {item.height}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Size</dt>
                    <dd className="font-medium text-charcoal/75">
                      {formatBytes(item.size)}
                      {item.originalSize ? ` · ${compressionLabel(item.originalSize, item.size)}` : ""}
                    </dd>
                  </div>
                  {item.originalWidth && item.originalHeight && (item.originalWidth !== item.width || item.originalHeight !== item.height) && (
                    <div className="flex justify-between gap-2">
                      <dt>Original</dt>
                      <dd className="font-medium text-charcoal/75">{item.originalWidth} × {item.originalHeight}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <dt>Uploaded</dt>
                    <dd className="font-medium text-charcoal/75">{formatDate(item.uploadedAt)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-mist pt-3">
                  <AdminBtn size="sm" variant="outline" onClick={() => setRenaming({ id: item.id, name: item.name })}>
                    Rename
                  </AdminBtn>
                  <AdminBtn
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => {
                      replaceTarget.current = item.id;
                      replaceRef.current?.click();
                    }}
                  >
                    {replacingId === item.id && uploading ? `Replacing… ${progress ?? 0}%` : "Replace"}
                  </AdminBtn>
                  <AdminBtn size="sm" variant="ghost" className="ml-auto text-red-600" onClick={() => setConfirmId(item.id)}>
                    Delete
                  </AdminBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete this image?"
        body="Any website section still using it will show an empty image placeholder until you choose a replacement."
        confirmLabel="Delete image"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) void deleteMedia(confirmId);
          setConfirmId(null);
        }}
      />

      <ConfirmDialog
        open={renaming !== null}
        title="Rename image"
        tone="primary"
        confirmLabel="Save name"
        onCancel={() => setRenaming(null)}
        onConfirm={() => {
          if (renaming) void renameMedia(renaming.id, renaming.name);
          setRenaming(null);
        }}
        body={
          <Field label="File name">
            <TextInput value={renaming?.name ?? ""} onChange={(v) => setRenaming((r) => (r ? { ...r, name: v } : r))} />
          </Field>
        }
      />
    </div>
  );
}

/* ============================ SITE SETTINGS ============================ */

export function SettingsPage({ toolbar }: { toolbar?: ReactNode }) {
  const { content, updateContent, notify } = useStore();
  const img = useImg();
  const { settings, brand } = content;
  const [confirmLogo, setConfirmLogo] = useState(false);
  const [logoUnlocked, setLogoUnlocked] = useState(false);

  const set = (path: string, value: unknown) => updateContent((c) => setPath(c, path, value) as SiteContent);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email.trim());
  const waDigits = settings.whatsapp.replace(/\D/g, "");
  const waValid = waDigits.length >= 10 && waDigits.length <= 15;

  return (
    <div>
      <PageHeader
        title="Site Settings"
        description="Contact details, social links, search-engine metadata and the official logo."
      >
        {toolbar}
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Contact details" description="Used by every WhatsApp button and the footer.">
          <div className="grid gap-4">
            <Field
              label="Contact email"
              error={!emailValid ? "Enter a valid email address" : undefined}
              hint="Official inbox"
            >
              <TextInput
                type="email"
                value={settings.email}
                invalid={!emailValid}
                onChange={(v) => set("settings.email", v)}
              />
            </Field>
            <Field
              label="WhatsApp number"
              hint="Country code, digits only"
              error={!waValid ? "Enter 10–15 digits, including country code" : undefined}
            >
              <TextInput
                value={settings.whatsapp}
                invalid={!waValid}
                onChange={(v) => set("settings.whatsapp", v.replace(/[^\d]/g, ""))}
              />
            </Field>
            <Field label="WhatsApp display format" hint="Shown to visitors">
              <TextInput value={settings.whatsappDisplay} onChange={(v) => set("settings.whatsappDisplay", v)} />
            </Field>
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-teal/10 px-3.5 py-2.5 font-display text-[0.8rem] font-semibold text-teal-ink transition-colors hover:bg-teal/20"
            >
              Test this WhatsApp link ↗
            </a>
          </div>
        </Card>

        <Card title="Search & sharing" description="How the site appears in Google results and link previews.">
          <div className="grid gap-4">
            <Field label="SEO title" hint={`${settings.seoTitle.length}/60`} error={settings.seoTitle.length > 60 ? "Titles over 60 characters get truncated" : undefined}>
              <TextInput value={settings.seoTitle} onChange={(v) => set("settings.seoTitle", v)} />
            </Field>
            <Field
              label="Meta description"
              hint={`${settings.seoDescription.length}/160`}
              error={settings.seoDescription.length > 160 ? "Descriptions over 160 characters get truncated" : undefined}
            >
              <TextArea rows={4} value={settings.seoDescription} onChange={(v) => set("settings.seoDescription", v)} />
            </Field>
            <ImagePicker
              label="Favicon"
               hint="512 × 512 px square · PNG or WebP"
              aspect="aspect-square"
               dimensions="512 × 512 px square"
               uploadOptions={{ profile: "icon", preserveTransparency: true }}
              value={settings.favicon}
              onChange={(v) => set("settings.favicon", v)}
            />
          </div>
        </Card>

        <Card
          title="Official logo"
          description="The BEYOND NOW logo is locked to prevent accidental changes. Unlock it only to upload the official artwork."
          className="lg:col-span-2"
        >
          <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
            <div className="flex h-32 w-52 items-center justify-center rounded-xl border border-mist bg-bone p-4">
              {img(brand.logoUrl) ? (
                <img src={img(brand.logoUrl)} alt="Official Beyond Now logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <LogoMark className="h-16 w-16" />
              )}
            </div>

            <div>
              <div
                className={cn(
                  "rounded-xl border px-4 py-3",
                  logoUnlocked ? "border-sun bg-sun/10" : "border-mist bg-bone",
                )}
              >
                <p className="font-display text-[0.85rem] font-bold text-navy">
                  {logoUnlocked ? "⚠ Logo editing unlocked" : "🔒 Logo is protected"}
                </p>
                <p className="mt-1 text-[0.8rem] leading-relaxed text-charcoal/65">
                  {logoUnlocked
                    ? "Upload the official artwork only. It is displayed with its aspect ratio preserved and is never stretched, cropped or recoloured."
                    : "Unlock to upload the official BEYOND NOW logo file. Leave it locked to keep the built-in vector mark."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminBtn
                    size="sm"
                    variant={logoUnlocked ? "ghost" : "outline"}
                    onClick={() => setLogoUnlocked((v) => !v)}
                  >
                    {logoUnlocked ? "Lock logo" : "Unlock to change logo"}
                  </AdminBtn>
                  {brand.logoUrl && logoUnlocked && (
                    <AdminBtn size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirmLogo(true)}>
                      Remove uploaded logo
                    </AdminBtn>
                  )}
                </div>
              </div>

              {logoUnlocked && (
                <div className="mt-4">
                  <ImagePicker
                    label="Upload official logo from this device"
                    hint="1200 × 400 px · transparent PNG or WebP"
                    aspect="aspect-[3/1]"
                    dimensions="1200 × 400 px · 3:1 horizontal lockup"
                    uploadOptions={{ profile: "logo", preserveTransparency: true }}
                    value={brand.logoUrl}
                    onChange={(v) => {
                      set("brand.logoUrl", v);
                      if (v) notify("success", "Official logo updated and live.");
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card
          title="Social links"
          description="Empty links are automatically hidden from the footer."
          className="lg:col-span-2"
          action={
            <AdminBtn
              size="sm"
              variant="outline"
              onClick={() => set("settings.socials", [...settings.socials, { id: uid(), label: "New network", url: "" }])}
            >
              + Add link
            </AdminBtn>
          }
        >
          {settings.socials.length === 0 ? (
            <EmptyState title="No social links" body="Add the channels where young people can find Beyond Now." />
          ) : (
            <ul className="space-y-2">
              {settings.socials.map((social, i) => (
                <li key={social.id} className="grid gap-3 rounded-xl border border-mist bg-bone/40 p-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                  <Field label="Label">
                    <TextInput
                      value={social.label}
                      onChange={(v) =>
                        set("settings.socials", settings.socials.map((s, idx) => (idx === i ? { ...s, label: v } : s)))
                      }
                    />
                  </Field>
                  <Field label="URL" error={social.url && !/^https?:\/\//.test(social.url) ? "Must start with http:// or https://" : undefined}>
                    <TextInput
                      value={social.url}
                      placeholder="https://"
                      invalid={Boolean(social.url) && !/^https?:\/\//.test(social.url)}
                      onChange={(v) =>
                        set("settings.socials", settings.socials.map((s, idx) => (idx === i ? { ...s, url: v } : s)))
                      }
                    />
                  </Field>
                  <AdminBtn
                    size="sm"
                    variant="ghost"
                    className="mb-1 text-red-600"
                    onClick={() => set("settings.socials", settings.socials.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </AdminBtn>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmLogo}
        title="Remove the uploaded logo?"
        body="The website will fall back to the built-in BEYOND NOW vector mark and wordmark."
        confirmLabel="Remove logo"
        onCancel={() => setConfirmLogo(false)}
        onConfirm={() => {
          set("brand.logoUrl", "");
          setConfirmLogo(false);
          notify("info", "Reverted to the built-in logo mark.");
        }}
      />
    </div>
  );
}

/* ======================== MEMBER RESOURCE LIBRARY ======================== */

/**
 * Administrators can build and preview the member Library here before making
 * it visible. The Resources admin page manages the packs; this page controls
 * the member-facing release switch and presentation copy.
 */
export function MemberLibraryAdmin({ toolbar }: { toolbar?: ReactNode }) {
  const { content, updateContent } = useStore();
  const { library, resources } = content;
  const [query, setQuery] = useState("");

  const setLibrary = (patch: Partial<typeof library>) =>
    updateContent((current) => ({ ...current, library: { ...current.library, ...patch } }));

  const q = query.trim().toLowerCase();
  const packs = resources.filter((track) =>
    !q ||
    track.label.toLowerCase().includes(q) ||
    track.audience.toLowerCase().includes(q) ||
    track.items.some((item) => item.title.toLowerCase().includes(q)),
  );
  const resourceCount = resources.reduce(
    (total, track) => total + track.items.filter((item) => item.status === "published").length,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Member Library"
        description="Prepare and preview the resource catalogue here. Members only see it after you activate it."
      >
        {toolbar}
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card
          title="Library activation"
          description="This switch controls the Library entry in every member account."
        >
          <Toggle
            checked={library.enabled}
            onChange={(enabled) => setLibrary({ enabled })}
            label={library.enabled ? "Library is active for registered members" : "Library is hidden behind Coming soon"}
          />
          <div className={cn("mt-5 rounded-xl border p-4", library.enabled ? "border-teal/30 bg-teal/10" : "border-sun/30 bg-sun/10")}>
            <p className={cn("font-display text-[0.9rem] font-bold", library.enabled ? "text-teal-ink" : "text-[#8a6500]")}>
              {library.enabled ? "Members can browse and save resources now." : "Members currently see the Coming soon screen."}
            </p>
            <p className="mt-1 text-[0.8rem] leading-relaxed text-charcoal/65">
              You can edit packs in Resources at any time. Activation is saved and published automatically.
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            <Field label="Library title">
              <TextInput value={library.title} onChange={(title) => setLibrary({ title })} />
            </Field>
            <Field label="Library description">
              <TextArea rows={3} value={library.description} onChange={(description) => setLibrary({ description })} />
            </Field>
            <Field label="Coming soon title">
              <TextInput value={library.comingSoonTitle} onChange={(comingSoonTitle) => setLibrary({ comingSoonTitle })} />
            </Field>
            <Field label="Coming soon message">
              <TextArea rows={3} value={library.comingSoonBody} onChange={(comingSoonBody) => setLibrary({ comingSoonBody })} />
            </Field>
          </div>
        </Card>

        <Card
          title="Administrator preview"
          description={`${resources.length} pack${resources.length === 1 ? "" : "s"} · ${resourceCount} published resource${resourceCount === 1 ? "" : "s"}. This preview is always available to administrators.`}
          action={<a href="#/admin/resources" className="font-display text-[0.8rem] font-semibold text-navy hover:text-teal-ink">Manage packs →</a>}
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search the member library…" />
          {packs.length === 0 ? (
            <div className="mt-5"><EmptyState title="No packs match" body="Try a different search term or create a pack in Resources." /></div>
          ) : (
            <ul className="mt-5 space-y-3">
              {packs.map((track) => {
                const previewItems = track.items;
                return (
                  <li key={track.id} className="rounded-xl border border-mist bg-bone/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-[1rem] font-bold text-navy">{track.label}</p>
                        <p className="text-[0.78rem] text-teal-ink">{track.audience}</p>
                        <p className="mt-2 text-[0.84rem] leading-relaxed text-charcoal/65">{track.intro}</p>
                      </div>
                      <StatusBadge status={track.status} />
                    </div>
                    <ul className="mt-4 divide-y divide-mist border-t border-mist">
                      {previewItems.length === 0 ? (
                        <li className="py-3 text-[0.8rem] text-charcoal/55">No resources in this pack yet.</li>
                      ) : (
                        previewItems.map((item) => (
                          <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                            <span>
                              <span className="block font-display text-[0.85rem] font-semibold text-navy">{item.title}</span>
                              <span className="block text-[0.76rem] leading-relaxed text-charcoal/60">{item.detail}</span>
                            </span>
                            <span className={cn("rounded-full px-2 py-1 text-[0.65rem] font-semibold", item.status === "published" ? "bg-white text-teal-ink" : "bg-sun/20 text-[#8a6500]")}>
                              {item.status === "published" ? "Live" : "Draft"}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ============================ ADMIN ACCOUNT ============================ */

export function AccountPage({ toolbar }: { toolbar?: ReactNode }) {
  const { account, updateAccount, changePassword, logout, resetContent } = useStore();
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const strongEnough = next.length >= 8;
  const matches = next === confirmPw;

  return (
    <div>
      <PageHeader title="Admin Account" description="Manage your administrator profile, password and session.">
        {toolbar}
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Profile" description="Shown in the dashboard header.">
          <div className="grid gap-4">
            <Field label="Display name">
              <TextInput value={name} onChange={setName} />
            </Field>
            <Field label="Sign-in email" error={!emailValid ? "Enter a valid email address" : undefined}>
              <TextInput type="email" value={email} onChange={setEmail} invalid={!emailValid} />
            </Field>
            <div>
              <AdminBtn
                variant="primary"
                disabled={!emailValid || !name.trim()}
                onClick={() => void updateAccount({ name: name.trim() })}
              >
                Save profile
              </AdminBtn>
            </div>
          </div>
        </Card>

        <Card title="Change password" description="Use at least 8 characters.">
          <div className="grid gap-4">
            <Field label="Current password">
              <TextInput type="password" value={current} onChange={setCurrent} />
            </Field>
            <Field label="New password" error={next && !strongEnough ? "Must be at least 8 characters" : undefined}>
              <TextInput type="password" value={next} onChange={setNext} invalid={Boolean(next) && !strongEnough} />
            </Field>
            <Field label="Confirm new password" error={confirmPw && !matches ? "Passwords do not match" : undefined}>
              <TextInput type="password" value={confirmPw} onChange={setConfirmPw} invalid={Boolean(confirmPw) && !matches} />
            </Field>
            <div>
              <AdminBtn
                variant="primary"
                disabled={!current || !strongEnough || !matches}
                onClick={() => {
                  void changePassword(current, next).then((ok) => {
                    if (ok) {
                      setCurrent("");
                      setNext("");
                      setConfirmPw("");
                    }
                  });
                }}
              >
                Update password
              </AdminBtn>
            </div>
          </div>
        </Card>

        <Card title="Session" description="End your dashboard session on this device.">
          <p className="mb-4 text-[0.85rem] text-charcoal/65">
            Signed in as <strong className="text-navy">{account?.email}</strong>. Your session ends automatically
            when this browser tab is closed.
          </p>
          <AdminBtn variant="outline" onClick={() => void logout()}>
            Sign out
          </AdminBtn>
        </Card>

        <Card title="Danger zone" description="Restore the original website content shipped with Beyond Now.">
          <p className="mb-4 text-[0.85rem] text-charcoal/65">
            This replaces the live website with the original copy and photography. Your media library and account are
            not affected.
          </p>
          <AdminBtn variant="danger" onClick={() => setConfirmReset(true)}>
            Reset all website content
          </AdminBtn>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all website content?"
        body="Every edit you have made will be permanently replaced with the original Beyond Now content, live immediately. This cannot be undone."
        confirmLabel="Yes, reset everything"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          void resetContent().then(() => setConfirmReset(false));
        }}
      />
    </div>
  );
}
