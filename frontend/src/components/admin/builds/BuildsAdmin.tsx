"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCollection } from "@/lib/admin/hooks";
import { db } from "@/lib/admin/resources";
import type { AdminBuild } from "@/lib/admin/types";
import { checks } from "@/lib/builder";
import { AdIcon } from "../icons";
import { useToast } from "../Toast";
import { Empty, ErrorBox, PageHead, Skeleton } from "../ui";
import PcCard from "./PcCard";

export default function BuildsAdmin() {
  const builds = useCollection(db.builds);
  const toast = useToast();
  const [del, setDel] = useState<AdminBuild | null>(null);
  const [busy, setBusy] = useState(false);
  const list = builds.items ?? [];

  const flip = async (b: AdminBuild, patch: Partial<AdminBuild>, msg: string) => {
    try {
      await builds.save({ ...b, ...patch }, b.id);
      logActivity(`${msg} “${b.name}”`, `/admin/custom-pc/${b.id}`);
      toast(`${msg} ${b.name}`);
    } catch (e) { toast(errorText(e), "err"); }
  };

  const confirm = async () => {
    if (!del) return;
    setBusy(true);
    try {
      await builds.remove(del.id);
      logActivity(`Deleted custom PC “${del.name}”`, "/admin/custom-pc");
      toast("Custom PC deleted");
    } catch (e) { toast(errorText(e), "err"); } finally { setBusy(false); setDel(null); }
  };

  return (
    <>
      <PageHead
        title="Custom PCs"
        mode={builds.mode}
        desc="Prebuilt and custom gaming PCs shown on the homepage. Each one is linked to real parts so compatibility and the parts total stay correct."
        actions={<Link href="/admin/custom-pc/new" className="btn btn-red"><AdIcon n="plus" />New PC</Link>}
      />
      {builds.error && <ErrorBox message={builds.error} onRetry={builds.reload} />}

      {builds.loading ? <Skeleton rows={8} /> : !list.length ? (
        <div className="ad-card"><Empty icon="pc" title="No custom PCs yet" text="Pick parts from the catalogue and set a price." action={<Link href="/admin/custom-pc/new" className="btn btn-red">Create a PC</Link>} /></div>
      ) : (
        <div className="ad-bgrid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
          {list.map((b) => {
            const linked = Object.values(b.parts).reduce((s, x) => s + (x?.length ?? 0), 0);
            const bad = checks(b.parts).filter((c) => c.level === "error").length;
            return (
              <div key={b.id} className="ad-bcard" style={{ background: "none", border: 0, gap: 8 }}>
                <Link href={`/admin/custom-pc/${b.id}`} aria-label={`Edit ${b.name}`}>
                  <div inert><PcCard id={b.id} name={b.name} badge={b.badge} colors={b.colors} highlights={b.highlights} price={b.price} old={b.old} /></div>
                </Link>
                <div className="ad-bcard-f" style={{ padding: "0 2px" }}>
                  <span>
                    <span className={`ad-b ${b.status === "active" ? "ok" : "plain"}`}>{b.status === "active" ? "Active" : "Draft"}</span>
                    {b.featured && <span className="ad-b warn plain">★ Homepage</span>}
                    <span className={`ad-b plain ${linked ? "" : "warn"}`} title="Parts linked to the catalogue">{linked} parts</span>
                    {bad > 0 && <span className="ad-b no plain">{bad} issues</span>}
                  </span>
                  <button className="ad-ib" onClick={() => flip(b, { featured: !b.featured }, b.featured ? "Removed from homepage:" : "Featured on homepage:")} aria-label={b.featured ? "Remove from homepage" : "Feature on homepage"} title={b.featured ? "Remove from homepage" : "Feature on homepage"}><AdIcon n="star" /></button>
                  <Link className="ad-ib" href={`/admin/custom-pc/${b.id}`} aria-label={`Edit ${b.name}`} title="Edit"><AdIcon n="edit" /></Link>
                  <button className="ad-ib ad-del" onClick={() => setDel(b)} aria-label={`Delete ${b.name}`} title="Delete"><AdIcon n="trash" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!del}
        tone="danger"
        title="Delete this PC?"
        message={<><b>{del?.name}</b> will be removed from the store. This can&apos;t be undone.</>}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDel(null)}
        onConfirm={confirm}
      />
    </>
  );
}
