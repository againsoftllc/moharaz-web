"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PostCover from "@/components/blog/PostCover";
import { PostCard } from "@/components/blog/BlogList";
import ConfirmDialog from "@/components/ConfirmDialog";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCatalog } from "@/lib/admin/catalog";
import { SLUG_RE, slugify, words } from "@/lib/admin/format";
import { useCollection } from "@/lib/admin/hooks";
import { db } from "@/lib/admin/resources";
import type { AdminCategory, AdminPost } from "@/lib/admin/types";
import { BLOG_TAGS, type Block, type Post } from "@/lib/blog";
import { AdIcon, type AdIconName } from "../icons";
import { useToast } from "../Toast";
import { Card, ColorField, Empty, Field, IconPicker, ImageField, Order, PageHead, PickMany, Seg, SeoFields, Skeleton, SourceTag, useUnsaved } from "../ui";

const today = () => new Date().toISOString().slice(0, 10);
const blank = (): AdminPost => ({
  slug: "", title: "", excerpt: "", tag: "Guides", date: today(), mins: 1, author: "Moharaz Team", icon: "cpu", color: "#E3121B",
  shop: [], body: [{ p: "" }], status: "draft", seoTitle: "", seoDescription: "",
});

export default function PostEditor({ slug }: { slug?: string }) {
  const posts = useCollection(db.posts);
  const { cats, loading } = useCatalog();
  if (posts.loading || loading) return <Skeleton rows={12} />;
  const found = slug !== undefined ? posts.items?.find((p) => p.slug === slug) : undefined;
  if (slug !== undefined && !found) {
    return <div className="ad-card"><Empty icon="file" title="Post not found" text={`There's no post “${slug}”.`} action={<Link href="/admin/blog" className="btn btn-red">Back to blog</Link>} /></div>;
  }
  return <PostForm key={found?.slug ?? "new"} initial={found ?? blank()} isNew={!found} all={posts.items ?? []} cats={cats} save={posts.save} remove={posts.remove} mode={posts.mode} />;
}

/* ---------- body blocks ---------- */
type Kind = "h" | "p" | "ul" | "tip";
const kindOf = (b: Block): Kind => ("h" in b ? "h" : "ul" in b ? "ul" : "tip" in b ? "tip" : "p");
const KINDS: [Kind, string, AdIconName][] = [["h", "Heading", "tag"], ["p", "Paragraph", "file"], ["ul", "List", "menu"], ["tip", "Tip box", "info"]];
const empty: Record<Kind, () => Block> = { h: () => ({ h: "" }), p: () => ({ p: "" }), ul: () => ({ ul: [""] }), tip: () => ({ tip: "" }) };
const textOf = (b: Block) => ("h" in b ? b.h : "p" in b ? b.p : "tip" in b ? b.tip : b.ul.join(" "));

function BlockEditor({ value, onChange }: { value: Block[]; onChange: (v: Block[]) => void }) {
  const put = (i: number, b: Block) => onChange(value.map((x, j) => (j === i ? b : x)));
  const move = (i: number, d: number) => {
    const j = i + d;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="ad-blocks">
      {value.map((b, i) => {
        const k = kindOf(b);
        return (
          <div key={i} className={`ad-block k-${k}`}>
            <em>{KINDS.find((x) => x[0] === k)![1].split(" ")[0]}</em>
            <div className="ad-f">
              {"h" in b && <input value={b.h} onChange={(e) => put(i, { h: e.target.value })} placeholder="Section heading" aria-label={`Block ${i + 1} heading`} />}
              {"p" in b && <textarea rows={3} value={b.p} onChange={(e) => put(i, { p: e.target.value })} placeholder="Write a paragraph…" aria-label={`Block ${i + 1} paragraph`} />}
              {"tip" in b && <textarea rows={2} value={b.tip} onChange={(e) => put(i, { tip: e.target.value })} placeholder="A short tip shown in a highlighted box" aria-label={`Block ${i + 1} tip`} />}
              {"ul" in b && <textarea rows={Math.max(3, b.ul.length)} value={b.ul.join("\n")} onChange={(e) => put(i, { ul: e.target.value.split("\n") })} placeholder={"One item per line"} aria-label={`Block ${i + 1} list items, one per line`} />}
            </div>
            <div className="ad-block-acts">
              <Order i={i} n={value.length} onMove={(d) => move(i, d)} label={`block ${i + 1}`} />
              <button type="button" className="ad-ib ad-del" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove block ${i + 1}`}><AdIcon n="trash" /></button>
            </div>
          </div>
        );
      })}
      <div className="ad-add">
        {KINDS.map(([k, label, icon]) => <button type="button" key={k} onClick={() => onChange([...value, empty[k]()])}><AdIcon n={icon} />{label}</button>)}
      </div>
    </div>
  );
}

/* ---------- form ---------- */
type Errors = Partial<Record<"title" | "slug" | "excerpt" | "body", string>>;

function PostForm({ initial, isNew, all, cats, save, remove, mode }: {
  initial: AdminPost;
  isNew: boolean;
  all: AdminPost[];
  cats: AdminCategory[];
  save: (p: AdminPost, prev?: string) => Promise<AdminPost>;
  remove: (slug: string) => Promise<void>;
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
  const set = (patch: Partial<AdminPost>) => setP((x) => ({ ...x, ...patch }));
  const dirty = JSON.stringify(p) !== JSON.stringify(base);
  useUnsaved(dirty && !busy);

  const count = p.body.reduce((s, b) => s + words(textOf(b)), 0) + words(p.excerpt);
  const autoMins = Math.max(1, Math.round(count / 200));

  const validate = (): Errors => {
    const e: Errors = {};
    if (!p.title.trim()) e.title = "Give the post a title.";
    if (!p.slug) e.slug = "Enter a URL slug.";
    else if (!SLUG_RE.test(p.slug)) e.slug = "Use lowercase letters, numbers and single hyphens only.";
    else if (all.some((x) => x.slug === p.slug && x.slug !== base.slug)) e.slug = "Another post already uses this slug.";
    if (!p.excerpt.trim()) e.excerpt = "Write a one or two sentence summary.";
    if (!p.body.some((b) => textOf(b).trim())) e.body = "The article needs some content.";
    return e;
  };

  const submit = async (status?: AdminPost["status"]) => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { toast("Please fix the highlighted fields", "err"); return; }
    // drop empty blocks and blank list lines before saving
    const body = p.body
      .map((b) => ("ul" in b ? { ul: b.ul.map((x) => x.trim()).filter(Boolean) } : b))
      .filter((b) => textOf(b).trim());
    setBusy(true);
    try {
      const saved = await save({ ...p, title: p.title.trim(), excerpt: p.excerpt.trim(), body, status: status ?? p.status }, isNew ? undefined : base.slug);
      logActivity(`${isNew ? "Created" : "Updated"} post “${saved.title}”`, `/admin/blog/${saved.slug}`);
      toast(saved.status === "published" ? (isNew || base.status === "draft" ? "Post published" : "Changes saved") : "Draft saved");
      setBase(saved);
      setP(saved);
      if (isNew || saved.slug !== base.slug) router.replace(`/admin/blog/${saved.slug}`);
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
      logActivity(`Deleted post “${base.title}”`, "/admin/blog");
      toast("Post deleted");
      router.push("/admin/blog");
    } catch (err) {
      toast(errorText(err), "err");
      setBusy(false);
      setDel(false);
    }
  };

  const asPost: Post = { ...p, title: p.title || "Post title", excerpt: p.excerpt || "The summary shows here." };

  return (
    <>
      <PageHead
        crumbs={[["Blog", "/admin/blog"], [isNew ? "New post" : "Edit"]]}
        title={isNew ? "New post" : base.title}
        actions={!isNew && <button className="btn btn-line ad-del" onClick={() => setDel(true)}><AdIcon n="trash" />Delete</button>}
      />

      <div className="ad-form">
        <div className="ad-stack">
          <Card>
            <div className="ad-fields">
              <Field label="Title" error={errors.title} count={p.title.length} max={70}>
                <input value={p.title} onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} placeholder="How to build a gaming PC in Bangladesh" style={{ fontSize: 16, fontWeight: 700 }} />
              </Field>
              <Field label="URL slug" error={errors.slug}>
                <div className="ad-pre"><span>/blog/</span><input value={p.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }); }} placeholder="auto from title" /></div>
              </Field>
              <Field label="Excerpt" error={errors.excerpt} hint="Shown on blog cards and in search results." count={p.excerpt.length} max={200}>
                <textarea rows={2} value={p.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Article" desc={`${count} words · about ${autoMins} min read`}>
            <BlockEditor value={p.body} onChange={(body) => set({ body })} />
            {errors.body && <small style={{ display: "block", marginTop: 8, color: "var(--red)", fontSize: 12, fontWeight: 600 }}>{errors.body}</small>}
          </Card>

          <Card title="Shop this article" desc="Products from these categories are suggested under the post.">
            <PickMany options={cats.map((c) => c.slug)} value={p.shop} onChange={(shop) => set({ shop })} render={(s) => cats.find((c) => c.slug === s)?.name ?? s} />
          </Card>

          <Card title="Search engine listing">
            <SeoFields
              title={p.seoTitle} desc={p.seoDescription} path={`/blog/${p.slug || "…"}`}
              fallbackTitle={p.title || "Post title"} fallbackDesc={p.excerpt}
              onTitle={(seoTitle) => set({ seoTitle })} onDesc={(seoDescription) => set({ seoDescription })}
            />
          </Card>
        </div>

        <aside className="ad-aside">
          <Card title="Publish" actions={mode && <SourceTag mode={mode} />}>
            <div className="ad-fields">
              <span className={`ad-b ${p.status === "published" ? "ok" : "plain"}`} style={{ justifySelf: "start" }}>{base.status === "published" && !isNew ? "Published" : "Draft"}</span>
              <Field label="Tag" group><Seg options={BLOG_TAGS} value={p.tag} onChange={(tag) => set({ tag })} label="Tag" /></Field>
              <div className="ad-g2">
                <Field label="Date"><input type="date" value={p.date} onChange={(e) => set({ date: e.target.value })} /></Field>
                <Field label="Read time" hint={p.mins !== autoMins ? <button type="button" className="ad-link" onClick={() => set({ mins: autoMins })}>Use {autoMins} min</button> : "minutes"}>
                  <input type="number" min={1} value={p.mins} onChange={(e) => set({ mins: Math.max(1, +e.target.value || 1) })} />
                </Field>
              </div>
              <Field label="Author"><input value={p.author} onChange={(e) => set({ author: e.target.value })} /></Field>
              <div className="ad-save">
                {dirty && <span className="ad-dirty">Unsaved changes</span>}
                {base.status === "published" && !isNew ? (
                  <>
                    <button className="btn btn-red" onClick={() => submit("published")} disabled={busy || !dirty}>{busy ? "Saving…" : "Update post"}</button>
                    <button className="btn btn-line" onClick={() => submit("draft")} disabled={busy}>Unpublish</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-red" onClick={() => submit("published")} disabled={busy}>{busy ? "Saving…" : "Publish"}</button>
                    <button className="btn btn-line" onClick={() => submit("draft")} disabled={busy || (!dirty && !isNew)}>Save draft</button>
                  </>
                )}
                <Link href="/admin/blog" className="btn btn-line">{dirty ? "Discard" : "Back to list"}</Link>
              </div>
            </div>
          </Card>

          <Card title="Cover" desc="Upload a 16:9 image, or use a generated cover in the post's colour.">
            <div className="ad-fields">
              <ImageField value={p.cover} onChange={(cover) => set({ cover })} size={[1280, 720]} maxW={1280} />
              {!p.cover && (
                <>
                  <div className="ad-cover"><PostCover post={asPost} big /></div>
                  <Field label="Cover icon" group><IconPicker value={p.icon} onChange={(icon) => set({ icon })} /></Field>
                  <Field label="Cover colour" group><ColorField value={p.color} onChange={(color) => set({ color })} /></Field>
                </>
              )}
            </div>
          </Card>

          <Card title="Card preview"><div inert><PostCard post={asPost} /></div></Card>
        </aside>
      </div>

      <ConfirmDialog
        open={del}
        tone="danger"
        title="Delete this post?"
        message={<><b>{base.title}</b> will be removed from the blog. This can&apos;t be undone.</>}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDel(false)}
        onConfirm={doDelete}
      />
    </>
  );
}
