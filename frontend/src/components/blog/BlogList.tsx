"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fmtDate, type Post } from "@/lib/blog";
import PostCover from "./PostCover";

export function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="post-card">
      <span className="post-img"><PostCover post={post} /></span>
      <span className="post-meta"><em>{post.tag}</em>{post.date && fmtDate(post.date)}{post.mins ? ` · ${post.mins} min read` : ""}</span>
      <b>{post.title}</b>
      <p>{post.excerpt}</p>
      <span className="post-more">Read article →</span>
    </Link>
  );
}

/** the blog (all posts) or one blog category (`category` set) */
export default function BlogList({ posts, category }: { posts: Post[]; category?: { name: string; description?: string | null } }) {
  const [tag, setTag] = useState<string>("All");
  const [q, setQ] = useState("");
  const POSTS = posts;
  const tags = useMemo(() => [...new Set(posts.map((p) => p.tag))].sort(), [posts]);
  const [featured, ...rest] = POSTS;

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const filtering = tag !== "All" || words.length > 0;
    return (filtering || category ? POSTS : rest).filter((p) =>
      (tag === "All" || p.tag === tag) && words.every((w) => `${p.title} ${p.excerpt}`.toLowerCase().includes(w)));
  }, [tag, q, rest, POSTS, category]);
  const filtering = tag !== "All" || q.trim().length > 0;

  return (
    <div className="wrap blog-page">
      <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span>{category ? <><Link href="/blog">Blog</Link><span>/</span><b>{category.name}</b></> : <b>Blog</b>}</nav>
      <div className="shop-head">
        <div><span className="eyebrow">Moharaz Blog</span><h1>{category ? category.name : <>Guides, tips &amp; news</>}</h1></div>
        <span className="total">{POSTS.length} <em>articles</em></span>
      </div>

      {!filtering && !category && featured && (
        <Link href={`/blog/${featured.slug}`} className="post-feature">
          <span className="post-img"><PostCover post={featured} big /></span>
          <span className="post-fbody">
            <span className="post-meta"><em>Featured · {featured.tag}</em>{featured.date && fmtDate(featured.date)}{featured.mins ? ` · ${featured.mins} min read` : ""}</span>
            <b>{featured.title}</b>
            <p>{featured.excerpt}</p>
            <span className="btn btn-red">Read the guide →</span>
          </span>
        </Link>
      )}

      <div className="blog-tools">
        <div className="seg" role="tablist" aria-label="Filter by topic">
          {(tags.length > 1 && !category ? ["All", ...tags] : []).map((t) => (
            <button key={t} role="tab" aria-selected={tag === t} className={tag === t ? "on" : ""} onClick={() => setTag(t)}>
              {t}<span>{t === "All" ? POSTS.length : POSTS.filter((p) => p.tag === t).length}</span>
            </button>
          ))}
        </div>
        <label className="br-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles…" aria-label="Search articles" />
          {q && <button onClick={() => setQ("")} aria-label="Clear search">✕</button>}
        </label>
      </div>

      {shown.length ? (
        <div className="post-grid">{shown.map((p) => <PostCard key={p.slug} post={p} />)}</div>
      ) : (
        <div className="empty"><b>No articles found</b><p>Try another topic or search term.</p><button className="btn btn-red" onClick={() => { setTag("All"); setQ(""); }}>Show all articles</button></div>
      )}
    </div>
  );
}
