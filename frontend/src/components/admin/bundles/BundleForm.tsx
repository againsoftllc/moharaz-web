"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import BundleCard from "@/components/bundles/BundleCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCatalog } from "@/lib/admin/catalog";
import { SLUG_RE, scheduleOf, slugify } from "@/lib/admin/format";
import { useCollection, useSingleton } from "@/lib/admin/hooks";
import { db, priceBundle } from "@/lib/admin/resources";
import { BUNDLE_THEMES, themeOf, type BundleTheme } from "@/lib/admin/themes";
import type { AdminBundle, AdminCategory, AdminProduct } from "@/lib/admin/types";
import { BUNDLE_TYPES, type Bundle, type BundleType } from "@/lib/bundles";
import { tk } from "@/lib/data";
import { catBySlug } from "@/lib/products";
import { AdIcon } from "../icons";
import ProductPicker from "../ProductPicker";
import { useToast } from "../Toast";
import { Card, Empty, Field, PageHead, PickMany, Seg, Skeleton, SourceTag, Toggle, useUnsaved } from "../ui";
import OfferCard from "./OfferCard";
import { SITE_HOST } from "@/lib/site";

const MAX_ITEMS = 6;
const BADGES = ["Best seller", "Limited time", "Hot deal", "New", "Top pick"];
type Slot = { key: number; cat: string; id?: number };
let slotKey = 1;
const mkSlot = (cat: string, id?: number): Slot => ({ key: slotKey++, cat, id });

const blank = (theme: BundleTheme): AdminBundle => ({
  slug: "", name: "", tagline: "", type: theme.type, theme: theme.id, items: [], pct: theme.pct, gifts: [],
  badge: "", startsAt: "", endsAt: "", featured: false, status: "active",
});

export default function BundleEditor({ slug }: { slug?: string }) {
  const cat = useCatalog();
  const bundles = useCollection(db.bundles);
  if (cat.loading || bundles.loading) return <Skeleton rows={10} />;
  const found = slug !== undefined ? bundles.items?.find((b) => b.slug === slug) : undefined;
  if (slug !== undefined && !found) {
    return <div className="ad-card"><Empty icon="gift" title="Bundle not found" text={`There's no bundle “${slug}”.`} action={<Link href="/admin/bundles" className="btn btn-red">Back to bundles</Link>} /></div>;
  }
  return (
    <BundleForm
      key={found?.slug ?? "new"} initial={found ?? blank(BUNDLE_THEMES[0])} isNew={!found}
      all={bundles.items ?? []} save={bundles.save} remove={bundles.remove} mode={bundles.mode}
      products={cat.products.items ?? []} byId={cat.byId} cats={cat.cats} catMap={cat.catMap}
    />
  );
}

type Errors = Partial<Record<"name" | "slug" | "items" | "price" | "dates", string>>;

function BundleForm({ initial, isNew, all, save, remove, mode, products, byId, cats, catMap }: {
  initial: AdminBundle;
  isNew: boolean;
  all: AdminBundle[];
  save: (b: AdminBundle, prev?: string) => Promise<AdminBundle>;
  remove: (slug: string) => Promise<void>;
  mode: "api" | "local" | null;
  products: AdminProduct[];
  byId: Map<number, AdminProduct>;
  cats: AdminCategory[];
  catMap: Map<string, AdminCategory>;
}) {
  const router = useRouter();
  const toast = useToast();
  const rules = useSingleton(db.bundleRules);
  const [base, setBase] = useState(initial);
  const [b, setB] = useState(initial);
  const [slots, setSlots] = useState<Slot[]>(() =>
    isNew ? themeOf(initial.theme).slots.map((c) => mkSlot(c)) : initial.items.map((id) => mkSlot(byId.get(id)?.cat ?? "", id)));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [fixed, setFixed] = useState(initial.price !== undefined);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const [themeOpen, setThemeOpen] = useState(isNew);
  const set = (patch: Partial<AdminBundle>) => setB((x) => ({ ...x, ...patch }));

  const items = slots.map((s) => s.id).filter((id): id is number => id !== undefined);
  const draft: AdminBundle = { ...b, items, price: fixed ? b.price : undefined };
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);
  useUnsaved(dirty && !busy);

  const theme = themeOf(b.theme);
  const money = priceBundle(draft, byId);
  const gifts = (rules.value?.gifts ?? []).filter((g) => b.gifts.includes(g.id));
  const outOfStock = money.items.filter((p) => p.stock === "Out of stock");
  const when = scheduleOf(b.status === "active", b.startsAt, b.endsAt);

  /** switch theme: keep picked items that fit the new slots, append the rest */
  const pickTheme = (t: BundleTheme) => {
    const picked = slots.filter((s) => s.id !== undefined);
    const used = new Set<number>();
    const next = t.slots.map((c) => {
      const hit = picked.find((s) => s.cat === c && !used.has(s.id!));
      if (hit) used.add(hit.id!);
      return mkSlot(c, hit?.id);
    });
    picked.filter((s) => !used.has(s.id!)).forEach((s) => next.push(mkSlot(s.cat, s.id)));
    setSlots(t.id === "blank" && slots.length ? slots : next.length ? next : [mkSlot(""), mkSlot("")]);
    set({ theme: t.id, type: t.type, ...(fixed ? {} : { pct: t.pct }) });
    setThemeOpen(false);
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!b.name.trim()) e.name = "Give the bundle a name.";
    if (!b.slug) e.slug = "Enter a URL slug.";
    else if (!SLUG_RE.test(b.slug)) e.slug = "Use lowercase letters, numbers and single hyphens only.";
    else if (b.slug.startsWith("c-")) e.slug = "Slugs starting with “c-” are reserved for customer-made bundles.";
    else if (all.some((x) => x.slug === b.slug && x.slug !== base.slug)) e.slug = "Another bundle already uses this slug.";
    if (items.length < 2) e.items = "A bundle needs at least 2 products.";
    if (fixed && !(b.price && b.price > 0 && b.price < money.total)) e.price = `Enter a price below the items total of ${tk(money.total)}.`;
    if (b.startsAt && b.endsAt && b.endsAt <= b.startsAt) e.dates = "The end must be after the start.";
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { toast("Please fix the highlighted fields", "err"); return; }
    setBusy(true);
    try {
      const saved = await save({ ...draft, name: b.name.trim(), tagline: b.tagline.trim() }, isNew ? undefined : base.slug);
      logActivity(`${isNew ? "Created" : "Updated"} bundle “${saved.name}”`, `/admin/bundles/${saved.slug}`);
      toast(isNew ? "Bundle created" : "Changes saved");
      setBase(saved);
      setB(saved);
      if (isNew || saved.slug !== base.slug) router.replace(`/admin/bundles/${saved.slug}`);
    } catch (err) {
      toast(errorText(err), "err");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await remove(base.slug);
      logActivity(`Deleted bundle “${base.name}”`, "/admin/bundles");
      toast("Bundle deleted");
      router.push("/admin/bundles");
    } catch (err) {
      toast(errorText(err), "err");
      setBusy(false);
      setDel(false);
    }
  };

  // storefront card preview (needs a known category for stand-in art when a product has no photo)
  const card: Bundle | null = money.items.length >= 2 && money.items.every((p) => p.image || catBySlug(p.cat))
    ? { slug: b.slug || "preview", name: b.name || "Bundle name", tagline: b.tagline, type: b.type, items: money.items, total: money.total, price: money.price, save: money.save, pct: money.pct, stock: outOfStock.length ? "Out of stock" : "In stock" }
    : null;

  const usedCats = useMemo(() => cats.filter((c) => c.status === "active"), [cats]);

  return (
    <>
      <PageHead
        crumbs={[["Bundle Offers", "/admin/bundles"], [isNew ? "New bundle" : "Edit"]]}
        title={isNew ? "New bundle offer" : base.name}
        desc={isNew ? "Start from a theme — it sets the kinds of products, a suggested discount and the offer's colours. You can change everything afterwards." : undefined}
        actions={!isNew && (
          <>
            <a href={`/bundles/${base.slug}`} target="_blank" rel="noreferrer" className="btn btn-line"><AdIcon n="eye" />View in store</a>
            <button className="btn btn-line ad-del" onClick={() => setDel(true)}><AdIcon n="trash" />Delete</button>
          </>
        )}
      />

      <div className="ad-form">
        <div className="ad-stack">
          <Card
            title={themeOpen ? "1. Choose a theme" : <>Theme: {theme.name}</>}
            desc={themeOpen ? "Pick what kind of bundle you're making." : theme.blurb}
            actions={!themeOpen && <button className="btn btn-line ad-sm" onClick={() => setThemeOpen(true)}>Change theme</button>}
          >
            {themeOpen && (
              <div className="ad-themes" role="radiogroup" aria-label="Bundle theme">
                {BUNDLE_THEMES.map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={t.id === b.theme} className={`ad-theme ${t.id === b.theme ? "on" : ""}`} onClick={() => pickTheme(t)}>
                    <span className="ad-theme-art" style={{ background: `linear-gradient(130deg,${t.from},${t.to})` }}>
                      {t.slots.length ? t.slots.map((c, i) => {
                        const k = catMap.get(c);
                        return <span key={c + i}>{k ? <Icon k={k.icon} /> : "?"}</span>;
                      }) : <em>+ any products</em>}
                    </span>
                    <b>{t.name}</b>
                    <small>{t.blurb}</small>
                    <span className="ad-b plain">{t.type} · {t.pct}% off</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title={isNew ? "2. Details" : "Details"}>
            <div className="ad-fields">
              <div className="ad-g2">
                <Field label="Bundle name" error={errors.name}>
                  <input value={b.name} onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} placeholder={`e.g. ${theme.id === "gaming-core" ? "AMD Ryzen 5 Gaming Combo" : `${theme.name} Combo`}`} />
                </Field>
                <Field label="URL slug" error={errors.slug} hint={`${SITE_HOST}/bundles/${b.slug || "…"}`}>
                  <div className="ad-pre"><span>/bundles/</span><input value={b.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }); }} placeholder="auto from name" /></div>
                </Field>
              </div>
              <Field label="Tagline" hint="One sentence on why these parts belong together." count={b.tagline.length} max={140}>
                <input value={b.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder={theme.blurb} />
              </Field>
              <div className="ad-g2">
                <Field label="Bundle type" group hint="The filter tab it appears under on /bundles.">
                  <Seg options={BUNDLE_TYPES} value={b.type} onChange={(type: BundleType) => set({ type })} label="Bundle type" />
                </Field>
                <Field label="Badge" optional hint="Short label on the offer, e.g. “Limited time”.">
                  <input list="ad-badges" value={b.badge} onChange={(e) => set({ badge: e.target.value })} maxLength={20} />
                  <datalist id="ad-badges">{BADGES.map((x) => <option key={x} value={x} />)}</datalist>
                </Field>
              </div>
            </div>
          </Card>

          <Card title={isNew ? "3. Products" : "Products"} desc="Choose one product per slot. Change a slot's category to swap what kind of part goes there.">
            <div className="ad-slots">
              {slots.map((s, i) => (
                <div key={s.key} className="ad-slot">
                  <span className="ad-n">{i + 1}</span>
                  <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0,1fr)", gap: 8 }}>
                    <select className="ad-in" value={s.cat} aria-label={`Slot ${i + 1} category`} onChange={(e) => setSlots(slots.map((x) => (x.key === s.key ? { ...x, cat: e.target.value, id: undefined } : x)))}>
                      <option value="">Any category</option>
                      {usedCats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                    <ProductPicker
                      products={products} catMap={catMap} value={s.id}
                      filter={s.cat ? (p) => p.cat === s.cat : undefined}
                      exclude={items}
                      placeholder={s.cat ? `Choose a ${catMap.get(s.cat)?.name.toLowerCase() ?? "product"}` : "Choose any product"}
                      onChange={(id) => setSlots(slots.map((x) => (x.key === s.key ? { ...x, id, cat: x.cat || (id ? byId.get(id)?.cat ?? "" : "") } : x)))}
                    />
                  </div>
                  <button type="button" className="ad-ib ad-del" disabled={slots.length <= 2} onClick={() => setSlots(slots.filter((x) => x.key !== s.key))} aria-label={`Remove slot ${i + 1}`}><AdIcon n="x" /></button>
                </div>
              ))}
              {slots.length < MAX_ITEMS && <div className="ad-add"><button type="button" onClick={() => setSlots([...slots, mkSlot("")])}><AdIcon n="plus" />Add another product</button></div>}
              {errors.items && <small style={{ color: "var(--red)", fontSize: 12, fontWeight: 600 }}>{errors.items}</small>}
              {outOfStock.length > 0 && <div className="ad-warn"><AdIcon n="alert" /><span>{outOfStock.map((p) => p.name).join(", ")} {outOfStock.length > 1 ? "are" : "is"} out of stock, so the bundle will show as out of stock.</span></div>}
            </div>
          </Card>

          <Card title={isNew ? "4. Pricing & gifts" : "Pricing & gifts"}>
            <div className="ad-fields">
              <Seg options={[["pct", "Percentage off"], ["fixed", "Fixed bundle price"]] as const} value={fixed ? "fixed" : "pct"} onChange={(v) => { setFixed(v === "fixed"); if (v === "fixed" && !b.price) set({ price: money.price }); }} label="Pricing" />
              {fixed ? (
                <Field label="Bundle price" error={errors.price}>
                  <div className="ad-pre"><span>৳</span><input type="number" min={0} step={100} value={b.price ?? ""} onChange={(e) => set({ price: e.target.value ? +e.target.value : undefined })} /></div>
                </Field>
              ) : (
                <Field label="Discount" hint={`Theme suggests ${theme.pct}%. Rounded to the nearest ৳100.`}>
                  <div className="ad-range">
                    <input type="range" min={0} max={40} value={b.pct} onChange={(e) => set({ pct: +e.target.value })} aria-label="Discount percent" />
                    <output>{b.pct}%</output>
                  </div>
                </Field>
              )}
              <div className="ad-sum">
                <div><span>{money.items.length} items bought separately</span><b>{tk(money.total)}</b></div>
                <div className="disc"><span>Customer saves</span><b>−{tk(Math.max(0, money.save))} ({money.pct}%)</b></div>
                <div className="tot"><span>Bundle price</span><b>{tk(money.price)}</b></div>
              </div>
              <Field label="Free gifts" group optional hint={rules.value ? "Given with every order of this bundle. Manage the gift list under Create-your-own rules." : "Loading gifts…"}>
                {rules.value && <PickMany options={rules.value.gifts.map((g) => g.id)} value={b.gifts} onChange={(g) => set({ gifts: g })} render={(id) => { const g = rules.value!.gifts.find((x) => x.id === id)!; return <>{g.name} <small style={{ opacity: .7 }}>{tk(g.value)}</small></>; }} />}
              </Field>
            </div>
          </Card>

          <Card title={isNew ? "5. Schedule" : "Schedule"} desc="Leave empty to run the offer until you turn it off.">
            <div className="ad-g2">
              <Field label="Starts" optional><input type="datetime-local" value={b.startsAt} onChange={(e) => set({ startsAt: e.target.value })} /></Field>
              <Field label="Ends" optional error={errors.dates}><input type="datetime-local" value={b.endsAt} min={b.startsAt || undefined} onChange={(e) => set({ endsAt: e.target.value })} /></Field>
            </div>
          </Card>
        </div>

        <aside className="ad-aside">
          <Card title="Publish" actions={mode && <SourceTag mode={mode} />}>
            <div className="ad-fields">
              <Field label="Status" group>
                <Seg options={[["active", "Active"], ["draft", "Draft"]] as const} value={b.status} onChange={(status) => set({ status })} label="Status" />
              </Field>
              {b.status === "active" && when !== "live" && <span className={`ad-b ${when === "ended" ? "no" : "warn"}`}>{when === "scheduled" ? "Scheduled — not live yet" : "Ended — no longer shown"}</span>}
              <Toggle checked={b.featured} onChange={(featured) => set({ featured })} label="Feature on homepage" desc="In the “Combo Deals” row." />
              <div className="ad-save">
                {dirty && <span className="ad-dirty">Unsaved changes</span>}
                <button className="btn btn-red" onClick={submit} disabled={busy || (!dirty && !isNew)}>{busy ? "Saving…" : isNew ? "Create bundle" : "Save changes"}</button>
                <Link href="/admin/bundles" className="btn btn-line">{dirty ? "Discard" : "Back to list"}</Link>
              </div>
            </div>
          </Card>

          <Card title="Offer preview" desc={`${theme.name} theme`}>
            <OfferCard theme={theme} name={b.name} tagline={b.tagline} badge={b.badge} items={money.items} catMap={catMap} total={money.total} price={money.price} pct={money.pct} gifts={gifts} />
          </Card>

          {card && (
            <Card title="In “Combo Deals”" desc="The storefront's bundle card.">
              <div inert><BundleCard b={card} /></div>
            </Card>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={del}
        tone="danger"
        title="Delete this bundle?"
        message={<><b>{base.name}</b> will be removed from the store. This can&apos;t be undone.</>}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDel(false)}
        onConfirm={doDelete}
      />
    </>
  );
}
