import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { pageLd } from "@/lib/schema";
import { cleanHtml } from "@/lib/cleanHtml";
import pages from "@/lib/info-pages.json";

type Key = keyof typeof pages;

/* The shop's own policy pages — the text is moharaz.com's live "information" pages (lib/info-pages.json). The first
   heading and logo inside the copied HTML are dropped: the page title is the h1 (one h1 per page). */
function body(key: Key): string {
  return cleanHtml(
    pages[key].html
      .replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, "")
      .replace(/<img[^>]*moharaz-logo[^>]*>/gi, ""),
  );
}

export function infoTitle(key: Key): string {
  return pages[key].title;
}

export default function InfoPage({ slug, eyebrow, description }: { slug: Key; eyebrow: string; description?: string }) {
  const title = pages[slug].title;
  return (
    <div className="wrap info-page">
      <JsonLd data={pageLd(`/${slug}`, title, description)} />
      <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><b>{title}</b></nav>
      <header className="tc-head">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </header>
      <article className="tc-body" dangerouslySetInnerHTML={{ __html: body(slug) }} />
    </div>
  );
}
