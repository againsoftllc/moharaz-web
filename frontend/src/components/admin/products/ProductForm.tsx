"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import ProductCard from "@/components/shop/ProductCard";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCatalog } from "@/lib/admin/catalog";
import { RESERVED_SLUGS, SLUG_RE, slugify } from "@/lib/admin/format";
import type { AdminCategory, AdminProduct } from "@/lib/admin/types";
import { EMI_MIN } from "@/lib/checkout";
import { specRows } from "@/lib/compare";
import { tk } from "@/lib/data";
import { highlights as autoHighlights, summary as autoSummary } from "@/lib/productInfo";
import { catBySlug, type Condition, type Stock } from "@/lib/products";
import { AdIcon } from "../icons";
import { useToast } from "../Toast";
import { Card, Chips, Empty, Field, GalleryField, ImageField, PageHead, Seg, SeoFields, Skeleton, SourceTag, Toggle, useUnsaved } from "../ui";
import { SITE_HOST } from "@/lib/site";

const WARRANTIES = ["3 years official brand warranty", "2 years official brand warranty", "1 year official brand warranty", "6 months store warranty", "Lifetime license (non-refundable once activated)", "No warranty"];
const CONDITIONS: Condition[] = ["New", "Open Box", "Refurbished"];
const STOCKS: Stock[] = ["In stock", "Pre-order", "Out of stock"];
const OFFER_LABELS = ["Flash Sale", "Hot Deal", "Mega Offer", "Weekend Deal"];

const blank = (cat: string, nextId: number): AdminProduct => ({
  id: 0, slug: "", name: "", cat, brand: "", spec: "", price: 0, condition: "New", stock: "In stock", group: "", variant: "",
  sku: `UT-${String(nextId).padStart(5, "0")}`, qty: 0, gallery: [], overview: "", features: [], specs: [], warranty: WARRANTIES[2],
  inBox: "", tags: [], emi: true, featured: false, status: "active", seoTitle: "", seoDescription: "",
});

/** Loads the catalogue, then the form for one product (id) or a new one (optionally copied from `from`). */
export default function ProductEditor({ id, from }: { id?: number; from?: number }) {
  const { products, cats, catMap, loading } = useCatalog();
  if (loading) return <Skeleton rows={12} />;
  const list = products.items ?? [];
  const nextId = Math.max(0, ...list.map((p) => p.id)) + 1;
  const found = id !== undefined ? list.find((p) => p.id === id) : undefined;

  if (id !== undefined && !found) {
    return <div className="ad-card"><Empty title="Product not found" text={`There's no product with id ${id}.`} action={<Link href="/admin/products" className="btn btn-red">Back to products</Link>} /></div>;
  }
  const copy = from !== undefined ? list.find((p) => p.id === from) : undefined;
  const initial = found ?? (copy
    ? { ...copy, id: 0, name: `${copy.name} (copy)`, slug: "", sku: `UT-${String(nextId).padStart(5, "0")}`, status: "draft" as const }
    : blank(cats[0]?.slug ?? "", nextId));

  return <ProductForm key={found?.id ?? `new-${from ?? ""}`} initial={initial} isNew={!found} all={list} cats={cats} catMap={catMap} save={products.save} remove={products.remove} mode={products.mode} />;
}

/** option name → value rows; kept as rows while editing so a half-typed name can't merge into another option */
function OptionRows({ value, onChange, names }: { value?: Record<string, string>; onChange: (v?: Record<string, string>) => void; names: string[] }) {
  const [rows, setRows] = useState<[string, string][]>(() => Object.entries(value ?? {}));
  const update = (next: [string, string][]) => {
    setRows(next);
    const kept = next.map(([k, v]) => [k.trim(), v.trim()]).filter(([k, v]) => k && v);
    onChange(kept.length ? Object.fromEntries(kept) : undefined);
  };
  const edit = (i: number, at: 0 | 1, text: string) => update(rows.map((r, j) => (j !== i ? r : at === 0 ? [text, r[1]] : [r[0], text])));
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr) auto", gap: 8 }}>
          <input className="ad-in" list="ad-option-names" value={k} onChange={(e) => edit(i, 0, e.target.value)} placeholder="Option, e.g. Color" aria-label={`Option ${i + 1} name`} />
          <input className="ad-in" value={v} onChange={(e) => edit(i, 1, e.target.value)} placeholder="Value, e.g. Red" aria-label={`Option ${i + 1} value`} />
          <button type="button" className="ad-ib ad-del" onClick={() => update(rows.filter((_, j) => j !== i))} aria-label={`Remove option ${i + 1}`}><AdIcon n="x" /></button>
        </div>
      ))}
      <div className="ad-add">
        <button type="button" onClick={() => setRows([...rows, ["", ""]])}><AdIcon n="plus" />Add option</button>
      </div>
      <datalist id="ad-option-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
    </div>
  );
}

type Errors = Partial<Record<"name" | "slug" | "cat" | "brand" | "price" | "old" | "qty" | "sku" | "offer", string>>;

function ProductForm({ initial, isNew, all, cats, catMap, save, remove, mode }: {
  initial: AdminProduct;
  isNew: boolean;
  all: AdminProduct[];
  cats: AdminCategory[];
  catMap: Map<string, AdminCategory>;
  save: (p: AdminProduct, prevKey?: number) => Promise<AdminProduct>;
  remove: (id: number) => Promise<void>;
  mode: "api" | "local" | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [base, setBase] = useState(initial);
  const [p, setP] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const set = (patch: Partial<AdminProduct>) => setP((x) => ({ ...x, ...patch }));
  const dirty = JSON.stringify(p) !== JSON.stringify(base);
  useUnsaved(dirty && !busy);

  const brands = useMemo(() => [...new Set(all.map((x) => x.brand))].sort(), [all]);
  const groups = useMemo(() => [...new Set(all.filter((x) => x.cat === p.cat).map((x) => x.group))].sort(), [all, p.cat]);
  const siblings = all.filter((x) => p.group && x.group === p.group && x.id !== p.id);
  const optionNames = [...new Set([...siblings.flatMap((s) => Object.keys(s.options ?? {})), "RAM / Storage", "Capacity", "Color"])];
  const highlights = p.spec ? p.spec.split(" · ").filter(Boolean) : [];
  const pct = p.old && p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
  const cat = catMap.get(p.cat);

  const validate = (): Errors => {
    const e: Errors = {};
    if (p.name.trim().length < 3) e.name = "Enter the product name (at least 3 characters).";
    if (!p.slug) e.slug = "Enter a URL slug.";
    else if (!SLUG_RE.test(p.slug)) e.slug = "Use lowercase letters, numbers and single hyphens only.";
    else if (RESERVED_SLUGS.has(p.slug)) e.slug = `“${p.slug}” is already a store page address — pick another slug.`;
    else if (all.some((x) => x.slug === p.slug && x.id !== p.id)) e.slug = "Another product already uses this slug.";
    else if (cats.some((x) => x.slug === p.slug)) e.slug = "A category already uses this address — pick another slug.";
    if (!p.cat) e.cat = "Choose a category.";
    if (!p.brand.trim()) e.brand = "Enter the brand.";
    if (!(p.price > 0)) e.price = "Enter a price above ৳0.";
    if (p.old !== undefined && p.old <= p.price) e.old = "Regular price must be higher than the selling price — or leave it empty.";
    if (!Number.isInteger(p.qty) || p.qty < 0) e.qty = "Quantity must be 0 or more.";
    if (!p.sku.trim()) e.sku = "Enter a SKU.";
    else if (all.some((x) => x.sku === p.sku.trim() && x.id !== p.id)) e.sku = "Another product already uses this SKU.";
    if (p.offer && (!p.offer.label.trim() || !p.offer.endsAt)) e.offer = "Give the promotion a label and an end date — or turn it off.";
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      toast("Please fix the highlighted fields", "err");
      document.querySelector(".ad-f.err")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const final: AdminProduct = { ...p, name: p.name.trim(), brand: p.brand.trim(), sku: p.sku.trim(), group: p.group.trim() || `${p.cat}|${p.name.trim()}`, emi: p.emi && p.price >= EMI_MIN };
    setBusy(true);
    try {
      const saved = await save(final, isNew ? undefined : base.id);
      logActivity(`${isNew ? "Added" : "Updated"} product “${saved.name}”`, `/admin/products/${saved.id}`);
      toast(isNew ? "Product created" : "Changes saved");
      setBase(saved);
      setP(saved);
      if (isNew) router.replace(`/admin/products/${saved.id}`);
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
      logActivity(`Deleted product “${base.name}”`, "/admin/products");
      toast("Product deleted");
      router.push("/admin/products");
    } catch (err) {
      toast(errorText(err), "err");
      setBusy(false);
      setDel(false);
    }
  };

  // the storefront card needs a known category for its stand-in art when there's no photo
  const preview = p.image || catBySlug(p.cat);

  return (
    <>
      <PageHead
        crumbs={[["Products", "/admin/products"], [isNew ? "Add product" : "Edit"]]}
        title={isNew ? "Add product" : base.name}
        desc={isNew ? "Fill in the details shoppers see on the product page. Fields marked optional can be added later." : `${base.sku} · last saved version is live in the ${mode === "api" ? "API" : "local demo"}.`}
        actions={!isNew && (
          <>
            <Link href={`/admin/products/new?from=${base.id}`} className="btn btn-line"><AdIcon n="copy" />Duplicate</Link>
            <button className="btn btn-line ad-del" onClick={() => setDel(true)}><AdIcon n="trash" />Delete</button>
          </>
        )}
      />

      <div className="ad-form">
        <div className="ad-stack">
          <Card title="Basic information">
            <div className="ad-fields">
              <Field label="Product name" error={errors.name} hint="Include the model and key variant, e.g. “MSI GeForce RTX 5060 Ti Ventus 2X 16GB”.">
                <input value={p.name} onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} placeholder="Brand + model + variant" />
              </Field>
              <div className="ad-g2">
                <Field label="Brand" error={errors.brand}>
                  <input list="ad-brands" value={p.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="e.g. ASUS" />
                  <datalist id="ad-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
                </Field>
                <Field label="Category" error={errors.cat}>
                  <select value={p.cat} onChange={(e) => set({ cat: e.target.value })}>
                    {!p.cat && <option value="">Choose…</option>}
                    {cats.map((c) => <option key={c.slug} value={c.slug}>{c.parent ? `— ${c.name}` : c.name}</option>)}
                  </select>
                </Field>
              </div>
              <div className="ad-g2">
                <Field label="URL slug" error={errors.slug} hint={`${SITE_HOST}/${p.slug || "…"}`}>
                  <div className="ad-pre">
                    <span>/</span>
                    <input value={p.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }); }} placeholder="auto from name" />
                  </div>
                </Field>
                <Field label="SKU / product ID" error={errors.sku}>
                  <input value={p.sku} onChange={(e) => set({ sku: e.target.value.toUpperCase() })} />
                </Field>
              </div>
              <Field label="Condition" group>
                <Seg options={CONDITIONS} value={p.condition} onChange={(condition) => set({ condition, warranty: condition === "New" ? p.warranty : WARRANTIES[3] })} label="Condition" />
              </Field>
            </div>
          </Card>

          <Card title="Media" desc="A transparent PNG on a square canvas looks best on cards. The first photo is the main one.">
            <div className="ad-fields">
              <Field label="Main photo" group optional hint="Without a photo the store shows the category icon instead.">
                <ImageField value={p.image} onChange={(image) => set({ image })} size={[800, 800]} maxW={1000} />
              </Field>
              <Field label="More photos" group optional>
                <GalleryField value={p.gallery} onChange={(gallery) => set({ gallery })} />
              </Field>
            </div>
          </Card>

          <Card title="Pricing">
            <div className="ad-fields">
              <div className="ad-g3">
                <Field label="Selling price" error={errors.price}>
                  <div className="ad-pre"><span>৳</span><input type="number" min={0} step={100} value={p.price || ""} onChange={(e) => set({ price: +e.target.value })} placeholder="0" /></div>
                </Field>
                <Field label="Regular price" optional error={errors.old} hint="Shown struck through.">
                  <div className="ad-pre"><span>৳</span><input type="number" min={0} step={100} value={p.old ?? ""} onChange={(e) => set({ old: e.target.value ? +e.target.value : undefined })} placeholder="—" /></div>
                </Field>
                <Field label="Discount" hint={pct ? `Customer saves ${tk((p.old ?? 0) - p.price)}` : "Set a regular price to show one."}>
                  <input value={pct ? `${pct}% off` : "—"} readOnly tabIndex={-1} />
                </Field>
              </div>
              <Toggle
                checked={p.emi && p.price >= EMI_MIN}
                onChange={(emi) => set({ emi })}
                label="Offer 0% EMI"
                desc={p.price >= EMI_MIN ? `From ${tk(Math.round(p.price / 12))}/month over 12 months` : `Only for products from ${tk(EMI_MIN)}`}
              />
              <Toggle
                checked={!!p.offer}
                onChange={(on) => set({ offer: on ? { label: OFFER_LABELS[0], endsAt: "" } : undefined })}
                label="Running promotion"
                desc="Shows a stamp and a countdown on the product."
              />
              {p.offer && (
                <div className="ad-g2">
                  <Field label="Promotion label" error={errors.offer}>
                    <input list="ad-offers" value={p.offer.label} onChange={(e) => set({ offer: { ...p.offer!, label: e.target.value } })} maxLength={24} />
                    <datalist id="ad-offers">{OFFER_LABELS.map((o) => <option key={o} value={o} />)}</datalist>
                  </Field>
                  <Field label="Ends">
                    <input type="datetime-local" value={p.offer.endsAt} onChange={(e) => set({ offer: { ...p.offer!, endsAt: e.target.value } })} />
                  </Field>
                </div>
              )}
            </div>
          </Card>

          <Card title="Inventory">
            <div className="ad-fields">
              <div className="ad-g2">
                <Field label="Availability" group>
                  <Seg options={STOCKS} value={p.stock} onChange={(stock) => set({ stock })} label="Availability" />
                </Field>
                <Field label="Quantity on hand" error={errors.qty}>
                  <input type="number" min={0} step={1} value={p.qty} onChange={(e) => set({ qty: Math.max(0, Math.floor(+e.target.value)) })} />
                </Field>
              </div>
              {p.stock === "In stock" && p.qty === 0 && (
                <div className="ad-warn"><AdIcon n="alert" /><span>Quantity is 0 but the product shows as in stock. <button type="button" className="ad-link" onClick={() => set({ stock: "Out of stock" })}>Mark out of stock</button> or <button type="button" className="ad-link" onClick={() => set({ stock: "Pre-order" })}>pre-order</button>.</span></div>
              )}
            </div>
          </Card>

          <Card title="Variants" desc="Products that only differ by capacity, configuration or colour share a group, so shoppers can switch between them.">
            <div className="ad-fields">
              <div className="ad-g2">
                <Field label="Variant group" optional hint="Pick an existing group to link this product to it.">
                  <input list="ad-groups" value={p.group} onChange={(e) => set({ group: e.target.value })} placeholder={`${p.cat || "category"}|${p.name || "Model name"}`} />
                  <datalist id="ad-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
                </Field>
                <Field label="Variant label" optional hint="e.g. 1TB, 32GB (2x16GB), 16GB RAM 512GB SSD · Silver">
                  <input value={p.variant} onChange={(e) => set({ variant: e.target.value })} />
                </Field>
              </div>
              <Field label="Options" group optional hint="Each option becomes a row of choices on the product page — e.g. RAM / Storage → 8GB / 128GB, Color → Red. Give every product in the group the same option names.">
                <OptionRows value={p.options} onChange={(options) => set({ options })} names={optionNames} />
              </Field>
              {siblings.length > 0 && (
                <div className="ad-pills">
                  <small style={{ fontSize: 12, color: "var(--dim)", alignSelf: "center" }}>In this group:</small>
                  {siblings.map((s) => <Link key={s.id} href={`/admin/products/${s.id}`} className="ad-b plain">{s.variant || s.name}</Link>)}
                </div>
              )}
            </div>
          </Card>

          <Card title="Specifications">
            <div className="ad-fields">
              <Field label="Spec line" group hint="Short specs joined with “ · ” — used for the spec table, filters and comparisons. Press Enter after each one.">
                <Chips value={highlights} onChange={(v) => set({ spec: v.join(" · ") })} placeholder="e.g. 6C/12T, 5.1GHz, AM5" split={/[\n·]/} />
              </Field>
              <Field label="Specification table" group>
                <div style={{ display: "grid", gap: 8 }}>
                  {p.specs.map(([k, v], i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr) auto", gap: 8 }}>
                      <input className="ad-in" value={k} onChange={(e) => set({ specs: p.specs.map((r, j) => (j === i ? [e.target.value, r[1]] : r)) })} placeholder="Label, e.g. Socket" aria-label={`Spec ${i + 1} label`} />
                      <input className="ad-in" value={v} onChange={(e) => set({ specs: p.specs.map((r, j) => (j === i ? [r[0], e.target.value] : r)) })} placeholder="Value, e.g. AM5" aria-label={`Spec ${i + 1} value`} />
                      <button type="button" className="ad-ib ad-del" onClick={() => set({ specs: p.specs.filter((_, j) => j !== i) })} aria-label={`Remove spec ${i + 1}`}><AdIcon n="x" /></button>
                    </div>
                  ))}
                  <div className="ad-add">
                    <button type="button" onClick={() => set({ specs: [...p.specs, ["", ""]] })}><AdIcon n="plus" />Add row</button>
                    {highlights.length > 0 && <button type="button" onClick={() => set({ specs: specRows(p) })}><AdIcon n="wand" />Fill from highlights</button>}
                  </div>
                </div>
              </Field>
            </div>
          </Card>

          <Card title="Description">
            <div className="ad-fields">
              <Field label="Summary" optional hint="One sentence at the top of the product page. Empty = generated from the category." count={(p.summary ?? "").length} max={140}>
                <input value={p.summary ?? ""} onChange={(e) => set({ summary: e.target.value || undefined })} placeholder={autoSummary({ ...p, summary: undefined })} />
              </Field>
              <Field label="Card bullet points" group optional hint={<>Up to 4 key points on product cards — for PCs and laptops, the parts inside. {!p.highlights?.length && <button type="button" className="ad-link" onClick={() => set({ highlights: autoHighlights({ ...p, highlights: undefined }) })}>Start from the suggested ones</button>}</>}>
                <Chips value={p.highlights ?? []} onChange={(v) => set({ highlights: v.length ? v : undefined })} placeholder={autoHighlights({ ...p, highlights: undefined }).join(" · ") || "e.g. Intel Core i5-14400F Processor"} split={/\n/} max={4} />
              </Field>
              <Field label="Overview" optional hint="Shown on the Overview tab of the product page." count={p.overview.length} max={1200}>
                <textarea rows={5} value={p.overview} onChange={(e) => set({ overview: e.target.value })} />
              </Field>
              <Field label="Key features" optional hint="One per line.">
                <textarea rows={4} value={p.features.join("\n")} onChange={(e) => set({ features: e.target.value.split("\n") })} onBlur={() => set({ features: p.features.map((x) => x.trim()).filter(Boolean) })} placeholder={"Real-time ray tracing and AI upscaling\nMulti-fan cooling with 0dB idle mode"} />
              </Field>
              <div className="ad-g2">
                <Field label="Warranty">
                  <input list="ad-warranty" value={p.warranty} onChange={(e) => set({ warranty: e.target.value })} />
                  <datalist id="ad-warranty">{WARRANTIES.map((w) => <option key={w} value={w} />)}</datalist>
                </Field>
                <Field label="In the box" optional>
                  <input value={p.inBox} onChange={(e) => set({ inBox: e.target.value })} placeholder={`${p.name || "Product"}, user manual, warranty card`} />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Search engine listing">
            <SeoFields
              title={p.seoTitle} desc={p.seoDescription} path={`/${p.slug || "…"}`}
              fallbackTitle={`${p.name || "Product name"} Price in Bangladesh`}
              fallbackDesc={p.name ? `Buy ${p.name} at ${tk(p.price)} in Bangladesh. ${p.spec}. ${p.warranty}, 0% EMI and fast delivery.` : ""}
              onTitle={(seoTitle) => set({ seoTitle })} onDesc={(seoDescription) => set({ seoDescription })}
            />
          </Card>
        </div>

        <aside className="ad-aside">
          <Card title="Publish" actions={mode && <SourceTag mode={mode} />}>
            <div className="ad-fields">
              <Field label="Status" group>
                <Seg options={[["active", "Active"], ["draft", "Draft"]] as const} value={p.status} onChange={(status) => set({ status })} label="Status" />
              </Field>
              <Toggle checked={p.featured} onChange={(featured) => set({ featured })} label="Featured product" desc="Promoted in recommendations and deals." />
              <Field label="Tags" group optional hint="Used for search and promotions.">
                <Chips value={p.tags} onChange={(tags) => set({ tags })} placeholder="gaming, rgb…" />
              </Field>
              <div className="ad-save">
                {dirty && <span className="ad-dirty">Unsaved changes</span>}
                <button className="btn btn-red" onClick={submit} disabled={busy || (!dirty && !isNew)}>{busy ? "Saving…" : isNew ? "Create product" : "Save changes"}</button>
                <Link href="/admin/products" className="btn btn-line">{dirty ? "Discard" : "Back to list"}</Link>
              </div>
            </div>
          </Card>

          <Card title="Card preview" desc={cat ? `As it appears in ${cat.name}` : undefined}>
            {preview
              ? <div inert style={{ maxWidth: 280, margin: "0 auto" }}><ProductCard p={{ ...p, name: p.name || "Product name", spec: p.spec || "Highlights appear here" }} /></div>
              : <Empty icon="image" title="No preview yet" text="Add a photo to preview a product in a new category." />}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={del}
        tone="danger"
        title="Delete this product?"
        message={<><b>{base.name}</b> will be removed from the store. This can&apos;t be undone.</>}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDel(false)}
        onConfirm={doDelete}
      />
    </>
  );
}
