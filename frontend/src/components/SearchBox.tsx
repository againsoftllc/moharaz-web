"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { tk } from "@/lib/data";
import { callForPrice, catOf, productHref, type Product } from "@/lib/products";
import { listProducts } from "@/lib/shop/api";
import { remember } from "@/lib/shop/registry";
import ProductArt from "./shop/ProductArt";
import { track } from "@/lib/tracking";
import { aiEnabled, aiHref, aiSearch, looksLikeQuestion } from "@/lib/aiSearch";
import { SHOW_AI_SEARCH } from "@/lib/features";

const LIMIT = 8;

/** what shoppers here look for most — shown before anything is typed (Popular) */
export const POPULAR_SEARCHES = ["gaming laptop", "monitor", "RTX 5060", "Ryzen 7", "SSD 1TB", "B650M", "keyboard", "UPS"];
const RECENT_KEY = "ut-recent-searches";
const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
};
/** the header's search icon (phones) opens the search panel */
export const openSearch = () => window.dispatchEvent(new Event("ut:search"));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Live suggestions from the catalogue API (name / SKU match), asked once typing pauses. */
function useSuggest(q: string) {
  const [res, setRes] = useState<{ hits: Product[]; total: number }>({ hits: [], total: 0 });
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const term = words.join(" ");
  useEffect(() => {
    if (!term) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      listProducts({ search: term, perPage: LIMIT }, ctl)
        .then(({ items, total }) => { remember(...items); setRes({ hits: items, total }); })
        .catch(() => {});
    }, 220);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [term]);
  return { words, hits: term ? res.hits : [], total: term ? res.total : 0 };
}

/** wraps every typed word found in `text` in <mark> */
function mark(text: string, words: string[]): ReactNode {
  const re = new RegExp(`(${[...words].sort((a, b) => b.length - a.length).map(esc).join("|")})`, "gi");
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

export default function SearchBox() {
  const router = useRouter();
  const id = useId();
  const box = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  // phones: the search is a panel under the header, opened from the header's search icon
  const [panel, setPanel] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [act, setAct] = useState(-1);
  // AI search (AgainERP + OpenAI): on when the ERP has a key; busy while a question is being read
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (SHOW_AI_SEARCH) void aiEnabled().then(setAi); }, []);
  const { words, hits, total } = useSuggest(q);
  const typed = words.length > 0;
  // before anything is typed: the shopper's recent searches and the popular ones
  const starters = !typed && open;
  const show = open && (typed || starters);
  const allHref = `/all?q=${encodeURIComponent(q.trim())}`;

  useEffect(() => {
    const onOpen = () => {
      setPanel(true);
      setOpen(true);
      setRecent(readRecent());
      requestAnimationFrame(() => input.current?.focus());
    };
    window.addEventListener("ut:search", onOpen);
    return () => window.removeEventListener("ut:search", onOpen);
  }, []);

  const close = () => { setOpen(false); setPanel(false); };

  // close on a click/tap outside the search box
  useEffect(() => {
    if (!show && !panel) return;
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) close(); };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, [show, panel]);

  const remember_ = (term: string) => {
    const next = [term, ...readRecent().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  };

  /** a popular / recent search: straight to its results */
  const go = (term: string) => {
    track("Search", { search: term });
    remember_(term);
    setQ(term);
    close();
    router.push(`/all?q=${encodeURIComponent(term)}`);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const term = q.trim();
    close();
    if (term) {
      track("Search", { search: term });
      remember_(term);
    }
    if (show && hits[act]) return router.push(productHref(hits[act]));
    if (!term) return router.push("/all");
    // a question (not a product name) goes through AI search; anything that fails falls back to the plain search
    if (ai && looksLikeQuestion(term)) {
      setBusy(true);
      const r = await aiSearch(term);
      setBusy(false);
      if (r) return router.push(aiHref(r));
    }
    router.push(allHref);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return close();
    if ((e.key !== "ArrowDown" && e.key !== "ArrowUp") || !hits.length) return;
    e.preventDefault();
    if (!show) return setOpen(true);
    // -1 is the input itself; wrap around past either end
    const j = act + (e.key === "ArrowDown" ? 1 : -1);
    const next = j >= hits.length ? -1 : j < -1 ? hits.length - 1 : j;
    setAct(next);
    document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: "nearest" });
  };

  return (
    <form ref={box} className={`search${panel ? " m-open" : ""}`} role="search" onSubmit={submit}>
      <input
        ref={input}
        role="combobox"
        aria-label="Search"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={show ? `${id}-list` : undefined}
        aria-activedescendant={show && act >= 0 ? `${id}-${act}` : undefined}
        autoComplete="off"
        placeholder={ai ? "Search or ask — e.g. gaming laptop under 1 lakh" : "Search products, brands, models…"}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setAct(-1); }}
        onFocus={() => { setOpen(true); setRecent(readRecent()); }}
        onKeyDown={onKey}
      />
      {ai && <span className="ai-tag" title="AI search: ask in Bangla or English">AI</span>}
      <button aria-label="Search" aria-busy={busy} disabled={busy}>{busy ? <span className="spin" /> : <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>}</button>
      {panel && <button type="button" className="search-x" aria-label="Close search" onClick={close}><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg></button>}

      {show && (
        <div className="sugg">
          {starters ? (
            <div className="sg-start">
              {recent.length > 0 && (
                <>
                  <span className="sg-h eyebrow">Recent</span>
                  <ul className="sg-terms">
                    {recent.map((t) => (
                      <li key={`r-${t}`}>
                        <button type="button" onClick={() => go(t)}>
                          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>{t}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <span className="sg-h eyebrow">Popular</span>
              <ul className="sg-terms">
                {POPULAR_SEARCHES.map((t) => (
                  <li key={`p-${t}`}>
                    <button type="button" onClick={() => go(t)}>
                      <svg viewBox="0 0 24 24"><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>{t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : hits.length ? (
            <>
              <span className="sg-h eyebrow">Products</span>
              <ul role="listbox" id={`${id}-list`} aria-label="Product suggestions">
                {hits.map((p, i) => (
                  <li key={p.id} id={`${id}-${i}`} role="option" aria-selected={i === act}>
                    <Link href={productHref(p)} tabIndex={-1} className={i === act ? "on" : ""} onClick={close} onMouseEnter={() => setAct(i)}>
                      <span className="sg-img"><ProductArt p={p} /></span>
                      <span className="sg-txt"><b>{mark(p.name, words)}</b><small>{catOf(p).name}{p.spec && ` · ${p.spec}`}</small></span>
                      <span className="sg-price">{callForPrice(p) ? <b>Call for price</b> : <><b>{tk(p.price)}</b>{p.old && <s>{tk(p.old)}</s>}</>}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={allHref} className="sg-all" onClick={close}>
                {total > hits.length ? `See all ${total} results` : "Show results page"} for “{q.trim()}” →
              </Link>
            </>
          ) : (
            <p className="sg-none">No products match “{q.trim()}”. Try a brand or model name.</p>
          )}
        </div>
      )}
    </form>
  );
}
