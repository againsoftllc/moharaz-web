"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import type { Question, Review } from "@/lib/productInfo";
import type { Product, SpecGroup } from "@/lib/products";
import { useAuth } from "../auth/AuthProvider";
import RailNav from "../RailNav";
import ProductCard from "../shop/ProductCard";

type Tab = "specs" | "overview" | "reviews" | "questions" | "also" | "best";
const TABS: [Tab, string][] = [["specs", "Specifications"], ["overview", "Overview"], ["reviews", "Reviews"], ["questions", "Questions"], ["also", "Customers Also Bought"], ["best", "Bestsellers"]];

export const Stars = ({ n, size = 14 }: { n: number; size?: number }) => (
  <span className="stars" style={{ ["--pct" as string]: `${(n / 5) * 100}%`, fontSize: size }} aria-label={`${n} out of 5 stars`}>★★★★★</span>
);

const REVIEWS_PAGE = 5;
const isWarranty = (s: string) => /warrant/i.test(s);
/** the warranty always comes last: its own group, or warranty rows found in other groups, gathered into one group at the end */
function warrantyLast(groups: SpecGroup[]): SpecGroup[] {
  const w: [string, string][] = [];
  let wName = "Warranty Information";
  const rest = groups.flatMap((g) => {
    if (isWarranty(g.name)) {
      wName = g.name;
      w.push(...g.rows);
      return [];
    }
    w.push(...g.rows.filter(([k]) => isWarranty(k)));
    const rows = g.rows.filter(([k]) => !isWarranty(k));
    return rows.length ? [{ ...g, rows }] : [];
  });
  return w.length ? [...rest, { name: wName, rows: w }] : rest;
}
type ReviewSort = "new" | "high" | "low";
const RATING_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];
/** "2026-10-12" → "12 Oct 2026" */
const niceDate = (d: string) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

/** All product sections stacked open; the sticky bar jumps to one and follows the one being read. */
/** `specGroups` (real catalogue) shows the specification table in titled blocks; `overviewHtml` is the store's own description */
/** a review / question goes to the store's admin (AgainERP), which shows it once the team approves / answers it */
async function postToStore(slug: string, what: "reviews" | "qa", body: object): Promise<string | null> {
  try {
    const res = await fetch(`/api/v1/storefront/products/by-slug/${encodeURIComponent(slug)}/${what}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const err = await res.json().catch(() => null);
    const detail = err?.detail;
    return typeof detail === "string" ? detail : "Couldn't send it — please try again.";
  } catch {
    return "Couldn't send it — check your connection and try again.";
  }
}

/** `slug`: a real catalogue product — reviews and questions are sent to the store (demo products keep them on the page) */
export default function InfoTabs({ slug, name, overview, overviewHtml, seoText, specs, specGroups, questions, faq = [], reviews, avg, count, also = [], best = [], bestTitle }: {
  slug?: string; name: string; overview: string; overviewHtml?: string; seoText?: ReactNode; specs: [string, string][]; specGroups?: SpecGroup[];
  questions: Question[]; faq?: Question[]; reviews: Review[]; avg: number; count: number;
  /** real sales: what goes with this product, and its category's bestsellers (with the rail's title) */
  also?: Product[]; best?: Product[]; bestTitle?: string;
}) {
  const filled: Partial<Record<Tab, number>> = { also: also.length, best: best.length };
  const tabs = TABS.filter(([k]) => filled[k] ?? 1);
  const [tab, setTab] = useState<Tab>("specs");
  // while a click is smooth-scrolling, ignore the sections it passes on the way
  const jumping = useRef(0);
  const [mine, setMine] = useState<Review[]>([]);
  const [stars, setStars] = useState(5);
  const [hover, setHover] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [only, setOnly] = useState<number | null>(null);
  const [sort, setSort] = useState<ReviewSort>("new");
  const [shown, setShown] = useState(REVIEWS_PAGE);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [qs, setQs] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [qOpen, setQOpen] = useState(false);
  const [qFind, setQFind] = useState("");
  const [qShown, setQShown] = useState(REVIEWS_PAGE);
  const [sending, setSending] = useState<"review" | "question" | null>(null);
  const [note, setNote] = useState<{ on: "review" | "question"; text: string; bad: boolean } | null>(null);
  const { user, openModal } = useAuth();
  const all = [...mine, ...reviews];
  // the list as filtered (a star bar) and sorted
  const shownList = all
    .filter((r) => !only || Math.round(r.stars) === only)
    .sort((x, y) => (sort === "high" ? y.stars - x.stars : sort === "low" ? x.stars - y.stars : y.date.localeCompare(x.date)));
  /** signed in: open the form; otherwise sign in first */
  const writeReview = () => {
    if (!user) return openModal("login");
    // the signed-in customer's name, filled in (still editable)
    setAuthor((cur) => cur || user.name || "");
    setFormOpen(true);
    setTimeout(() => document.querySelector<HTMLTextAreaElement>(".pd-rform textarea")?.focus(), 50);
  };

  useEffect(() => {
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
      if (Date.now() < jumping.current) return;
      const first = TABS.find(([k]) => seen.get(`pd-${k}`));
      if (first) setTab(first[0]);
    }, { rootMargin: "-210px 0px -55% 0px" });
    TABS.forEach(([k]) => { const el = document.getElementById(`pd-${k}`); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const jump = (k: Tab) => (e: MouseEvent) => {
    e.preventDefault();
    setTab(k);
    // hold the highlight on `k` until the scroll is over (a long trip outlasts any fixed delay)
    jumping.current = Date.now() + 5000;
    const el = document.getElementById(`pd-${k}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    const whenStopped = (fn: () => void) => ("onscrollend" in window ? window.addEventListener("scrollend", fn, { once: true }) : setTimeout(fn, 1000));
    // cards loading on the way can push the section down: when the scroll ends, finish the trip once
    let retried = false;
    const settle = () => {
      if (!retried && Math.abs(el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop)) >= 4) {
        retried = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return whenStopped(settle);
      }
      jumping.current = 0;
      setTab(k);
    };
    whenStopped(settle);
    history.replaceState(null, "", `#pd-${k}`);
  };
  const groups = specGroups?.length ? warrantyLast(specGroups) : [];
  const flat = [...specs.filter(([k]) => !isWarranty(k)), ...specs.filter(([k]) => isWarranty(k))];
  const half = Math.ceil(flat.length / 2);

  const submitReview = async (e: FormEvent) => {
    e.preventDefault();
    const by = author.trim() || user?.name || "";
    if (!user || text.trim().length < 10 || !by || sending) return;
    setSending("review");
    const err = slug ? await postToStore(slug, "reviews", { customer_name: by, rating: stars, body: text.trim() }) : null;
    setSending(null);
    setNote({ on: "review", text: err ?? "Thanks! Your review was sent — it appears here once our team approves it.", bad: !!err });
    if (err) return;
    setMine([{ name: by, stars, text: text.trim(), date: new Date().toISOString().slice(0, 10), verified: false, pending: !!slug }, ...mine]);
    setText(""); setFormOpen(false);
  };

  // the visitor's own questions (awaiting an answer) first, then the answered ones; the search box filters both
  const qaAll: (Question & { pending?: boolean })[] = [...qs.map((x) => ({ q: x, a: "", pending: true })), ...questions];
  const answered = questions.length;
  const qaShown = qFind.trim()
    ? qaAll.filter((x) => `${x.q} ${x.a}`.toLowerCase().includes(qFind.trim().toLowerCase()))
    : qaAll;
  /** signed in: open the form; otherwise sign in first */
  const askQuestion = () => {
    if (!user) return openModal("login");
    setQOpen(true);
    setTimeout(() => document.querySelector<HTMLTextAreaElement>(".pd-qa .pd-rform textarea")?.focus(), 50);
  };

  const submitQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || q.trim().length < 10 || sending) return;
    setSending("question");
    const err = slug ? await postToStore(slug, "qa", { customer_name: user.name || "Customer", question: q.trim() }) : null;
    setSending(null);
    setNote({ on: "question", text: err ?? "Thanks! Your question was sent — our team answers within 24 hours.", bad: !!err });
    if (err) return;
    setQs([q.trim(), ...qs]);
    setQ(""); setQOpen(false);
  };

  return (
    <section className="pd-tabs">
      <nav className="pd-tabbar" aria-label="Product details">
        <div className="wrap">
          {tabs.map(([k, l]) => (
            <a key={k} href={`#pd-${k}`} aria-current={tab === k ? "true" : undefined} className={tab === k ? "on" : ""} onClick={jump(k)}>
              {l}{k === "reviews" && <span>{count + mine.length}</span>}{k === "questions" && <span>{questions.length + qs.length}</span>}{k === "best" && <span>{best.length}</span>}
            </a>
          ))}
        </div>
      </nav>
      <div className="wrap pd-tabbody">
        <section id="pd-specs" className="pd-sec">
          <h2 className="pd-sec-h">Specifications</h2>
          {groups.length ? groups.map((g, gi) => {
            const mid = Math.ceil(g.rows.length / 2);
            return (
              <div key={`${gi}-${g.name}`} className="pd-specgrp">
                <h3 className="eyebrow">{g.name}</h3>
                <div className="pd-specs">
                  {[g.rows.slice(0, mid), g.rows.slice(mid)].map((col, c) => (
                    <table key={c}><tbody>{col.map(([k, v], i) => <tr key={k + i}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
                  ))}
                </div>
              </div>
            );
          }) : (
            <div className="pd-specs">
              {[flat.slice(0, half), flat.slice(half)].map((col, c) => (
                <table key={c}><tbody>{col.map(([k, v], i) => <tr key={k + i}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
              ))}
            </div>
          )}
          {/* low-key fine print: kept small and muted, but still readable */}
          <p className="pd-fine"><b>Disclaimer:</b> Product photos are for illustration only — the actual product may differ in colour, packaging or appearance. Specifications and features can change without notice from the manufacturer, so please confirm anything important with our team before you order. Prices, offers and stock are subject to change.</p>
        </section>
        <section id="pd-overview" className="pd-sec">
          <h2 className="pd-sec-h">Overview</h2>
          {/* the store's own description is HTML written in its admin */}
          {overviewHtml ? <div className="pd-ov" dangerouslySetInnerHTML={{ __html: overviewHtml }} /> : <div className="pd-ov"><p>{overview}</p></div>}
          {/* "Buy … from Moharaz": written per product (ProductSeoText), with links to its brand and categories */}
          {seoText}
        </section>
        <section id="pd-reviews" className="pd-sec">
          <h2 className="pd-sec-h">Reviews <span>{count + mine.length}</span></h2>
          <div className="pd-reviews">
            <div className="pd-rsum">
              {all.length ? (
                <>
                  <div className="pd-rscore"><b>{(count ? avg : all.reduce((s, r) => s + r.stars, 0) / all.length).toFixed(1)}</b><span>out of 5</span></div>
                  <Stars n={count ? avg : all.reduce((s, r) => s + r.stars, 0) / all.length} size={20} />
                  <span className="pd-rbased">Based on {count + mine.length} review{count + mine.length === 1 ? "" : "s"}</span>
                  {/* how the ratings spread — a bar filters the list to those stars */}
                  <ul className="pd-rbars">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const k = all.filter((r) => Math.round(r.stars) === n).length;
                      return (
                        <li key={n}>
                          <button type="button" className={only === n ? "on" : ""} onClick={() => { setOnly(only === n ? null : n); setShown(REVIEWS_PAGE); }} disabled={!k} aria-pressed={only === n}>
                            <span>{n} ★</span><i><s style={{ width: `${all.length ? (k / all.length) * 100 : 0}%` }} /></i><em>{k}</em>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <div className="pd-rnone">
                  <Stars n={0} size={22} />
                  <b>No reviews yet</b>
                  <span>Bought the {name.split(" ").slice(0, 3).join(" ")}? Share your experience to help other buyers.</span>
                </div>
              )}

              {formOpen && user ? (
                <form onSubmit={submitReview} className="pd-rform">
                  <h4>Write a review</h4>
                  <div className="pd-pick-row">
                    <div className="pd-pick" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button type="button" key={n} role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
                          className={n <= (hover || stars) ? "on" : ""} onMouseEnter={() => setHover(n)} onClick={() => setStars(n)}>★</button>
                      ))}
                    </div>
                    <span className="pd-pick-l">{RATING_LABELS[(hover || stars) - 1]}</span>
                  </div>
                  <label className="pd-rfield"><span>Your name</span>
                    <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={user.name || "Your name"} />
                  </label>
                  <label className="pd-rfield"><span>Your review <em className={text.trim().length >= 10 ? "ok" : ""}>{text.trim().length}/10+</em></span>
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={`What did you like or dislike about the ${name.split(" ").slice(0, 3).join(" ")}?`} />
                  </label>
                  <div className="pd-rform-btns">
                    <button type="button" className="btn btn-line" onClick={() => setFormOpen(false)}>Cancel</button>
                    <button className="btn btn-red" disabled={text.trim().length < 10 || !(author.trim() || user.name) || !!sending}>
                      {sending === "review" ? "Sending…" : "Post review"}
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" className="btn btn-red pd-rwrite" onClick={writeReview}>
                  <svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                  {user ? "Write a review" : "Log in to write a review"}
                </button>
              )}
              {note?.on === "review" && <p className={`pd-rmsg ${note.bad ? "bad" : ""}`} role="status">{note.text}</p>}
            </div>

            <div className="pd-rmain">
              {all.length > 1 && (
                <div className="pd-rtools">
                  <span>{only ? `${shownList.length} review${shownList.length === 1 ? "" : "s"} with ${only} ★` : `${all.length} reviews`}</span>
                  {only && <button type="button" className="pd-rclear" onClick={() => setOnly(null)}>Show all</button>}
                  <label>Sort
                    <select value={sort} onChange={(e) => setSort(e.target.value as ReviewSort)}>
                      <option value="new">Newest</option><option value="high">Highest rated</option><option value="low">Lowest rated</option>
                    </select>
                  </label>
                </div>
              )}
              {shownList.length ? (
                <ul className="pd-rlist">
                  {shownList.slice(0, shown).map((r, i) => (
                    <li key={`${r.date}-${r.name}-${i}`}>
                      <div className="pd-rhead">
                        <span className="pd-ravatar" aria-hidden>{(r.name.trim()[0] ?? "?").toUpperCase()}</span>
                        <span className="pd-rwho"><b>{r.name}</b><time dateTime={r.date}>{niceDate(r.date)}</time></span>
                        {r.verified && <em>✓ Verified purchase</em>}
                        {r.pending && <em className="pend">Pending approval</em>}
                      </div>
                      <Stars n={r.stars} />
                      <p>{r.text}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="pd-rempty">
                  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></svg>
                  <b>Be the first to review this product</b>
                  <span>Your review helps other customers choose with confidence.</span>
                  <button type="button" className="btn btn-line" onClick={writeReview}>{user ? "Write a review" : "Log in to write a review"}</button>
                </div>
              )}
              {shownList.length > shown && (
                <button type="button" className="btn btn-line pd-rmore" onClick={() => setShown((n) => n + REVIEWS_PAGE)}>
                  Show more reviews ({shownList.length - shown} more)
                </button>
              )}
            </div>
          </div>
        </section>
        <section id="pd-questions" className="pd-sec">
          <h2 className="pd-sec-h">Questions <span>{questions.length + qs.length}</span></h2>
          <div className="pd-reviews pd-qa">
            <div className="pd-rsum">
              <div className="pd-rnone">
                <span className="pd-qicon" aria-hidden>?</span>
                <b>{answered ? `${answered} question${answered === 1 ? "" : "s"} answered` : "No questions yet"}</b>
                <span>Not sure about compatibility, warranty or delivery? Ask — our team answers within 24 hours.</span>
              </div>

              {qOpen && user ? (
                <form onSubmit={submitQuestion} className="pd-rform">
                  <h4>Ask a question</h4>
                  <label className="pd-rfield"><span>Your question <em className={q.trim().length >= 10 ? "ok" : ""}>{q.trim().length}/10+</em></span>
                    <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={4} placeholder={`e.g. Is the ${name.split(" ").slice(0, 3).join(" ")} compatible with…?`} />
                  </label>
                  <div className="pd-rform-btns">
                    <button type="button" className="btn btn-line" onClick={() => setQOpen(false)}>Cancel</button>
                    <button className="btn btn-red" disabled={q.trim().length < 10 || !!sending}>{sending === "question" ? "Sending…" : "Post question"}</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="btn btn-red pd-rwrite" onClick={askQuestion}>
                  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M9.5 8.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 15h.01" /></svg>
                  {user ? "Ask a question" : "Log in to ask a question"}
                </button>
              )}
              {note?.on === "question" && <p className={`pd-rmsg ${note.bad ? "bad" : ""}`} role="status">{note.text}</p>}
            </div>

            <div className="pd-rmain">
              {qaAll.length > 1 && (
                <div className="pd-rtools">
                  <span>{qFind.trim() ? `${qaShown.length} of ${qaAll.length} questions` : `${qaAll.length} questions`}</span>
                  <label className="pd-qfind">
                    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                    <input value={qFind} onChange={(e) => { setQFind(e.target.value); setQShown(REVIEWS_PAGE); }} placeholder="Search questions…" aria-label="Search questions" />
                  </label>
                </div>
              )}
              {qaShown.length ? (
                <ul className="pd-rlist pd-qlist">
                  {qaShown.slice(0, qShown).map((x, i) => (
                    <li key={`${i}-${x.q}`}>
                      <div className="pd-rhead">
                        <span className="pd-ravatar" aria-hidden>Q</span>
                        <b className="pd-qq">{x.q}</b>
                        {x.pending && <em className="pend">Awaiting answer</em>}
                      </div>
                      {x.pending ? (
                        <p className="pd-qwait">Our team usually answers within 24 hours.</p>
                      ) : (
                        <div className="pd-qans">
                          <span className="pd-ravatar" aria-hidden>A</span>
                          <div><small>Moharaz team</small><p>{x.a}</p></div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : qaAll.length ? (
                <div className="pd-rempty">
                  <b>No questions match “{qFind.trim()}”</b>
                  <button type="button" className="btn btn-line" onClick={() => setQFind("")}>Show all questions</button>
                </div>
              ) : faq.length ? null : (
                // no questions yet: the common questions below stand in; this only shows when there are none of those either
                <div className="pd-rempty">
                  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M9.5 8.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 15h.01" /></svg>
                  <b>Be the first to ask</b>
                  <span>Questions and answers help other customers choose with confidence.</span>
                  <button type="button" className="btn btn-line" onClick={askQuestion}>{user ? "Ask a question" : "Log in to ask a question"}</button>
                </div>
              )}
              {qaShown.length > qShown && (
                <button type="button" className="btn btn-line pd-rmore" onClick={() => setQShown((n) => n + REVIEWS_PAGE)}>
                  Show more questions ({qaShown.length - qShown} more)
                </button>
              )}
              {faq.length > 0 && (
                <>
                  <h4 className="pd-faq-h">Common questions</h4>
                  <div className="pd-faq">
                    {faq.map((x, i) => <details key={`${i}-${x.q}`}><summary>{x.q}</summary><p>{x.a}</p></details>)}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
        {also.length > 0 && (
          <section id="pd-also" className="pd-sec">
            <header className="pd-sec-h pd-rel-h"><h2>Customers Also Bought</h2><RailNav id="pd-also-rail" /></header>
            <div className="rail together" id="pd-also-rail">{also.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </section>
        )}
        {best.length > 0 && (
          <section id="pd-best" className="pd-sec">
            <header className="pd-sec-h pd-rel-h"><h2>{bestTitle || "Category Bestsellers"}</h2><span>{best.length}</span><RailNav id="pd-best-rail" /></header>
            <div className="rail together" id="pd-best-rail">{best.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </section>
        )}
      </div>
    </section>
  );
}
