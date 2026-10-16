"use client";

import Link from "next/link";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { API_BASE, errorText, uploadImage, type Mode } from "@/lib/admin/api";
import { ic, type IconKey } from "@/lib/data";
import { AdIcon } from "./icons";
import { SITE_HOST } from "@/lib/site";

/* ---------- page furniture ---------- */

export function PageHead({ crumbs, title, desc, actions, mode }: {
  crumbs?: [string, string?][];
  title: ReactNode;
  desc?: ReactNode;
  actions?: ReactNode;
  mode?: Mode | null;
}) {
  return (
    <div className="ad-head">
      <div>
        {crumbs && (
          <nav className="ad-crumb" aria-label="Breadcrumb">
            {crumbs.map(([label, href], i) => (
              <Fragment key={label}>
                {i > 0 && <span>/</span>}
                {href ? <Link href={href}>{label}</Link> : <span>{label}</span>}
              </Fragment>
            ))}
          </nav>
        )}
        <h1>{title}{mode && <SourceTag mode={mode} />}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {actions && <div className="ad-head-acts">{actions}</div>}
    </div>
  );
}

/** Where this screen's data comes from right now. */
export function SourceTag({ mode }: { mode: Mode }) {
  return mode === "api"
    ? <span className="ad-src api" title={`Reading and saving through ${API_BASE}`}>Live API</span>
    : <span className="ad-src local" title="Saved in this browser only until the backend endpoint is connected">Local demo</span>;
}

export function Card({ title, desc, actions, children, className = "" }: { title?: ReactNode; desc?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`ad-card ${className}`}>
      {(title || actions) && (
        <header>
          <div>{title && <h2>{title}</h2>}{desc && <p>{desc}</p>}</div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon = "box", title, text, action }: { icon?: Parameters<typeof AdIcon>[0]["n"]; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ad-empty">
      <AdIcon n={icon} />
      <b>{title}</b>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="ad-err" role="alert">
      <AdIcon n="alert" />
      <div><b>Couldn&apos;t load this from the server</b><p>{message}</p></div>
      {onRetry && <button className="btn btn-line ad-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="ad-card" aria-busy="true" aria-label="Loading">
      <div style={{ display: "grid", gap: 14 }}>
        {Array.from({ length: rows }, (_, i) => <div key={i} className="ad-skel" style={{ width: `${90 - ((i * 17) % 40)}%` }} />)}
      </div>
    </div>
  );
}

export function Note({ children, icon = "info" }: { children: ReactNode; icon?: Parameters<typeof AdIcon>[0]["n"] }) {
  return <div className="ad-note"><AdIcon n={icon} /><div>{children}</div></div>;
}

/* ---------- form controls ---------- */

/** Labelled field. Use `group` when the control holds buttons (chips, pickers) so the label doesn't click them. */
export function Field({ label, hint, error, optional, count, max, group, children, className = "" }: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  count?: number;
  max?: number;
  group?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={`ad-f ${error ? "err" : ""} ${className}`} role={group ? "group" : undefined}>
      <span className="ad-f-top">
        <span>{label}{optional && <span className="opt"> · optional</span>}</span>
        {count !== undefined && max && <em className={count > max ? "over" : ""}>{count}/{max}</em>}
      </span>
      {children}
      {error ? <small className="msg">{error}</small> : hint ? <small>{hint}</small> : null}
    </Tag>
  );
}

export function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; desc?: ReactNode }) {
  return (
    <label className="ad-tg">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
      <span>{label}{desc && <small>{desc}</small>}</span>
    </label>
  );
}

export function Seg<T extends string | number>({ options, value, onChange, label }: {
  options: readonly (T | readonly [T, ReactNode])[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="ad-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o as T, String(o)];
        return <button type="button" key={String(v)} role="radio" aria-checked={v === value} className={v === value ? "on" : ""} onClick={() => onChange(v)}>{l}</button>;
      })}
    </div>
  );
}

/** Tag-style list input: Enter, comma or "·" adds; Backspace on empty removes the last one. */
export function Chips({ value, onChange, placeholder, split = /[,\n·]/, max }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; split?: RegExp; max?: number }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(split).map((s) => s.trim()).filter(Boolean);
    const next = [...value];
    parts.forEach((p) => { if (!next.includes(p) && (!max || next.length < max)) next.push(p); });
    if (next.length !== value.length) onChange(next);
    setDraft("");
  };
  return (
    <div className="ad-chips">
      {value.map((v, i) => (
        <span key={v}>{v}<button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><AdIcon n="x" /></button></span>
      ))}
      <input
        value={draft}
        placeholder={value.length ? "" : placeholder}
        onChange={(e) => (split.test(e.target.value) ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); add(draft); }
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft && add(draft)}
      />
    </div>
  );
}

/** Toggle buttons for picking several values out of a known list. */
export function PickMany<T extends string>({ options, value, onChange, render }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; render?: (v: T) => ReactNode }) {
  return (
    <div className="ad-pills">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button type="button" key={o} className={on ? "on" : ""} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}>
            {on && <AdIcon n="check" />}{render ? render(o) : o}
          </button>
        );
      })}
    </div>
  );
}

const SWATCHES = ["#E3121B", "#F97316", "#FFB020", "#EAB308", "#22C55E", "#16A34A", "#2DD4BF", "#0EA5E9", "#38BDF8", "#1D4ED8", "#6366F1", "#7C3AED", "#A855F7", "#EC4899", "#94A3B8", "#64748B"];

export function ColorField({ value, onChange, swatches = SWATCHES }: { value: string; onChange: (v: string) => void; swatches?: string[] }) {
  return (
    <div className="ad-color">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Pick a colour" />
      <div className="ad-swatches">
        {swatches.map((c) => <button type="button" key={c} style={{ background: c }} className={c.toLowerCase() === value.toLowerCase() ? "on" : ""} onClick={() => onChange(c)} aria-label={c} />)}
      </div>
    </div>
  );
}

export function IconPicker({ value, onChange }: { value: IconKey; onChange: (v: IconKey) => void }) {
  return (
    <div className="ad-icons" role="radiogroup" aria-label="Icon">
      {(Object.keys(ic) as IconKey[]).map((k) => (
        <button type="button" key={k} role="radio" aria-checked={k === value} aria-label={k} title={k} className={k === value ? "on" : ""} onClick={() => onChange(k)}><Icon k={k} /></button>
      ))}
    </div>
  );
}

/** Product / category thumbnail: the photo, or the category icon on a tinted tile. */
export function Thumb({ src, icon, color }: { src?: string; icon?: IconKey; color?: string }) {
  return (
    <span className="ad-th" style={!src && color ? { background: `color-mix(in srgb,${color} 16%,transparent)`, color } : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" /> : icon ? <Icon k={icon} /> : <AdIcon n="image" />}
    </span>
  );
}

/* ---------- image upload ---------- */

/** Upload (drop / click / paste a URL) with a preview and a warning when the size or shape is off. */
export function ImageField({ value, onChange, size, maxW }: {
  value?: string;
  onChange: (url: string | undefined) => void;
  /** recommended pixel size */
  size: [number, number];
  /** downscale local uploads to this width */
  maxW?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [dims, setDims] = useState<[number, number] | null>(null);
  const [url, setUrl] = useState("");
  const [w, h] = size;

  useEffect(() => {
    if (!value) return;
    const img = new Image();
    img.onload = () => setDims([img.naturalWidth, img.naturalHeight]);
    img.src = value;
  }, [value]);

  const take = async (file?: File) => {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const up = await uploadImage(file, maxW ?? w);
      onChange(up.url);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const applyUrl = () => {
    if (!url.trim()) return;
    onChange(url.trim());
    setUrl("");
  };

  const shown = value ? dims : null;
  const ratioOff = shown && Math.abs(shown[0] / shown[1] - w / h) / (w / h) > 0.04;
  const small = shown && shown[0] < w * 0.75;
  // square / tall slots would fill the whole column — keep their preview a sensible size
  const cap = h / w > 0.6 ? 320 : undefined;

  const drop = (
    <div
      className={`ad-drop ${over ? "over" : ""}`}
      style={{ aspectRatio: `${w}/${h}`, minHeight: h / w > 0.3 ? 140 : 96, maxWidth: cap }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
    >
      <input type="file" accept="image/*" aria-label="Upload image" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      {busy ? <span className="spin" style={{ borderColor: "var(--line)", borderTopColor: "var(--red)" }} /> : <AdIcon n="upload" />}
      <b>{busy ? "Uploading…" : "Drop an image or click to upload"}</b>
      <small>Recommended {w}×{h}px · JPG, PNG or WebP</small>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {value ? (
        <div>
          <div className="ad-img" style={{ aspectRatio: `${w}/${h}`, maxWidth: cap }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" />
          </div>
          <div className="ad-img-bar">
            <span>{shown ? `${shown[0]}×${shown[1]}px` : "…"}</span>
            <label className="btn btn-line ad-sm" style={{ position: "relative", overflow: "hidden" }}>
              {busy ? "Uploading…" : "Replace"}
              <input type="file" accept="image/*" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <button type="button" className="btn btn-line ad-sm ad-del" onClick={() => { onChange(undefined); setDims(null); }}>Remove</button>
          </div>
        </div>
      ) : drop}
      {(ratioOff || small) && (
        <div className="ad-warn"><AdIcon n="alert" /><span>
          {ratioOff ? `This image is ${shown![0]}×${shown![1]} — the slot is ${w}×${h}, so it will be cropped. ` : ""}
          {small ? "It's smaller than recommended and may look blurry." : ""}
        </span></div>
      )}
      {err && <small className="msg" style={{ color: "var(--red)", fontSize: 12, fontWeight: 600 }}>{err}</small>}
      {!value && (
        <div className="ad-pre" style={{ height: 38 }}>
          <span><AdIcon n="link" /></span>
          <input
            className="ad-in" style={{ border: 0, height: 36, boxShadow: "none" }} value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyUrl(); } }}
            placeholder="…or paste an image URL" aria-label="Image URL"
          />
          <button type="button" className="btn btn-line ad-sm" style={{ margin: 2, height: "32px" }} disabled={!url.trim()} onClick={applyUrl}>Use</button>
        </div>
      )}
    </div>
  );
}

/** Several images (product gallery). */
export function GalleryField({ value, onChange, max = 8 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr(null);
    try {
      const room = max - value.length;
      const ups = await Promise.all([...files].slice(0, room).map((f) => uploadImage(f, 1000)));
      onChange([...value, ...ups.map((u) => u.url)]);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="ad-gallery">
        {value.map((src, i) => (
          <div key={src.slice(-40) + i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="ad-img"><img src={src} alt={`Photo ${i + 2}`} /></div>
            <button type="button" aria-label="Remove photo" onClick={() => onChange(value.filter((_, j) => j !== i))}><AdIcon n="x" /></button>
          </div>
        ))}
        {value.length < max && (
          <div className="ad-drop">
            <input type="file" accept="image/*" multiple aria-label="Add photos" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
            {busy ? <span className="spin" style={{ borderColor: "var(--line)", borderTopColor: "var(--red)" }} /> : <AdIcon n="plus" />}
            <small>{busy ? "Uploading" : "Add photos"}</small>
          </div>
        )}
      </div>
      {err && <small style={{ color: "var(--red)", fontSize: 12, fontWeight: 600 }}>{err}</small>}
    </div>
  );
}

/* ---------- SEO ---------- */

export function SeoFields({ title, desc, path, fallbackTitle, fallbackDesc, onTitle, onDesc }: {
  title: string; desc: string; path: string; fallbackTitle: string; fallbackDesc: string;
  onTitle: (v: string) => void; onDesc: (v: string) => void;
}) {
  const t = title || fallbackTitle;
  return (
    <div className="ad-fields">
      <Field label="Meta title" optional count={t.length} max={60} hint="Shown in Google and the browser tab. Leave empty to use the default.">
        <input value={title} onChange={(e) => onTitle(e.target.value)} placeholder={fallbackTitle} />
      </Field>
      <Field label="Meta description" optional count={(desc || fallbackDesc).length} max={160}>
        <textarea rows={3} value={desc} onChange={(e) => onDesc(e.target.value)} placeholder={fallbackDesc} />
      </Field>
      <div className="ad-serp" aria-label="Search result preview">
        <small>{SITE_HOST}{path}</small>
        <b>{t} | Moharaz</b>
        <p>{desc || fallbackDesc || "Add a description so shoppers know what they'll find."}</p>
      </div>
    </div>
  );
}

/* ---------- modal ---------- */

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className={`modal ad-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <header><h2>{title}</h2><button className="ad-ib" onClick={onClose} aria-label="Close"><AdIcon n="x" /></button></header>
        <div className="ad-modal-b">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}

/** Up / down buttons for ordered lists. */
export function Order({ i, n, onMove, label }: { i: number; n: number; onMove: (d: -1 | 1) => void; label: string }) {
  return (
    <div className="ad-ord">
      <button type="button" disabled={i === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}><AdIcon n="up" /></button>
      <button type="button" disabled={i === n - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}><AdIcon n="down" /></button>
    </div>
  );
}

/** Warn before leaving the page with unsaved edits. */
export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const f = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty]);
}
