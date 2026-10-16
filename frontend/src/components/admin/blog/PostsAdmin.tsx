"use client";

import Link from "next/link";
import { useState } from "react";
import PostCover from "@/components/blog/PostCover";
import ConfirmDialog from "@/components/ConfirmDialog";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCollection } from "@/lib/admin/hooks";
import { db } from "@/lib/admin/resources";
import type { AdminPost } from "@/lib/admin/types";
import { BLOG_TAGS, fmtDate, postBySlug } from "@/lib/blog";
import { AdIcon } from "../icons";
import { useToast } from "../Toast";
import { Empty, ErrorBox, PageHead, Seg, Skeleton } from "../ui";

export default function PostsAdmin() {
  const posts = useCollection(db.posts);
  const toast = useToast();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string>("All");
  const [del, setDel] = useState<AdminPost | null>(null);
  const [busy, setBusy] = useState(false);

  const list = [...(posts.items ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const shown = list.filter((p) => (tag === "All" || p.tag === tag) && `${p.title} ${p.excerpt}`.toLowerCase().includes(q.trim().toLowerCase()));

  const confirm = async () => {
    if (!del) return;
    setBusy(true);
    try {
      await posts.remove(del.slug);
      logActivity(`Deleted post “${del.title}”`, "/admin/blog");
      toast("Post deleted");
    } catch (e) { toast(errorText(e), "err"); } finally { setBusy(false); setDel(null); }
  };

  return (
    <>
      <PageHead
        title="Blog Posts"
        mode={posts.mode}
        desc="Guides, buying advice and store news."
        actions={<Link href="/admin/blog/new" className="btn btn-red"><AdIcon n="plus" />New post</Link>}
      />
      {posts.error && <ErrorBox message={posts.error} onRetry={posts.reload} />}

      <div className="ad-tools">
        <label className="ad-search">
          <AdIcon n="search" />
          <input className="ad-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts" aria-label="Search posts" />
        </label>
        <Seg label="Tag" value={tag} onChange={setTag} options={["All", ...BLOG_TAGS].map((t) => [t, <>{t} <em>{t === "All" ? list.length : list.filter((p) => p.tag === t).length}</em></>] as const)} />
      </div>

      {posts.loading ? <Skeleton rows={8} /> : !shown.length ? (
        <div className="ad-card"><Empty icon="file" title={list.length ? "No posts match" : "No posts yet"} action={<Link href="/admin/blog/new" className="btn btn-red">Write a post</Link>} /></div>
      ) : (
        <div className="ad-tw">
          <table className="ad-t">
            <thead><tr><th>Post</th><th>Tag</th><th>Date</th><th>Status</th><th className="acts"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.slug}>
                  <td>
                    <div className="ad-row">
                      <span className="ad-th" style={{ width: 72, height: 44 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.cover ? <img src={p.cover} alt="" style={{ objectFit: "cover", padding: 0 }} /> : <PostCover post={p} />}
                      </span>
                      <span><b><Link href={`/admin/blog/${p.slug}`}>{p.title}</Link></b><small>{p.author} · {p.mins} min read · {p.body.length} blocks</small></span>
                    </div>
                  </td>
                  <td><span className="ad-b plain">{p.tag}</span></td>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(p.date)}</td>
                  <td><span className={`ad-b ${p.status === "published" ? "ok" : "plain"}`}>{p.status === "published" ? "Published" : "Draft"}</span></td>
                  <td className="acts">
                    {postBySlug.has(p.slug) && <a className="ad-ib" style={{ display: "inline-grid" }} href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${p.title}`} title="View on site"><AdIcon n="eye" /></a>}
                    <Link className="ad-ib" style={{ display: "inline-grid" }} href={`/admin/blog/${p.slug}`} aria-label={`Edit ${p.title}`} title="Edit"><AdIcon n="edit" /></Link>
                    <button className="ad-ib ad-del" style={{ display: "inline-grid" }} onClick={() => setDel(p)} aria-label={`Delete ${p.title}`} title="Delete"><AdIcon n="trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!del}
        tone="danger"
        title="Delete this post?"
        message={<><b>{del?.title}</b> will be removed from the blog. This can&apos;t be undone.</>}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDel(null)}
        onConfirm={confirm}
      />
    </>
  );
}
