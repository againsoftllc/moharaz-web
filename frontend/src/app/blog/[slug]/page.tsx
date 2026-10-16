import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd, postLd } from "@/lib/schema";
import Link from "next/link";
import { SHOW_PC_BUILDER } from "@/lib/features";
import { notFound } from "next/navigation";
import BlogList, { PostCard } from "@/components/blog/BlogList";
import PostCover from "@/components/blog/PostCover";
import ShareButton from "@/components/blog/ShareButton";
import RailNav from "@/components/RailNav";
import ProductCard from "@/components/shop/ProductCard";
import { fmtDate, headingId } from "@/lib/blog";
import { blogCategories, blogPost, blogPosts, productById } from "@/lib/shop/api";
import type { Product } from "@/lib/products";

export const revalidate = 60;

/* /blog/{slug} is a post or — as on the old shop (/blog/purchase-guide) — a blog category */
async function resolve(slug: string) {
  const post = await blogPost(slug);
  if (post) return { kind: "post", post } as const;
  const category = (await blogCategories().catch(() => [])).find((c) => c.slug === slug);
  if (!category) return null;
  return { kind: "category", category } as const;
}

const ENT: Record<string, string> = { amp: "&", nbsp: " ", quot: '"', "#39": "'", lt: "<", gt: ">" };
const plain = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&(amp|nbsp|quot|#39|lt|gt);/g, (_, e) => ENT[e]).replace(/\s+/g, " ").trim();

/** the article's section headings (h2, or h3 when it has none) get ids for the "In this article" list */
function withToc(html: string) {
  const level = /<h2[\s>]/i.test(html) ? "h2" : "h3";
  const toc: { id: string; label: string }[] = [];
  const out = html.replace(new RegExp(`<${level}([^>]*)>([\\s\\S]*?)</${level}>`, "gi"), (m, attrs: string, inner: string) => {
    const label = plain(inner);
    if (!label) return m;
    const own = attrs.match(/\sid="([^"]+)"/)?.[1];
    const id = own ?? `${headingId(label) || "section"}-${toc.length + 1}`;
    toc.push({ id, label });
    return own ? m : `<${level}${attrs} id="${id}">${inner}</${level}>`;
  });
  return { html: out, toc };
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const hit = await resolve((await params).slug);
  if (!hit) return {};
  if (hit.kind === "category") {
    return seo({ title: hit.category.name, description: hit.category.description ? plain(hit.category.description).slice(0, 160) : undefined, alternates: { canonical: `/blog/${hit.category.slug}` } });
  }
  const post = hit.post;
  return seo({
    // the old shop's meta title when the post has one
    title: post.seoTitle ? { absolute: post.seoTitle } : post.title,
    description: post.seoDescription || post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.seoTitle || post.title, ...(post.cover ? { images: [post.cover] } : {}) },
  });
}

export default async function BlogSlugPage({ params }: PageProps<"/blog/[slug]">) {
  const slug = (await params).slug;
  const hit = await resolve(slug);
  if (!hit) notFound();

  if (hit.kind === "category") {
    const posts = (await blogPosts().catch(() => [])).filter((p) => p.categorySlug === slug);
    return (
      <>
        <JsonLd data={breadcrumbLd([["Blog", "/blog"], [hit.category.name, `/blog/${hit.category.slug}`]])} />
        <BlogList posts={posts} category={hit.category} />
      </>
    );
  }

  const post = hit.post;
  // the post title is the page's one <h1> (SEO): any <h1> inside the body becomes an <h2>
  const { html, toc } = withToc((post.html ?? "").replace(/<(\/?)h1\b/gi, "<$1h2"));
  const [products, all] = await Promise.all([
    Promise.all((post.productIds ?? []).map((id) => productById(id))).then((ps) => ps.filter((p): p is Product => !!p)),
    blogPosts().catch(() => []),
  ]);
  const more = all.filter((p) => p.slug !== post.slug).sort((a, b) => +(b.tag === post.tag) - +(a.tag === post.tag)).slice(0, 3);
  return (
    <>
      <JsonLd data={postLd(post)} />
      <article className="wrap post-page">
        <nav className="crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>/</span><Link href="/blog">Blog</Link><span>/</span>
          {post.categorySlug ? <Link href={`/blog/${post.categorySlug}`}>{post.tag}</Link> : <b>{post.tag}</b>}
        </nav>
        <header className="post-head">
          <span className="post-meta"><em>{post.tag}</em>{post.date && fmtDate(post.date)}{post.mins ? ` · ${post.mins} min read` : ""}</span>
          <h1>{post.title}</h1>
          {post.excerpt && <p>{post.excerpt}</p>}
          <div className="post-by">
            <span className="avatar">U</span><span><b>{post.author}</b><small>Moharaz, Dhaka</small></span>
            <ShareButton title={post.title} />
          </div>
        </header>
        <div className="post-hero"><PostCover post={post} big /></div>

        <div className="post-grid2">
          <aside className="post-toc">
            {toc.length > 1 && (
              <>
                <span className="side-h">In this article</span>
                <ol>{toc.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.label}</a></li>)}</ol>
              </>
            )}
            <div className="tc-help">
              <b>Need advice?</b>
              <p>Talk to our team at <a href="tel:+8801805042474">01805042474</a> {SHOW_PC_BUILDER ? <> or plan it yourself in our <Link href="/pc-builder">PC Builder</Link></> : null}.</p>
            </div>
          </aside>
          {/* the article as written in AgainERP (Website → Blog) */}
          <div className="post-body post-html" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </article>

      {products.length > 0 && (
        <section className="wrap sec pd-rail">
          <div className="head"><div><span className="eyebrow">Shop this article</span><h2>Products mentioned</h2></div><RailNav id="post-shop" /></div>
          <div className="rail together" id="post-shop">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {more.length > 0 && (
        <section className="wrap sec">
          <div className="head"><div><span className="eyebrow">Keep reading</span><h2>More from the blog</h2></div><Link href="/blog" className="more-link">All articles →</Link></div>
          <div className="post-grid">{more.map((p) => <PostCard key={p.slug} post={p} />)}</div>
        </section>
      )}
    </>
  );
}
