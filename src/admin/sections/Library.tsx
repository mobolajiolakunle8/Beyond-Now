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
  TextArea,
  TextInput,
  useImg,
} from "@/admin/ui";
import { LogoMark } from "@/components/Logo";
import { setPath, uid, type SiteContent } from "@/lib/content";
import { ACCEPT_ATTR, formatBytes, formatDate } from "@/lib/media";
import { useStore } from "@/lib/store";
import { cn } from "@/utils/cn";

/* =========================== MEDIA LIBRARY =========================== */

export function MediaLibraryPage({ toolbar }: { toolbar?: ReactNode }) {
  const { media, uploadMedia, deleteMedia, replaceMedia, renameMedia } = useStore();
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);

  const q = query.trim().toLowerCase();
  const results = media.filter((m) => m.name.toLowerCase().includes(q));
  const totalBytes = media.reduce((sum, m) => sum + m.size, 0);

  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Upload images straight from this device. JPG, PNG and WebP are supported — no external image links needed."
      >
        {toolbar}
        <AdminBtn variant="primary" onClick={() => uploadRef.current?.click()}>
          Upload images
        </AdminBtn>
      </PageHeader>

      <input
        ref={uploadRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => {
          void uploadMedia(e.target.files ?? []);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replaceTarget.current) {
            void replaceMedia(replaceTarget.current, file);
          }
          replaceTarget.current = null;
          e.target.value = "";
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
          void uploadMedia(e.dataTransfer.files);
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
          Large photos are automatically resized for fast loading. Maximum 12MB per file.
        </p>
        <div className="mt-4 flex justify-center">
          <AdminBtn variant="outline" size="sm" onClick={() => uploadRef.current?.click()}>
            Choose files
          </AdminBtn>
        </div>
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
                    <dd className="font-medium text-charcoal/75">{formatBytes(item.size)}</dd>
                  </div>
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
                    onClick={() => {
                      replaceTarget.current = item.id;
                      replaceRef.current?.click();
                    }}
                  >
                    Replace
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
  const { draft, updateDraft, notify } = useStore();
  const img = useImg();
  const { settings, brand } = draft;
  const [confirmLogo, setConfirmLogo] = useState(false);
  const [logoUnlocked, setLogoUnlocked] = useState(false);

  const set = (path: string, value: unknown) => updateDraft((d) => setPath(d, path, value) as SiteContent);

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
        <Card title="Contact details" description="Used by every WhatsApp button, the contact form and the footer.">
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
              hint="Square PNG works best"
              aspect="aspect-square"
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
                    label="Upload official logo"
                    hint="PNG with transparency recommended"
                    aspect="aspect-[3/1]"
                    value={brand.logoUrl}
                    onChange={(v) => {
                      set("brand.logoUrl", v);
                      if (v) notify("success", "Official logo updated in your draft.");
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

/* ============================ ADMIN ACCOUNT ============================ */

export function AccountPage({ toolbar }: { toolbar?: ReactNode }) {
  const { account, updateAccount, changePassword, logout, resetEverything, notify } = useStore();
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
                onClick={() => void updateAccount({ name: name.trim(), email: email.trim() })}
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
            This replaces both your draft and the published website with the original copy and photography. Your
            media library and account are not affected.
          </p>
          <AdminBtn variant="danger" onClick={() => setConfirmReset(true)}>
            Reset all website content
          </AdminBtn>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all website content?"
        body="Every edit you have made — draft and published — will be permanently replaced with the original Beyond Now content. This cannot be undone."
        confirmLabel="Yes, reset everything"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          void resetEverything().then(() => {
            setConfirmReset(false);
            notify("info", "Website content restored to defaults.");
          });
        }}
      />
    </div>
  );
}
