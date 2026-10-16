"use client";

import { useState } from "react";
import { ic } from "@/lib/data";
import { catOf, type Product } from "@/lib/products";

/** Product photo, or a stand-in (category icon on a soft tile, tinted per category) when there is none.
    While the photo loads its box keeps its size and shimmers (a skeleton), so the card never jumps; a photo that
    fails to load falls back to the stand-in. `eager`: a card in the first row — loaded at once and first (it is
    the page's largest paint), not lazily. */
export default function ProductArt({ p, eager }: { p: Product; eager?: boolean }) {
  // which photo has finished, and how — a new `p.image` is "loading" again until it does
  const [done, setDone] = useState<{ src: string; ok: boolean } | null>(null);
  const state = !p.image || done?.src !== p.image ? "loading" : done.ok ? "ready" : "failed";
  const finish = (src: string, ok: boolean) => setDone((d) => (d?.src === src && d.ok === ok ? d : { src, ok }));

  if (p.image && state !== "failed") {
    const src = p.image;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        // a cached photo can finish before React hydrates, so its onLoad never fires — read it off the element
        ref={(el) => { if (el?.complete) finish(src, el.naturalWidth > 0); }}
        className={`art photo${state === "loading" ? " is-loading" : ""}`}
        src={src}
        alt={p.name}
        decoding="async"
        {...(eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
        onLoad={() => finish(src, true)}
        onError={() => finish(src, false)}
      />
    );
  }
  const c = catOf(p);
  const gid = `pa${String(p.id).replace(/\W/g, "")}`;
  return (
    <svg className="art" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="50%" cy="55%" r="60%">
          <stop offset="0" stopColor={c.color} stopOpacity=".22" />
          <stop offset="1" stopColor={c.color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${gid})`} />
      <g transform="translate(40 36) scale(5)" stroke={c.color} fill="none" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ic[c.icon] }} />
      <text x="100" y="182" textAnchor="middle" fontWeight="800" fontSize="13" letterSpacing="2" fill="currentColor" opacity=".45">{p.brand.toUpperCase()}</text>
    </svg>
  );
}
