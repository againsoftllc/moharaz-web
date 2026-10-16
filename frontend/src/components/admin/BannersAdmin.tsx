"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCatalog } from "@/lib/admin/catalog";
import { move, scheduleOf, uid } from "@/lib/admin/format";
import { useCollection } from "@/lib/admin/hooks";
import { db } from "@/lib/admin/resources";
import type { AdminBanner } from "@/lib/admin/types";
import { pad2 } from "@/lib/data";
import { AdIcon } from "./icons";
import { useToast } from "./Toast";
import { Empty, ErrorBox, Field, ImageField, Modal, Note, Order, PageHead, Skeleton, Toggle } from "./ui";

const SIZE: [number, number] = [2828, 1052];
const WHEN = { live: ["ok", "Live"], scheduled: ["warn", "Scheduled"], ended: ["no", "Ended"], off: ["plain", "Off"] } as const;
const PAGES = ["/bundles", "/pc-builder", "/brand", "/blog", "/all?sort=discount"];
const fmt = (s: string) => new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function BannerModal({ initial, isNew, links, busy, onSave, onClose }: { initial: AdminBanner; isNew: boolean; links: string[]; busy: boolean; onSave: (b: AdminBanner) => void; onClose: () => void }) {
  const [b, setB] = useState(initial);
  const [err, setErr] = useState<Partial<Record<"src" | "alt" | "dates", string>>>({});
  const set = (patch: Partial<AdminBanner>) => setB((x) => ({ ...x, ...patch }));
  const save = () => {
    const e: typeof err = {};
    if (!b.src) e.src = "Upload the banner image.";
    if (!b.alt.trim()) e.alt = "Describe the banner — screen readers and Google read this.";
    if (b.startsAt && b.endsAt && b.endsAt <= b.startsAt) e.dates = "The end must be after the start.";
    setErr(e);
    if (!Object.keys(e).length) onSave({ ...b, alt: b.alt.trim(), href: b.href.trim() || "/" });
  };
  return (
    <Modal
      open wide title={isNew ? "Add homepage banner" : "Edit banner"} onClose={onClose}
      footer={<><button className="btn btn-line" onClick={onClose}>Cancel</button><button className="btn btn-red" onClick={save} disabled={busy}>{busy ? "Saving…" : isNew ? "Add banner" : "Save banner"}</button></>}
    >
      <Field label="Banner image" group error={err.src}>
        <ImageField value={b.src || undefined} onChange={(src) => set({ src: src ?? "" })} size={SIZE} maxW={1600} />
      </Field>
      <Field label="Alt text" error={err.alt} hint="What the banner says, e.g. “Get Onimusha with select AMD Ryzen and Radeon products”." count={b.alt.length} max={140}>
        <input value={b.alt} onChange={(e) => set({ alt: e.target.value })} />
      </Field>
      <Field label="Link" hint="Where a click goes — a category, search, or any page.">
        <input list="ad-banner-links" value={b.href} onChange={(e) => set({ href: e.target.value })} placeholder="/graphics-card?q=geforce" />
        <datalist id="ad-banner-links">{links.map((l) => <option key={l} value={l} />)}</datalist>
      </Field>
      <div className="ad-g3" style={{ alignItems: "end" }}>
        <Field label="Show from" optional><input type="datetime-local" value={b.startsAt} onChange={(e) => set({ startsAt: e.target.value })} /></Field>
        <Field label="Show until" optional error={err.dates}><input type="datetime-local" value={b.endsAt} min={b.startsAt || undefined} onChange={(e) => set({ endsAt: e.target.value })} /></Field>
        <div style={{ paddingBottom: 10 }}><Toggle checked={b.active} onChange={(active) => set({ active })} label="Active" /></div>
      </div>
    </Modal>
  );
}

export default function BannersAdmin() {
  const banners = useCollection(db.banners);
  const { cats } = useCatalog();
  const toast = useToast();
  const [edit, setEdit] = useState<{ b: AdminBanner; isNew: boolean } | null>(null);
  const [del, setDel] = useState<AdminBanner | null>(null);
  const [busy, setBusy] = useState(false);

  const list = [...(banners.items ?? [])].sort((a, b) => a.order - b.order);
  const live = list.filter((b) => scheduleOf(b.active, b.startsAt, b.endsAt) === "live");
  const links = [...cats.map((c) => `/${c.slug}`), ...PAGES];

  const run = async (fn: () => Promise<unknown>, ok: string, log?: string) => {
    setBusy(true);
    try { await fn(); toast(ok); if (log) logActivity(log, "/admin/banners"); return true; }
    catch (e) { toast(errorText(e), "err"); return false; }
    finally { setBusy(false); }
  };

  const reorder = (i: number, d: number) => {
    const next = move(list, i, d);
    const changed = next.filter((b, k) => b.id !== list[k].id);
    run(() => Promise.all(changed.map((b) => banners.save(b, b.id))), "Order updated", "Reordered homepage banners");
  };

  const saveEdit = async (b: AdminBanner) => {
    if (!edit) return;
    if (await run(() => banners.save(b, edit.isNew ? undefined : edit.b.id), edit.isNew ? "Banner added" : "Banner saved", `${edit.isNew ? "Added" : "Updated"} homepage banner`)) setEdit(null);
  };

  return (
    <>
      <PageHead
        title="Homepage Banners"
        mode={banners.mode}
        desc="The hero slider at the top of the homepage. Slides rotate every 6 seconds in this order."
        actions={<button className="btn btn-red" onClick={() => setEdit({ isNew: true, b: { id: uid("banner"), src: "", alt: "", href: "", active: true, order: list.length + 1, startsAt: "", endsAt: "" } })}><AdIcon n="plus" />Add banner</button>}
      />
      {banners.error && <ErrorBox message={banners.error} onRetry={banners.reload} />}

      {banners.loading ? <Skeleton rows={6} /> : (
        <div className="ad-dash" style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)" }}>
          <div className="ad-stack">
            {!list.length ? (
              <div className="ad-card"><Empty icon="image" title="No banners yet" text={`Upload a ${SIZE[0]}×${SIZE[1]} image to start the slider.`} /></div>
            ) : (
              <div className="ad-banners">
                {list.map((b, i) => {
                  const [tone, label] = WHEN[scheduleOf(b.active, b.startsAt, b.endsAt)];
                  return (
                    <div key={b.id} className={`ad-ban ${b.active ? "" : "off"}`}>
                      <Order i={i} n={list.length} onMove={(d) => reorder(i, d)} label={`banner ${i + 1}`} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <button className="ad-ban-img" onClick={() => setEdit({ b, isNew: false })} aria-label={`Edit banner ${i + 1}`}><img src={b.src} alt="" /></button>
                      <div className="ad-ban-t">
                        <b>{b.alt || "No alt text"}</b>
                        <small><AdIcon n="link" /> {b.href}</small>
                        <span>
                          <span className={`ad-b ${tone}`}>{label}</span>
                          {b.startsAt && <span className="ad-b plain">From {fmt(b.startsAt)}</span>}
                          {b.endsAt && <span className="ad-b plain">Until {fmt(b.endsAt)}</span>}
                        </span>
                      </div>
                      <div className="ad-ban-acts">
                        <Toggle checked={b.active} onChange={(active) => run(() => banners.save({ ...b, active }, b.id), active ? "Banner switched on" : "Banner switched off")} label={<span className="sr-only">Active</span>} />
                        <button className="ad-ib" onClick={() => setEdit({ b, isNew: false })} aria-label={`Edit banner ${i + 1}`}><AdIcon n="edit" /></button>
                        <button className="ad-ib ad-del" onClick={() => setDel(b)} aria-label={`Delete banner ${i + 1}`}><AdIcon n="trash" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="ad-stack">
            <section className="ad-card">
              <header style={{ marginBottom: 12 }}><div><h2>On the homepage now</h2><p>{live.length} of {list.length} slides are live</p></div></header>
              <div className="ad-hero-prev">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {live[0] ? <img src={live[0].src} alt={live[0].alt} /> : <Empty icon="image" title="Nothing live" />}
                {live.length > 0 && <div className="counter">{pad2(1)} <span>/ {pad2(live.length)}</span></div>}
              </div>
            </section>
            <Note>Use <b>{SIZE[0]}×{SIZE[1]}px</b> images (about 2.7 : 1). Keep text away from the edges — phones crop the sides slightly. Schedule a banner to switch on and off by itself for sales.</Note>
          </aside>
        </div>
      )}

      {edit && <BannerModal key={edit.b.id} initial={edit.b} isNew={edit.isNew} links={links} busy={busy} onSave={saveEdit} onClose={() => setEdit(null)} />}

      <ConfirmDialog
        open={!!del}
        tone="danger"
        title="Delete this banner?"
        message="It will be removed from the homepage slider. This can't be undone."
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDel(null)}
        onConfirm={async () => { if (del) await run(() => banners.remove(del.id), "Banner deleted", "Deleted a homepage banner"); setDel(null); }}
      />
    </>
  );
}
