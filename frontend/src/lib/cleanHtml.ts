import { SITE_HOST } from "./site";
/* Product descriptions were imported from the previous shop, which had copied many of them from other sites —
   with those sites' styling: inline styles, classes, editor ids, fixed widths, <font>/<span> wrappers, even
   <meta>/<title>/<style> blocks. This keeps the content exactly as written and drops only that styling, so every
   description uses the store's own look (product.css → .pd-ov) and reads as plain, semantic HTML.

   - whole blocks removed: <style> <script> <title> <head> <noscript>, comments, and the tags <meta> <link> <col> <colgroup>
   - tags kept (with no attributes but the useful ones below); <span> <font> <center> <o:p> … are unwrapped (text kept)
   - attributes kept: a → href (external links open in a new tab), img → src alt, td/th → colspan rowspan, iframe → src;
     a link or image on the shop's own domain (moharaz.com) becomes relative, so it never hard-codes a domain
   - every <table> is wrapped in <div class="pd-ov-tbl"> so a wide one scrolls inside the page on a phone
   - empty paragraphs (only &nbsp; / <br>) are dropped; a space goes between a link and a word it touches;
     paragraph-long "headings" become paragraphs; an <h1> becomes <h2> — the page title is the one <h1> */

const KEEP = new Set([
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "dl", "dt", "dd",
  "strong", "b", "em", "i", "u", "s", "sup", "sub", "small", "mark", "code", "pre", "blockquote", "q",
  "a", "img", "figure", "figcaption", "video", "source", "iframe",
  "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td",
  "div", "section", "article",
]);
/** block wrappers from the copied pages: kept as plain blocks so the paragraphs stay apart */
const AS_DIV = new Set(["section", "article"]);
const ATTRS: Record<string, string[]> = { a: ["href"], img: ["src", "alt"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"], iframe: ["src"], source: ["src", "type"], video: ["src"] };
const VOID = new Set(["br", "hr", "img", "source"]);

const attrOf = (raw: string, name: string) => {
  const m = raw.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : null;
};
const esc = (v: string) => v.replace(/"/g, "&quot;");
/** the shop's own absolute address (any scheme, with or without www / an old "new." subdomain) */
const hostRe = (h: string) => h.replace(/^www\./, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** the deployment's own host, plus any other host the shop's content may link to (NEXT_PUBLIC_OWN_HOSTS, comma-separated) */
const OWN_HOSTS = [SITE_HOST, ...(process.env.NEXT_PUBLIC_OWN_HOSTS || "").split(",")].map((h) => h.trim()).filter(Boolean).map(hostRe);
const OWN_SITE = new RegExp(`^\\s*(?:https?:)?//(?:www\\.|new\\.)?(?:${OWN_HOSTS.join("|")})(?=[/?#]|$)`, "i");

export function cleanHtml(html: string): string {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(style|script|title|head|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(meta|link|col|colgroup|html|body|!doctype)\b[^>]*>/gi, "");

  s = s.replace(/<(\/?)([a-zA-Z][\w:-]*)([^>]*)>/g, (_m, close: string, rawTag: string, rest: string) => {
    let tag = rawTag.toLowerCase();
    if (!KEEP.has(tag)) return ""; // span, font, center, o:p … — the tag goes, its text stays
    if (AS_DIV.has(tag)) tag = "div";
    if (tag === "h1") tag = "h2"; // the page's own title is its only <h1> (SEO): a description's h1 becomes an h2
    if (close) return tag === "table" ? "</table></div>" : `</${tag}>`;
    const keep = (ATTRS[tag] ?? []).flatMap((name) => {
      let v = attrOf(rest, name);
      if (v == null || v === "") return [];
      // this shop's own address → a relative link, so it follows whatever domain the site runs on (and text pasted in
      // the admin later can never hard-code the old one)
      if (name === "href" || name === "src") v = v.replace(OWN_SITE, "") || "/";
      if ((name === "href" || name === "src") && /^\s*(javascript|vbscript|data):/i.test(v)) return [];
      if ((name === "colspan" || name === "rowspan") && !/^\d+$/.test(v)) return [];
      return [`${name}="${esc(v)}"`];
    });
    if (tag === "a") {
      const href = attrOf(rest, "href") ?? "";
      if (/^https?:\/\//i.test(href) && !OWN_SITE.test(href)) keep.push('target="_blank"', 'rel="noopener"');
    }
    if (tag === "img") keep.push('loading="lazy"');
    const open = `<${tag}${keep.length ? " " + keep.join(" ") : ""}${VOID.has(tag) ? " /" : ""}>`;
    return tag === "table" ? `<div class="pd-ov-tbl">${open}` : open;
  });

  // a "heading" that is really a paragraph — the copied sites sized it down with inline styles, which are gone now:
  // over 25 words, or over 15 words and more than one sentence → a plain paragraph (the text is untouched)
  // (copied markup often closes a heading with another level's tag — <h2>…</h3> — so any heading close ends it)
  s = s.replace(/<(h[1-6])>([\s\S]*?)<\/h[1-6]>/g, (m, _h: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    return words > 25 || (words > 15 && /[.!?]\s+\S/.test(text)) ? `<p>${inner}</p>` : m;
  });

  return s
    // the copied sites spaced their links with CSS ("Desktop<a>RAM</a>is"): without it the words run together, so a
    // space goes in where a letter or digit touches a link — only whitespace, never punctuation or words
    .replace(/([\p{L}\p{N}])(<a\b)/gu, "$1 $2")
    .replace(/(<\/a>)([\p{L}\p{N}])/gu, "$1 $2")
    .replace(/<(p|div|h[1-6]|li)>(?:\s|&nbsp;|&#160;|<br \/>)*<\/\1>/gi, "") // empty blocks
    .replace(/(<br \/>\s*){3,}/gi, "<br /><br />")
    .trim();
}
