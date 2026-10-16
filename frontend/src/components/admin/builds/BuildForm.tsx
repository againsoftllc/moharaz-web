"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductId } from "@/lib/products";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCatalog } from "@/lib/admin/catalog";
import { SLUG_RE, slugify } from "@/lib/admin/format";
import { useCollection } from "@/lib/admin/hooks";
import { db } from "@/lib/admin/resources";
import type { AdminBuild, AdminCategory, AdminProduct } from "@/lib/admin/types";
import { ASSEMBLY_FEE, SLOTS, checks, power, type Build, type SlotKey, type Tab } from "@/lib/builder";
import { tk } from "@/lib/data";
import { AdIcon } from "../icons";
import ProductPicker from "../ProductPicker";
import { useToast } from "../Toast";
import { Card, Empty, Field, PageHead, Seg, Skeleton, SourceTag, Toggle, useUnsaved } from "../ui";
import PcCard from "./PcCard";

const BADGES = ["Best seller", "Top pick", "Budget", "New", "Creator"];
/* tower glow presets (the homepage PCs use these pairs) */
const GLOWS: [string, string][] = [["#E3121B", "#7C3AED"], ["#1D4ED8", "#38BDF8"], ["#E3121B", "#FFB020"], ["#22C55E", "#38BDF8"], ["#A855F7", "#E3121B"], ["#FFB020", "#E3121B"]];
const TABS: [Exclude<Tab, "overview">, string][] = [["components", "Components"], ["extras", "Extras"], ["peripherals", "Peripherals"]];
const blank = (): AdminBuild => ({
  id: "", name: "", badge: "", colors: ["#E3121B", "#7C3AED"], parts: {}, highlights: ["", "", "", ""],
  price: 0, old: 0, assembly: true, description: "", featured: true, status: "active",
});

export default function BuildEditor({ id }: { id?: string }) {
  const cat = useCatalog();
  const builds = useCollection(db.builds);
  if (cat.loading || builds.loading) return <Skeleton rows={12} />;
  const found = id !== undefined ? builds.items?.find((b) => b.id === id) : undefined;
  if (id !== undefined && !found) {
    return <div className="ad-card"><Empty icon="pc" title="PC not found" text={`There's no custom PC “${id}”.`} action={<Link href="/admin/custom-pc" className="btn btn-red">Back to custom PCs</Link>} /></div>;
  }
  return (
    <BuildForm
      key={found?.id ?? "new"} initial={found ?? blank()} isNew={!found} all={builds.items ?? []}
      save={builds.save} remove={builds.remove} mode={builds.mode}
      products={cat.products.items ?? []} byId={cat.byId} catMap={cat.catMap}
    />
  );
}

/** the line shown on the card for a part: model without brand / "Processor", with quantity */
const lineFor = (p: AdminProduct, qty: number) => `${qty > 1 ? `${qty}× ` : ""}${p.name.replace(`${p.brand} `, "").replace(/ Processor$/, "")}`;

type Errors = Partial<Record<"name" | "id" | "price" | "old" | "parts", string>>;

function BuildForm({ initial, isNew, all, save, remove, mode, products, byId, catMap }: {
  initial: AdminBuild;
  isNew: boolean;
  all: AdminBuild[];
  save: (b: AdminBuild, prev?: string) => Promise<AdminBuild>;
  remove: (id: string) => Promise<void>;
  mode: "api" | "local" | null;
  products: AdminProduct[];
  byId: Map<number, AdminProduct>;
  catMap: Map<string, AdminCategory>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [base, setBase] = useState(initial);
  const [b, setB] = useState(initial);
  const [tab, setTab] = useState<Exclude<Tab, "overview">>("components");
  const [idTouched, setIdTouched] = useState(!isNew);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const set = (patch: Partial<AdminBuild>) => setB((x) => ({ ...x, ...patch }));
  const dirty = JSON.stringify(b) !== JSON.stringify(base);
  useUnsaved(dirty && !busy);

  const setSlot = (k: SlotKey, picks: Build[SlotKey]) => set({ parts: { ...b.parts, [k]: picks?.length ? picks : undefined } });
  // this admin edits builds from the demo catalogue (numeric ids)
  const demoId = (id: ProductId | undefined) => (typeof id === "number" ? id : undefined);
  const picked = SLOTS.flatMap((s) => (b.parts[s.key] ?? []).map((x) => ({ slot: s, p: byId.get(demoId(x.id) ?? -1), qty: x.qty })));
  const partsTotal = picked.reduce((s, x) => s + (x.p?.price ?? 0) * x.qty, 0);
  const total = partsTotal + (b.assembly ? ASSEMBLY_FEE : 0);
  const watts = power(b.parts);
  const issues = checks(b.parts);
  const errorsCount = issues.filter((c) => c.level === "error").length;
  const usedIds = picked.map((x) => x.p?.id).filter((x): x is number => x !== undefined);

  const generate = () => {
    const first = (k: SlotKey) => { const x = b.parts[k]?.[0]; const p = x && byId.get(demoId(x.id) ?? -1); return p ? lineFor(p, x.qty) : ""; };
    const store = first("ssd") || first("hdd");
    set({ highlights: [first("cpu"), first("gpu") || "Integrated graphics", first("memory"), store] });
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!b.name.trim()) e.name = "Give the PC a name.";
    if (!b.id) e.id = "Enter an ID.";
    else if (!SLUG_RE.test(b.id)) e.id = "Use lowercase letters, numbers and single hyphens only.";
    else if (all.some((x) => x.id === b.id && x.id !== base.id)) e.id = "Another PC already uses this ID.";
    if (!(b.price > 0)) e.price = "Enter the selling price.";
    if (b.old && b.old < b.price) e.old = "Regular price can't be lower than the selling price.";
    if (!b.parts.cpu?.length) e.parts = "Choose at least a CPU.";
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { toast("Please fix the highlighted fields", "err"); return; }
    setBusy(true);
    try {
      const saved = await save({ ...b, name: b.name.trim(), highlights: b.highlights.map((h) => h.trim()) }, isNew ? undefined : base.id);
      logActivity(`${isNew ? "Created" : "Updated"} custom PC “${saved.name}”`, `/admin/custom-pc/${saved.id}`);
      toast(isNew ? "Custom PC created" : "Changes saved");
      setBase(saved);
      setB(saved);
      if (isNew || saved.id !== base.id) router.replace(`/admin/custom-pc/${saved.id}`);
    } catch (err) {
      toast(errorText(err), "err");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await remove(base.id);
      logActivity(`Deleted custom PC “${base.name}”`, "/admin/custom-pc");
      toast("Custom PC deleted");
      router.push("/admin/custom-pc");
    } catch (err) {
      toast(errorText(err), "err");
      setBusy(false);
      setDel(false);
    }
  };

  return (
    <>
      <PageHead
        crumbs={[["Custom PCs", "/admin/custom-pc"], [isNew ? "New PC" : "Edit"]]}
        title={isNew ? "New custom PC" : base.name}
        desc={isNew ? "Choose the parts — compatibility, power draw and the parts total are worked out as you go." : undefined}
        actions={!isNew && <button className="btn btn-line ad-del" onClick={() => setDel(true)}><AdIcon n="trash" />Delete</button>}
      />

      <div className="ad-form">
        <div className="ad-stack">
          <Card title="Details">
            <div className="ad-fields">
              <div className="ad-g2">
                <Field label="Name" error={errors.name}>
                  <input value={b.name} onChange={(e) => set({ name: e.target.value, ...(idTouched ? {} : { id: slugify(e.target.value) }) })} placeholder="Ultra Gaming PC — Ryzen 5 9600X + RTX 5060" />
                </Field>
                <Field label="ID" error={errors.id} hint="Used in links and by the API.">
                  <input value={b.id} onChange={(e) => { setIdTouched(true); set({ id: e.target.value.toLowerCase().replace(/\s+/g, "-") }); }} placeholder="auto from name" />
                </Field>
              </div>
              <div className="ad-g2">
                <Field label="Badge" optional hint="Corner label on the card.">
                  <input list="ad-pc-badges" value={b.badge} onChange={(e) => set({ badge: e.target.value })} maxLength={16} />
                  <datalist id="ad-pc-badges">{BADGES.map((x) => <option key={x} value={x} />)}</datalist>
                </Field>
                <Field label="Tower glow" group hint="Top and bottom colours of the case lighting.">
                  <div className="ad-color">
                    <input type="color" value={b.colors[0]} onChange={(e) => set({ colors: [e.target.value, b.colors[1]] })} aria-label="Top colour" />
                    <input type="color" value={b.colors[1]} onChange={(e) => set({ colors: [b.colors[0], e.target.value] })} aria-label="Bottom colour" />
                    <div className="ad-swatches">
                      {GLOWS.map(([x, y]) => (
                        <button type="button" key={x + y} style={{ background: `linear-gradient(${x},${y})` }} className={b.colors[0] === x && b.colors[1] === y ? "on" : ""} onClick={() => set({ colors: [x, y] })} aria-label={`${x} to ${y}`} />
                      ))}
                    </div>
                  </div>
                </Field>
              </div>
              <Field label="Description" optional count={b.description.length} max={400}>
                <textarea rows={3} value={b.description} onChange={(e) => set({ description: e.target.value })} placeholder="Who it's for and what it handles — e.g. 1440p high-refresh gaming and streaming." />
              </Field>
            </div>
          </Card>

          <Card title="Parts" desc="Same slots as the PC Builder. Required parts are marked *." actions={errors.parts && <span className="ad-b no">{errors.parts}</span>}>
            <div className="ad-tabs" role="tablist">
              {TABS.map(([k, label]) => {
                const n = SLOTS.filter((s) => s.tab === k).reduce((s, x) => s + (b.parts[x.key]?.length ?? 0), 0);
                return <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}{n > 0 && <em>{n}</em>}</button>;
              })}
            </div>
            <div className="ad-parts">
              {SLOTS.filter((s) => s.tab === tab).map((s) => {
                const picks = b.parts[s.key] ?? [];
                const fits = (p: AdminProduct) => p.cat === s.cat && (!s.only || s.only(p));
                const rows = s.multi || !picks.length ? [...picks, undefined] : picks;
                return rows.map((x, i) => (
                  <div className="ad-part" key={`${s.key}-${i}`}>
                    <label>{i === 0 ? <><Icon k={s.icon} />{s.label}{s.core && <em>*</em>}</> : null}</label>
                    <ProductPicker
                      products={products} catMap={catMap} filter={fits} value={demoId(x?.id)} exclude={usedIds}
                      placeholder={x ? undefined : i > 0 ? `Add another ${s.label.toLowerCase()}` : `Choose ${s.label.toLowerCase()}`}
                      onChange={(id) => setSlot(s.key, id === undefined ? picks.filter((_, j) => j !== i) : x ? picks.map((y, j) => (j === i ? { id, qty: y.qty } : y)) : [...picks, { id, qty: 1 }])}
                    />
                    {x && s.multi ? (
                      <div className="ad-qty">
                        <button type="button" aria-label="Fewer" onClick={() => setSlot(s.key, x.qty > 1 ? picks.map((y, j) => (j === i ? { ...y, qty: y.qty - 1 } : y)) : picks.filter((_, j) => j !== i))}><AdIcon n="minus" /></button>
                        <span>{x.qty}</span>
                        <button type="button" aria-label="More" onClick={() => setSlot(s.key, picks.map((y, j) => (j === i ? { ...y, qty: Math.min(8, y.qty + 1) } : y)))}><AdIcon n="plus" /></button>
                      </div>
                    ) : <span />}
                  </div>
                ));
              })}
            </div>
          </Card>

          <Card title="Card text" desc="The four lines under the name: CPU, graphics, memory, storage." actions={<button className="btn btn-line ad-sm" onClick={generate} disabled={!picked.length}><AdIcon n="wand" />Fill from parts</button>}>
            <div className="ad-g2">
              {["CPU", "Graphics", "Memory", "Storage"].map((l, i) => (
                <Field key={l} label={l}>
                  <input value={b.highlights[i] ?? ""} onChange={(e) => set({ highlights: b.highlights.map((h, j) => (j === i ? e.target.value : h)) })} />
                </Field>
              ))}
            </div>
          </Card>

          <Card title="Pricing">
            <div className="ad-fields">
              <div className="ad-sum">
                <div><span>{picked.length} parts</span><b>{tk(partsTotal)}</b></div>
                {b.assembly && <div><span>Assembly &amp; stress test</span><b>{tk(ASSEMBLY_FEE)}</b></div>}
                <div className="tot"><span>Bought separately</span><b>{tk(total)}</b></div>
              </div>
              <Toggle checked={b.assembly} onChange={(assembly) => set({ assembly })} label="Include assembly fee in the total" desc={`Adds ${tk(ASSEMBLY_FEE)} for building and testing.`} />
              <div className="ad-g2">
                <Field label="Selling price" error={errors.price} hint={b.price ? `0% EMI from ${tk(Math.round(b.price / 12))}/month` : undefined}>
                  <div className="ad-pre"><span>৳</span><input type="number" min={0} step={500} value={b.price || ""} onChange={(e) => set({ price: +e.target.value })} /></div>
                </Field>
                <Field label="Regular price" error={errors.old} hint={b.old > b.price && b.price ? `Customer saves ${tk(b.old - b.price)}` : "Struck through on the card."}>
                  <div className="ad-pre"><span>৳</span><input type="number" min={0} step={500} value={b.old || ""} onChange={(e) => set({ old: +e.target.value })} /></div>
                </Field>
              </div>
              {total > 0 && (
                <div className="ad-add">
                  <button type="button" onClick={() => set({ old: total })}><AdIcon n="wand" />Regular = parts total ({tk(total)})</button>
                  <button type="button" onClick={() => set({ price: Math.round((total * 0.92) / 500) * 500, old: total })}><AdIcon n="tag" />Price at 8% off</button>
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className="ad-aside">
          <Card title="Publish" actions={mode && <SourceTag mode={mode} />}>
            <div className="ad-fields">
              <Field label="Status" group>
                <Seg options={[["active", "Active"], ["draft", "Draft"]] as const} value={b.status} onChange={(status) => set({ status })} label="Status" />
              </Field>
              <Toggle checked={b.featured} onChange={(featured) => set({ featured })} label="Show on homepage" desc="In the prebuilt & custom PC row." />
              <div className="ad-save">
                {dirty && <span className="ad-dirty">Unsaved changes</span>}
                {errorsCount > 0 && <span className="ad-b no">{errorsCount} compatibility {errorsCount > 1 ? "problems" : "problem"}</span>}
                <button className="btn btn-red" onClick={submit} disabled={busy || (!dirty && !isNew)}>{busy ? "Saving…" : isNew ? "Create PC" : "Save changes"}</button>
                <Link href="/admin/custom-pc" className="btn btn-line">{dirty ? "Discard" : "Back to list"}</Link>
              </div>
            </div>
          </Card>

          <Card title="Card preview"><div className="ad-pc-prev" inert><PcCard id={b.id || "new"} name={b.name} badge={b.badge} colors={b.colors} highlights={b.highlights} price={b.price} old={b.old} /></div></Card>

          <Card title="Compatibility" desc={watts.draw > 50 ? `Estimated draw ${watts.draw}W · recommended PSU ${watts.recommended}W` : "Add parts to check them."}>
            {issues.length ? (
              <ul className="ad-checks">
                {issues.map((c) => <li key={c.msg} className={c.level}><AdIcon n={c.level === "ok" ? "check" : "alert"} />{c.msg}</li>)}
              </ul>
            ) : <p style={{ fontSize: 13, color: "var(--dim)" }}>No checks yet.</p>}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={del}
        tone="danger"
        title="Delete this PC?"
        message={<><b>{base.name}</b> will be removed from the store. This can&apos;t be undone.</>}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDel(false)}
        onConfirm={doDelete}
      />
    </>
  );
}
