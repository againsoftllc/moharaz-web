"use client";

/* The printable quotation of a PC build (/pc-builder/print?b=<build code>): the shop's logo and contacts, a quote
   number and date, every part with quantity and price, the totals and the estimated power — for a customer to
   print or save as PDF and bring along. Only the quotation prints (builder.css @media print); its head and foot are
   divs because the compare page's print style hides every <header> / <footer>. */

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { SLOTS, applySlots, decodeBuild, encodeBuild, pickedIn, power, type Build, type SlotDef } from "@/lib/builder";
import { tk } from "@/lib/data";
import { productById } from "@/lib/shop/api";
import { findProduct, remember } from "@/lib/shop/registry";
import { BRANCHES, PHONES } from "@/lib/stores";
import { SITE_HOST } from "@/lib/site";

const KEY = "moharaz-build";
/** how long the quoted prices hold */
const VALID_DAYS = 3;

const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** a short, stable quote number for a build on a day: UT-Q-YYMMDD-XXXX */
function quoteNo(code: string, d: Date) {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `UT-Q-${ymd}-${(h % 46656).toString(36).toUpperCase().padStart(3, "0")}`;
}

export default function BuildQuote({ slots }: { slots?: SlotDef[] }) {
  // the admin's slots, before any lookup
  useState(() => { if (slots) applySlots(slots); return true; });
  const [build, setBuild] = useState<Build | null>(null);
  const [, setLoaded] = useState(0);
  const [today] = useState(() => new Date());

  // the build: the ?b= code, else the one saved in this browser; then its products from the catalogue
  useEffect(() => {
    let b: Build = {};
    try {
      const shared = new URLSearchParams(window.location.search).get("b");
      b = shared ? decodeBuild(shared) : (JSON.parse(localStorage.getItem(KEY) ?? "null")?.build ?? {});
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBuild(b);
    const missing = [...new Set(Object.values(b).flat().map((x) => x!.id))].filter((id) => typeof id === "string" && !findProduct(id)) as string[];
    if (missing.length) {
      void Promise.all(missing.map(productById)).then((found) => {
        remember(...found.filter((p) => p !== null));
        setLoaded((n) => n + 1);
      });
    }
  }, []);

  const lines = useMemo(() => (build ? SLOTS.flatMap((s) => pickedIn(build, s.key)) : []), [build]);
  const loading = build !== null && lines.length < Object.values(build).flat().length;
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const watts = build ? power(build) : { draw: 0, recommended: 0 };
  const code = build ? encodeBuild(build) : "";
  const valid = new Date(today);
  valid.setDate(valid.getDate() + VALID_DAYS);
  const showroom = BRANCHES[0];

  return (
    <div className="wrap quote-page">
      <div className="quote-bar no-print">
        <Link href="/pc-builder" className="btn btn-line">← Back<span className="q-long"> to the builder</span></Link>
        <button className="btn btn-red" onClick={() => window.print()} disabled={!lines.length}>
          <svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
          Print / <span className="q-long">Save as </span>PDF
        </button>
      </div>

      <article className="quote">
        <div className="q-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/moharaz-logo.png" alt="Moharaz" className="q-logo" />
          <div className="q-shop">
            <b>Moharaz</b>
            {/* lines break only between the address parts / phone numbers, never inside one */}
            <span>{showroom.address.split(", ").map((part, i) => <Fragment key={i}>{i ? ", " : ""}<i>{part}</i></Fragment>)}</span>
            <span>{PHONES.slice(0, 2).map(([label, n], i) => <Fragment key={label}>{i ? " · " : ""}<i>{label}: {n}</i></Fragment>)}</span>
            <span>{SITE_HOST}</span>
          </div>
        </div>

        <div className="q-title">
          <h1>PC Build Quotation</h1>
          <dl>
            <div><dt>Quote no.</dt><dd>{code ? quoteNo(code, today) : "—"}</dd></div>
            <div><dt>Date</dt><dd>{fmtDate(today)}</dd></div>
            <div><dt>Valid until</dt><dd>{fmtDate(valid)}</dd></div>
          </dl>
        </div>
        <p className="q-for">Prepared for: <span /></p>

        {build === null || loading ? (
          <p className="q-empty">Loading your build…</p>
        ) : !lines.length ? (
          <p className="q-empty">Your build is empty. <Link href="/pc-builder">Add parts in the PC Builder</Link>, then print the quotation.</p>
        ) : (
          <table className="q-table">
            <thead>
              <tr><th className="q-sl">SL</th><th className="q-comp">Component</th><th>Product</th><th className="n">Qty</th><th className="n">Unit price</th><th className="n">Total</th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={`${l.slot.key}-${l.product.id}`}>
                  <td className="q-sl">{i + 1}</td>
                  <td className="q-comp">{l.slot.label}</td>
                  <td className="q-prod"><small className="q-comp-m">{l.slot.label}</small><b>{l.product.name}</b></td>
                  <td className="n q-qty">{l.qty}</td>
                  <td className="n q-unit">{tk(l.product.price)}</td>
                  <td className="n q-sum">{tk(l.product.price * l.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {lines.length > 0 && !loading && (
          <p className="q-total"><span>Total ({lines.reduce((s, l) => s + l.qty, 0)} items)</span><b>{tk(total)}</b></p>
        )}

        {lines.length > 0 && (
          <p className="q-power">Estimated power draw {watts.draw}W · recommended PSU {watts.recommended}W or more</p>
        )}

        {/* the page's foot (printed: the bottom of the A4 sheet) — where the customer and the shop sign, then the terms */}
        <div className="q-end">
          <div className="q-sign">
            <div><span />Customer signature</div>
            <div><span />Authorized signature</div>
          </div>
          <div className="q-foot">
            <p>Prices include VAT and hold until {fmtDate(valid)}; stock and prices can change — please confirm with us before buying. Assembly, delivery and installation are quoted separately.</p>
            {code && <p className="no-print">Open this build online: <Link href={`/pc-builder?b=${code}`}>/pc-builder?b={code}</Link></p>}
          </div>
        </div>
      </article>
    </div>
  );
}
