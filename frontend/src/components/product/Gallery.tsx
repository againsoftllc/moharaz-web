"use client";

import { useState } from "react";
import { ic } from "@/lib/data";
import { catOf, type Product } from "@/lib/products";
import { OfferSeal } from "../shop/Offer";

const SHOTS = ["Front", "Angle", "Detail", "In the box", "Specs"];
/* with a real photo: the photo plus the drawn spec card */
const PHOTO = ["Photo", "Specs"];

/** One gallery shot: the real photo, or stand-ins drawn from the category icon when there is none. */
function Shot({ p, view }: { p: Product; view: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (p.image && view === 0) return <img className="art photo" src={p.image} alt={p.name} />;
  if (p.image) view = 4;
  const c = catOf(p);
  const id = `g${String(p.id).replace(/\W/g, "")}v${view}`;
  const icon = { __html: ic[c.icon] };
  const parts = p.spec.split(" · ");
  return (
    <svg className="art" viewBox="0 0 400 400" aria-hidden>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="60%"><stop offset="0" stopColor={c.color} stopOpacity={view === 2 ? ".45" : ".22"} /><stop offset="1" stopColor={c.color} stopOpacity="0" /></radialGradient>
      </defs>
      {view === 2 && <rect width="400" height="400" fill="#0c0c10" />}
      <rect width="400" height="400" fill={`url(#${id})`} />
      {view === 0 && <g transform="translate(80 70) scale(10)" stroke={c.color} fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={icon} />}
      {view === 1 && <g transform="translate(60 120) rotate(-14) scale(11)" stroke={c.color} fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={icon} />}
      {view === 2 && <g transform="translate(-40 -60) scale(17)" stroke={c.color} fill="none" strokeWidth=".7" strokeLinecap="round" strokeLinejoin="round" opacity=".9" dangerouslySetInnerHTML={icon} />}
      {view === 3 && (
        <g>
          <path d="M90 150 200 100 310 150 310 290 200 340 90 290Z" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="2" />
          <path d="M90 150 200 200 310 150M200 200v140" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="2" />
          <g transform="translate(110 190) rotate(22) scale(3.4)" stroke={c.color} fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={icon} />
          <text x="255" y="250" textAnchor="middle" fontWeight="800" fontSize="20" fill={c.color} transform="rotate(-24 255 250)">{p.brand.toUpperCase()}</text>
        </g>
      )}
      {view === 4 && (
        <g>
          <text x="40" y="80" fontWeight="800" fontSize="22" fill={c.color}>{p.brand.toUpperCase()}</text>
          {parts.map((t, i) => (
            <g key={`${i}-${t}`} transform={`translate(40 ${120 + i * 56})`}>
              <rect width="320" height="42" rx="10" fill="currentColor" fillOpacity=".06" />
              <text x="16" y="27" fontWeight="700" fontSize="17" fill="currentColor">{t}</text>
            </g>
          ))}
        </g>
      )}
      {view !== 4 && <text x="200" y="378" textAnchor="middle" fontWeight="800" fontSize="16" letterSpacing="3" fill={view === 2 ? "#fff" : "currentColor"} opacity=".4">{p.brand.toUpperCase()}</text>}
    </svg>
  );
}

/** `offer`: label of a running promotion, stamped on the photo corner */
export default function Gallery({ p, offer }: { p: Product; offer?: string | null }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  // real catalogue: every photo the store has, one per slide
  if (p.images && p.images.length > 0) return <Photos p={p} images={p.images} offer={offer} />;
  const VIEWS = p.image ? PHOTO : SHOTS;
  const go = (d: number) => setI((v) => (v + d + VIEWS.length) % VIEWS.length);

  return (
    <div className="pd-gallery">
      <div className={`pd-stage ${zoom ? "zoom" : ""}`} onClick={() => setZoom((z) => !z)} role="img" aria-label={`${p.name} — ${VIEWS[i]} view`}>
        <Shot p={p} view={i} />
        {offer && <span className="pd-seal"><OfferSeal label={offer} /></span>}
        <button className="harrow l" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous image"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></button>
        <button className="harrow r" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next image"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg></button>
        <span className="pd-count">{i + 1} / {VIEWS.length}</span>
      </div>
      <div className="pd-thumbs" role="tablist" aria-label="Product images">
        {VIEWS.map((v, k) => (
          <button key={v} role="tab" aria-selected={k === i} className={k === i ? "on" : ""} onClick={() => setI(k)} title={v}><Shot p={p} view={k} /></button>
        ))}
      </div>
    </div>
  );
}

/** the real product photos: main stage + thumbnail strip */
function Photos({ p, images, offer }: { p: Product; images: string[]; offer?: string | null }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const go = (d: number) => setI((v) => (v + d + images.length) % images.length);
  /* eslint-disable @next/next/no-img-element */
  return (
    <div className="pd-gallery">
      <div className={`pd-stage fit ${zoom ? "zoom" : ""}`} onClick={() => setZoom((z) => !z)} role="img" aria-label={`${p.name} — photo ${i + 1}`}>
        <img className="art photo" src={images[i]} alt={p.name} />
        {offer && <span className="pd-seal"><OfferSeal label={offer} /></span>}
        {images.length > 1 && <>
          <button className="harrow l" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous image"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></button>
          <button className="harrow r" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next image"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg></button>
        </>}
        <span className="pd-count">{i + 1} / {images.length}</span>
      </div>
      {images.length > 1 && (
        <div className="pd-thumbs fit" role="tablist" aria-label="Product images">
          {images.map((src, k) => (
            <button key={`${k}-${src}`} role="tab" aria-selected={k === i} className={k === i ? "on" : ""} onClick={() => setI(k)} title={`Photo ${k + 1}`}>
              <img className="art photo" src={src} alt={`${p.name} — photo ${k + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
  /* eslint-enable @next/next/no-img-element */
}
