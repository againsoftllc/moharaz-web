"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Product } from "@/lib/products";
import { toProduct, type ApiListProduct } from "@/lib/shop/api";
import { remember } from "@/lib/shop/registry";
import ProductCard from "./ProductCard";

/* The AI shopping assistant: GPT in the AgainERP API reads the shop's own catalogue (search, product
   specifications, categories) and answers from it — the reply, the products it recommends (real catalogue rows,
   shown as the usual product cards) and follow-up questions. The conversation stays on this page. */

type Turn = { role: "user" | "assistant"; content: string; products?: Product[]; followUps?: string[] };
type Reply = { answer: string; products: ApiListProduct[]; follow_ups: string[] } | null;

export default function AiAssistant({ question }: { question: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState(false);
  const [draft, setDraft] = useState("");
  const asked = useRef(false);

  const ask = useCallback(async (text: string, history: Turn[]) => {
    const q = text.trim();
    if (!q) return;
    const next: Turn[] = [...history, { role: "user", content: q }];
    setTurns(next);
    setBusy(true);
    try {
      const r = await fetch("/api/v1/storefront/ai-search/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      if (r.status === 429) {
        setTurns([...next, { role: "assistant", content: "Too many questions — please try again in a minute." }]);
        return;
      }
      const data = r.ok ? ((await r.json()) as { data: Reply }).data : null;
      if (!data) {
        setOff(history.length === 0);
        if (history.length) setTurns([...next, { role: "assistant", content: "Sorry, the assistant could not answer that right now." }]);
        return;
      }
      const products = data.products.map(toProduct);
      remember(...products);
      setTurns([...next, { role: "assistant", content: data.answer || "I couldn't find a good match in our catalogue.", products, followUps: data.follow_ups }]);
    } catch {
      setTurns([...next, { role: "assistant", content: "Sorry, the assistant could not answer that right now." }]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void ask(question, []);
  }, [ask, question]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const text = draft;
    setDraft("");
    void ask(text, turns);
  };

  if (off) return null;
  const last = turns[turns.length - 1];
  return (
    <section className="ai-chat" aria-label="AI shopping assistant" aria-live="polite">
      <header><span className="ai-tag">AI</span><b>Shopping assistant</b><small>Answers from our live catalogue — prices and stock as of now</small></header>
      <div className="ai-turns">
        {turns.map((t, i) => (
          <div key={i} className={`ai-turn ${t.role}`}>
            <p>{t.content}</p>
            {t.products?.length ? <div className="ai-products">{t.products.map((p) => <ProductCard key={p.slug} p={p} />)}</div> : null}
          </div>
        ))}
        {busy && <div className="ai-turn assistant"><p className="ai-thinking"><span /><span /><span /> Checking the catalogue…</p></div>}
      </div>
      {!busy && last?.role === "assistant" && last.followUps?.length ? (
        <div className="ai-follow">{last.followUps.map((f) => <button key={f} type="button" onClick={() => void ask(f, turns)}>{f}</button>)}</div>
      ) : null}
      <form className="ai-ask" onSubmit={submit}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask a follow-up — e.g. which one has better battery?" maxLength={300} disabled={busy} />
        <button className="btn btn-red" disabled={busy || !draft.trim()}>Ask</button>
      </form>
    </section>
  );
}
