"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tk } from "@/lib/data";
import AiAssistant from "./AiAssistant";
import { SHOW_AI_SEARCH } from "@/lib/features";

type Seen = { query: string; note: string; relaxed: boolean; chips: string[] };

/** "AI search" note above a listing opened from an AI answer (?ai=…). The listing rewrites its URL as filters
    change, so what the answer applied is read once, when the page opens. */
export default function AiSearchBanner({ category }: { category?: string }) {
  const [seen, setSeen] = useState<Seen | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const query = sp.get("ai");
    if (!query) return;
    const min = +(sp.get("min") ?? 0);
    const max = +(sp.get("max") ?? 0);
    const sort = sp.get("sort");
    const chips = [
      category,
      ...(sp.get("brand")?.split(",").filter(Boolean).map((b) => b.replace(/-/g, " ").toUpperCase()) ?? []),
      min && max ? `${tk(min)} – ${tk(max)}` : max ? `Under ${tk(max)}` : min ? `Over ${tk(min)}` : "",
      sp.get("q") ? `“${sp.get("q")}”` : "",
      sp.get("stock") === "in" ? "In stock" : "",
      sort === "price-asc" ? "Lowest price first" : sort === "price-desc" ? "Highest price first" : sort === "newest" ? "Newest first" : "",
    ].filter((c): c is string => !!c);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL the page was opened with
    setSeen({ query, note: sp.get("ai_note") ?? "", relaxed: !!sp.get("ai_relaxed"), chips });
  }, [category]);

  if (!seen || !SHOW_AI_SEARCH) return null;
  return (
    <>
    <div className="ai-banner" role="status">
      <span className="ai-tag">AI</span>
      <div>
        <p>
          <b>{seen.note || seen.query}</b>
          {seen.chips.length ? <span className="ai-chips">{seen.chips.map((c) => <em key={c}>{c}</em>)}</span> : null}
        </p>
        <small>
          {seen.relaxed ? "Nothing matched every condition, so these are the closest matches. " : ""}
          You asked: “{seen.query}” · <Link href={`/all?q=${encodeURIComponent(seen.query)}`}>Plain search instead</Link>
        </small>
      </div>
    </div>
    <AiAssistant question={seen.query} />
    </>
  );
}
