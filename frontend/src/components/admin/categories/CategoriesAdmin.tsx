"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCatalog } from "@/lib/admin/catalog";
import { bannersOf } from "@/lib/admin/format";
import type { AdminCategory } from "@/lib/admin/types";
import { AdIcon } from "../icons";
import { useToast } from "../Toast";
import { Empty, ErrorBox, PageHead, Seg, Skeleton } from "../ui";

type Show = "all" | "active" | "hidden" | "no-banner";

export default function CategoriesAdmin() {
  const { products, categories, cats, catMap } = useCatalog();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [show, setShow] = useState<Show>("all");
  const [del, setDel] = useState<AdminCategory | null>(null);
  const [busy, setBusy] = useState(false);

  const count = useMemo(() => {
    const m = new Map<string, number>();
    (products.items ?? []).forEach((p) => m.set(p.cat, (m.get(p.cat) ?? 0) + 1));
    return m;
  }, [products.items]);

  const shown = cats.filter((c) =>
    (show === "all" || (show === "no-banner" ? !bannersOf(c).length : c.status === show)) &&
    `${c.name} ${c.slug}`.toLowerCase().includes(q.trim().toLowerCase()));

  const n = del ? count.get(del.slug) ?? 0 : 0;
  const kids = del ? cats.filter((c) => c.parent === del.slug) : [];
  const blocked = n > 0 || kids.length > 0;

  const confirm = async () => {
    if (!del) return;
    setBusy(true);
    try {
      if (blocked) {
        await categories.save({ ...del, status: "hidden" }, del.slug);
        logActivity(`Hid category “${del.name}”`, `/admin/categories/${del.slug}`);
        toast(`${del.name} is now hidden from the store`);
      } else {
        await categories.remove(del.slug);
        logActivity(`Deleted category “${del.name}”`, "/admin/categories");
        toast("Category deleted");
      }
    } catch (e) { toast(errorText(e), "err"); } finally { setBusy(false); setDel(null); }
  };

  const counts: Record<Show, number> = {
    all: cats.length,
    active: cats.filter((c) => c.status === "active").length,
    hidden: cats.filter((c) => c.status === "hidden").length,
    "no-banner": cats.filter((c) => !bannersOf(c).length).length,
  };

  return (
    <>
      <PageHead
        title="Categories"
        mode={categories.mode}
        desc="Organise the catalogue, set each category's banner, icon and URL, and choose what appears in the menu and on the homepage."
        actions={<Link href="/admin/categories/new" className="btn btn-red"><AdIcon n="plus" />Add category</Link>}
      />
      {categories.error && <ErrorBox message={categories.error} onRetry={categories.reload} />}

      <div className="ad-tools">
        <label className="ad-search">
          <AdIcon n="search" />
          <input className="ad-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories" aria-label="Search categories" />
        </label>
        <Seg
          label="Show"
          value={show}
          onChange={setShow}
          options={([["all", "All"], ["active", "Active"], ["hidden", "Hidden"], ["no-banner", "No banner"]] as const).map(([v, l]) => [v, <>{l} <em>{counts[v]}</em></>] as const)}
        />
      </div>

      {categories.loading ? <Skeleton rows={8} /> : !shown.length ? (
        <div className="ad-card"><Empty icon="tag" title={cats.length ? "No categories match" : "No categories yet"} action={!cats.length && <Link href="/admin/categories/new" className="btn btn-red">Add category</Link>} /></div>
      ) : (
        <div className="ad-cats">
          {shown.map((c) => (
            <article key={c.slug} className={`ad-cat ${c.status === "hidden" ? "off" : ""}`}>
              <Link href={`/admin/categories/${c.slug}`} className="ad-cat-ban" aria-label={`Edit ${c.name} banners`}><BannerThumb c={c} /></Link>
              <div className="ad-cat-b">
                <span className="ad-cat-ic" style={{ background: `color-mix(in srgb,${c.color} 16%,transparent)`, color: c.color }}><Icon k={c.icon} /></span>
                <div>
                  <b><Link href={`/admin/categories/${c.slug}`}>{c.name}</Link></b>
                  <small>/{c.slug}{c.parent && ` · in ${catMap.get(c.parent)?.name ?? c.parent}`}</small>
                </div>
                <div className="ad-cat-acts">
                  <a className="ad-ib" href={`/${c.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${c.name} in store`} title="View in store"><AdIcon n="eye" /></a>
                  <Link className="ad-ib" href={`/admin/categories/${c.slug}`} aria-label={`Edit ${c.name}`} title="Edit"><AdIcon n="edit" /></Link>
                  <button className="ad-ib ad-del" onClick={() => setDel(c)} aria-label={`Delete ${c.name}`} title="Delete"><AdIcon n="trash" /></button>
                </div>
              </div>
              <div className="ad-pills ad-cat-f">
                <Link href={`/admin/products?cat=${c.slug}`} className="ad-b plain">{count.get(c.slug) ?? 0} products</Link>
                {c.status === "hidden" && <span className="ad-b plain">Hidden</span>}
                {c.showInMenu && c.status === "active" && <span className="ad-b blue plain">Menu</span>}
                {c.featured && c.status === "active" && <span className="ad-b warn plain">Homepage</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!del}
        tone={blocked ? "default" : "danger"}
        title={blocked ? `${del?.name} isn't empty` : "Delete this category?"}
        message={blocked
          ? <>It still has {n > 0 && <b>{n} products</b>}{n > 0 && kids.length > 0 && " and "}{kids.length > 0 && <b>{kids.length} sub-categories</b>}. Move them to another category first, or hide this one so shoppers don&apos;t see it.</>
          : <><b>{del?.name}</b> will be removed. This can&apos;t be undone.</>}
        confirmLabel={busy ? "Working…" : blocked ? "Hide category" : "Delete"}
        onCancel={() => setDel(null)}
        onConfirm={confirm}
      />
    </>
  );
}

/** first banner, with a count when there are several (they rotate on the storefront) */
function BannerThumb({ c }: { c: AdminCategory }) {
  const [first, ...rest] = bannersOf(c);
  if (!first) return <>No banner — uses the default</>;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={first.src} alt={first.alt} loading="lazy" />
      {rest.length > 0 && <em>{rest.length + 1} banners · carousel</em>}
    </>
  );
}
