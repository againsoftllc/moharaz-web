"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCatalog } from "@/lib/admin/catalog";
import { RESERVED_SLUGS, SLUG_RE, bannersOf, slugify } from "@/lib/admin/format";
import type { AdminCategory, AdminProduct, CategoryBannerImg } from "@/lib/admin/types";
import { ic } from "@/lib/data";
import { AdIcon } from "../icons";
import { useToast } from "../Toast";
import { Card, ColorField, Empty, Field, IconPicker, ImageField, Note, Order, PageHead, PickMany, Seg, SeoFields, Skeleton, SourceTag, Toggle, useUnsaved } from "../ui";
import { SITE_HOST } from "@/lib/site";

const blank = (order: number): AdminCategory => ({
  slug: "", name: "", icon: "tool", color: "#E3121B", parent: "", description: "", banners: [], goesWith: [],
  showInMenu: true, featured: false, order, status: "active", seoTitle: "", seoDescription: "",
});

export default function CategoryEditor({ slug }: { slug?: string }) {
  const { products, categories, cats, loading } = useCatalog();
  if (loading) return <Skeleton rows={10} />;
  const found = slug !== undefined ? cats.find((c) => c.slug === slug) : undefined;
  if (slug !== undefined && !found) {
    return <div className="ad-card"><Empty icon="tag" title="Category not found" text={`There's no category “${slug}”.`} action={<Link href="/admin/categories" className="btn btn-red">Back to categories</Link>} /></div>;
  }
  // older saves keep a single `banner`; edit (and save) it as the first of `banners`
  const initial = found ? { ...found, banners: bannersOf(found), banner: undefined } : blank(cats.length + 1);
  return (
    <CategoryForm
      key={found?.slug ?? "new"} initial={initial} isNew={!found} cats={cats}
      products={products.items ?? []} saveProduct={products.save} save={categories.save} mode={categories.mode}
    />
  );
}

type Errors = Partial<Record<"name" | "slug" | "parent", string>>;

function CategoryForm({ initial, isNew, cats, products, saveProduct, save, mode }: {
  initial: AdminCategory;
  isNew: boolean;
  cats: AdminCategory[];
  products: AdminProduct[];
  saveProduct: (p: AdminProduct, prev?: number) => Promise<AdminProduct>;
  save: (c: AdminCategory, prev?: string) => Promise<AdminCategory>;
  mode: "api" | "local" | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [base, setBase] = useState(initial);
  const [c, setC] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const set = (patch: Partial<AdminCategory>) => setC((x) => ({ ...x, ...patch }));
  const dirty = JSON.stringify(c) !== JSON.stringify(base);
  useUnsaved(dirty && !busy);

  const banners = c.banners ?? [];
  const setBanners = (list: CategoryBannerImg[]) => set({ banners: list });
  const patchBanner = (i: number, patch: Partial<CategoryBannerImg>) => setBanners(banners.map((b, k) => (k === i ? { ...b, ...patch } : b)));
  const moveBanner = (i: number, d: -1 | 1) => {
    const next = [...banners];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setBanners(next);
  };

  const inCat = products.filter((p) => p.cat === base.slug);
  const others = cats.filter((x) => x.slug !== base.slug);
  // a category can't sit under itself or one of its own children
  const descendants = (s: string): string[] => cats.filter((x) => x.parent === s).flatMap((x) => [x.slug, ...descendants(x.slug)]);
  const parents = others.filter((x) => !descendants(base.slug).includes(x.slug));
  const slugChanged = !isNew && c.slug !== base.slug;

  const validate = (): Errors => {
    const e: Errors = {};
    if (!c.name.trim()) e.name = "Enter a category name.";
    if (!c.slug) e.slug = "Enter a URL slug.";
    else if (!SLUG_RE.test(c.slug)) e.slug = "Use lowercase letters, numbers and single hyphens only.";
    else if (c.slug === "all") e.slug = "“all” is reserved for the All Products page.";
    else if (RESERVED_SLUGS.has(c.slug)) e.slug = `“${c.slug}” is already a store page address — pick another slug.`;
    else if (others.some((x) => x.slug === c.slug)) e.slug = "Another category already uses this slug.";
    else if (products.some((x) => x.slug === c.slug)) e.slug = "A product already uses this address — pick another slug.";
    return e;
  };

  const submit = async (confirmed = false) => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { toast("Please fix the highlighted fields", "err"); return; }
    if (slugChanged && inCat.length && !confirmed) { setRenaming(true); return; }
    setRenaming(false);
    setBusy(true);
    try {
      const saved = await save({ ...c, name: c.name.trim() }, isNew ? undefined : base.slug);
      // the API moves products itself; the browser copy needs it done here
      if (slugChanged && mode === "local") {
        await Promise.all(inCat.map((p) => saveProduct({ ...p, cat: saved.slug, group: p.group.replace(`${base.slug}|`, `${saved.slug}|`) }, p.id)));
        await Promise.all(cats.filter((x) => x.parent === base.slug).map((x) => save({ ...x, parent: saved.slug }, x.slug)));
      }
      logActivity(`${isNew ? "Added" : "Updated"} category “${saved.name}”`, `/admin/categories/${saved.slug}`);
      toast(isNew ? "Category created" : "Changes saved");
      setBase(saved);
      setC(saved);
      if (isNew || slugChanged) router.replace(`/admin/categories/${saved.slug}`);
    } catch (err) {
      toast(errorText(err), "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        crumbs={[["Categories", "/admin/categories"], [isNew ? "Add category" : "Edit"]]}
        title={isNew ? "Add category" : base.name}
        desc={isNew ? "Create a new place in the catalogue for products." : <>{inCat.length} products · <Link className="ad-link" href={`/admin/products?cat=${base.slug}`}>view products</Link></>}
        actions={!isNew && <a href={`/${base.slug}`} target="_blank" rel="noreferrer" className="btn btn-line"><AdIcon n="eye" />View in store</a>}
      />

      <div className="ad-form">
        <div className="ad-stack">
          <Card title="Details">
            <div className="ad-fields">
              <div className="ad-g2">
                <Field label="Name" error={errors.name}>
                  <input value={c.name} onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} placeholder="e.g. Gaming Chair" />
                </Field>
                <Field label="URL slug" error={errors.slug} hint={slugChanged ? "Changing the slug changes the page address — old links will stop working." : `${SITE_HOST}/${c.slug || "…"}`}>
                  <div className="ad-pre">
                    <span>/</span>
                    <input value={c.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }); }} placeholder="auto from name" />
                  </div>
                </Field>
              </div>
              <Field label="Parent category" optional hint="Leave as top level, or nest it under another category in menus and breadcrumbs.">
                <select value={c.parent} onChange={(e) => set({ parent: e.target.value })}>
                  <option value="">— Top level —</option>
                  {parents.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
                </select>
              </Field>
              <Field label="Description" optional hint="A short intro shown at the top of the category page." count={c.description.length} max={300}>
                <textarea rows={3} value={c.description} onChange={(e) => set({ description: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Category banners" desc="The promo strip on this category's page and its product pages. Add two or more and they rotate as a carousel. Categories without one show the default banner.">
            <div className="ad-fields">
              {banners.map((b, i) => (
                <div key={`${i}-${b.src}`} className="ad-cban">
                  {banners.length > 1 && (
                    <div className="ad-cban-h">
                      <b>Banner {i + 1}</b>
                      {i === 0 && <span className="ad-b plain">Shows first</span>}
                      <Order i={i} n={banners.length} onMove={(d) => moveBanner(i, d)} label={`banner ${i + 1}`} />
                    </div>
                  )}
                  <ImageField value={b.src} onChange={(src) => (src ? patchBanner(i, { src }) : setBanners(banners.filter((_, k) => k !== i)))} size={[1456, 180]} maxW={1456} />
                  <div className="ad-g2">
                    <Field label="Alt text" hint="Describe the banner for screen readers and search engines.">
                      <input value={b.alt} onChange={(e) => patchBanner(i, { alt: e.target.value })} placeholder="e.g. RTX 50 Series — free game with select cards" />
                    </Field>
                    <Field label="Link" optional hint="Where a click on the banner goes. Empty = this category.">
                      <input value={b.href ?? ""} onChange={(e) => patchBanner(i, { href: e.target.value || undefined })} placeholder={`/${c.slug || "…"}`} />
                    </Field>
                  </div>
                </div>
              ))}
              {banners.length > 0 && <small className="ad-cban-add">Add another banner — two or more rotate as a carousel</small>}
              <ImageField key={banners.length} onChange={(src) => src && setBanners([...banners, { src, alt: "" }])} size={[1456, 180]} maxW={1456} />
            </div>
          </Card>

          <Card title="Icon & colour" desc="Used on the homepage category grid, the menus, and as the stand-in art for products without a photo.">
            <div className="ad-fields">
              <Field label="Icon" group><IconPicker value={c.icon} onChange={(icon) => set({ icon })} /></Field>
              <Field label="Colour" group><ColorField value={c.color} onChange={(color) => set({ color })} /></Field>
            </div>
          </Card>

          <Card title="Bought together" desc="Categories suggested under “Customers also bought” on this category's products.">
            <PickMany options={others.map((x) => x.slug)} value={c.goesWith.filter((s) => others.some((x) => x.slug === s))} onChange={(goesWith) => set({ goesWith })} render={(s) => others.find((x) => x.slug === s)?.name ?? s} />
          </Card>

          <Card title="Search engine listing">
            <SeoFields
              title={c.seoTitle} desc={c.seoDescription} path={`/${c.slug || "…"}`}
              fallbackTitle={`${c.name || "Category"} Price in Bangladesh`}
              fallbackDesc={c.name ? `Buy genuine ${c.name.toLowerCase()} at the best price in Bangladesh. Official warranty, 0% EMI on 29 banks, fast delivery.` : ""}
              onTitle={(seoTitle) => set({ seoTitle })} onDesc={(seoDescription) => set({ seoDescription })}
            />
          </Card>
        </div>

        <aside className="ad-aside">
          <Card title="Visibility" actions={mode && <SourceTag mode={mode} />}>
            <div className="ad-fields">
              <Field label="Status" group>
                <Seg options={[["active", "Active"], ["hidden", "Hidden"]] as const} value={c.status} onChange={(status) => set({ status })} label="Status" />
              </Field>
              <Toggle checked={c.showInMenu} onChange={(showInMenu) => set({ showInMenu })} label="Show in menus" desc="Header mega-menu and mobile menu." />
              <Toggle checked={c.featured} onChange={(featured) => set({ featured })} label="Show on homepage" desc="In the “Shop by Category” grid." />
              <Field label="Sort order" hint="Lower numbers come first.">
                <input type="number" min={1} value={c.order} onChange={(e) => set({ order: Math.max(1, +e.target.value || 1) })} />
              </Field>
              <div className="ad-save">
                {dirty && <span className="ad-dirty">Unsaved changes</span>}
                <button className="btn btn-red" onClick={() => submit()} disabled={busy || (!dirty && !isNew)}>{busy ? "Saving…" : isNew ? "Create category" : "Save changes"}</button>
                <Link href="/admin/categories" className="btn btn-line">{dirty ? "Discard" : "Back to list"}</Link>
              </div>
            </div>
          </Card>

          <Card title="Preview">
            <div style={{ display: "grid", gap: 16 }}>
              <div className="cat" style={{ maxWidth: 180, margin: "0 auto", pointerEvents: "none" }}>
                <div className="ic"><Icon k={c.icon} /></div><b>{c.name || "Category"}</b><span>{inCat.length} products</span>
              </div>
              <div className="ad-th" style={{ width: 120, height: 120, margin: "0 auto", borderRadius: 12, background: `radial-gradient(circle at 50% 55%,color-mix(in srgb,${c.color} 22%,transparent),transparent 70%)`, color: c.color }}>
                <svg viewBox="0 0 24 24" style={{ width: 60, height: 60, strokeWidth: 1.1 }} dangerouslySetInnerHTML={{ __html: ic[c.icon] }} />
              </div>
              <small style={{ textAlign: "center", fontSize: 12, color: "var(--dim)" }}>Homepage tile · product placeholder art</small>
            </div>
          </Card>
          {!isNew && mode === "api" && slugChanged && <Note>The server is expected to move this category&apos;s products to the new slug.</Note>}
        </aside>
      </div>

      <ConfirmDialog
        open={renaming}
        title="Change the category URL?"
        message={<>{inCat.length} products will move from <b>/{base.slug}</b> to <b>/{c.slug}</b>. Links to the old address will stop working.</>}
        confirmLabel="Change URL"
        onCancel={() => setRenaming(false)}
        onConfirm={() => submit(true)}
      />
    </>
  );
}
