"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCatalog } from "@/lib/admin/catalog";
import { scheduleOf } from "@/lib/admin/format";
import { useCollection } from "@/lib/admin/hooks";
import { db, priceBundle } from "@/lib/admin/resources";
import { themeOf } from "@/lib/admin/themes";
import type { AdminBundle } from "@/lib/admin/types";
import { BUNDLE_TYPES, type BundleType } from "@/lib/bundles";
import { AdIcon } from "../icons";
import { useToast } from "../Toast";
import { Empty, ErrorBox, PageHead, Seg, Skeleton } from "../ui";
import BundleRules from "./BundleRules";
import OfferCard from "./OfferCard";

const WHEN = { live: ["ok", "Live"], scheduled: ["warn", "Scheduled"], ended: ["no", "Ended"], off: ["plain", "Draft"] } as const;

export default function BundlesAdmin() {
  const { byId, catMap, loading } = useCatalog();
  const bundles = useCollection(db.bundles);
  const toast = useToast();
  const [tab, setTab] = useState<"offers" | "rules">("offers");
  const [type, setType] = useState<BundleType | "All">("All");
  const [del, setDel] = useState<AdminBundle | null>(null);
  const [busy, setBusy] = useState(false);

  const list = bundles.items ?? [];
  const shown = list.filter((b) => type === "All" || b.type === type);

  const toggle = async (b: AdminBundle, patch: Partial<AdminBundle>, msg: string) => {
    try {
      await bundles.save({ ...b, ...patch }, b.slug);
      logActivity(`${msg} “${b.name}”`, `/admin/bundles/${b.slug}`);
      toast(`${msg} ${b.name}`);
    } catch (e) { toast(errorText(e), "err"); }
  };

  const confirm = async () => {
    if (!del) return;
    setBusy(true);
    try {
      await bundles.remove(del.slug);
      logActivity(`Deleted bundle “${del.name}”`, "/admin/bundles");
      toast("Bundle deleted");
    } catch (e) { toast(errorText(e), "err"); } finally { setBusy(false); setDel(null); }
  };

  return (
    <>
      <PageHead
        title="Bundle Offers"
        mode={tab === "offers" ? bundles.mode : null}
        desc="Curated combos shown on /bundles and the homepage, plus the rules for bundles customers build themselves."
        actions={<Link href="/admin/bundles/new" className="btn btn-red"><AdIcon n="plus" />New bundle</Link>}
      />

      <div className="ad-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "offers"} className={tab === "offers" ? "on" : ""} onClick={() => setTab("offers")}>Curated bundles <em>{list.length}</em></button>
        <button role="tab" aria-selected={tab === "rules"} className={tab === "rules" ? "on" : ""} onClick={() => setTab("rules")}>Create-your-own rules &amp; gifts</button>
      </div>

      {tab === "rules" ? <BundleRules /> : (
        <>
          {bundles.error && <ErrorBox message={bundles.error} onRetry={bundles.reload} />}
          <div className="ad-tools">
            <Seg
              label="Bundle type" value={type} onChange={setType}
              options={(["All", ...BUNDLE_TYPES] as const).map((t) => [t, <>{t} <em>{t === "All" ? list.length : list.filter((b) => b.type === t).length}</em></>] as const)}
            />
          </div>

          {loading || bundles.loading ? <Skeleton rows={8} /> : !shown.length ? (
            <div className="ad-card"><Empty icon="gift" title={list.length ? "No bundles of this type" : "No bundle offers yet"} text="Pick a theme and a few products — the discount and preview are worked out for you." action={<Link href="/admin/bundles/new" className="btn btn-red">Create a bundle</Link>} /></div>
          ) : (
            <div className="ad-bgrid">
              {shown.map((b) => {
                const m = priceBundle(b, byId);
                const [tone, label] = WHEN[scheduleOf(b.status === "active", b.startsAt, b.endsAt)];
                const missing = b.items.length - m.items.length;
                return (
                  <article key={b.slug} className="ad-bcard">
                    <Link href={`/admin/bundles/${b.slug}`} aria-label={`Edit ${b.name}`}>
                      <OfferCard theme={themeOf(b.theme)} name={b.name} tagline="" badge={b.badge} items={m.items} catMap={catMap} total={m.total} price={m.price} pct={m.pct} />
                    </Link>
                    <div className="ad-bcard-f">
                      <span>
                        <span className={`ad-b ${tone}`}>{label}</span>
                        <span className="ad-b plain">{b.type}</span>
                        {b.featured && <span className="ad-b warn plain">★ Homepage</span>}
                        {missing > 0 && <span className="ad-b no plain" title="Some products were deleted">{missing} missing</span>}
                      </span>
                      <button className="ad-ib" onClick={() => toggle(b, { featured: !b.featured }, b.featured ? "Removed from homepage:" : "Featured on homepage:")} aria-label={b.featured ? "Remove from homepage" : "Feature on homepage"} title={b.featured ? "Remove from homepage" : "Feature on homepage"}><AdIcon n="star" /></button>
                      <button className="ad-ib" onClick={() => toggle(b, { status: b.status === "active" ? "draft" : "active" }, b.status === "active" ? "Paused" : "Activated")} aria-label={b.status === "active" ? "Pause" : "Activate"} title={b.status === "active" ? "Pause (set to draft)" : "Activate"}><AdIcon n={b.status === "active" ? "pause" : "play"} /></button>
                      <Link className="ad-ib" href={`/admin/bundles/${b.slug}`} aria-label={`Edit ${b.name}`} title="Edit"><AdIcon n="edit" /></Link>
                      <button className="ad-ib ad-del" onClick={() => setDel(b)} aria-label={`Delete ${b.name}`} title="Delete"><AdIcon n="trash" /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!del}
        tone="danger"
        title="Delete this bundle?"
        message={<><b>{del?.name}</b> will be removed from the store. This can&apos;t be undone.</>}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDel(null)}
        onConfirm={confirm}
      />
    </>
  );
}
