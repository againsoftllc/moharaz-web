"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { bannersFor, type Banner } from "@/lib/banners";
import { ChevL, ChevR } from "../Icon";

const DELAY = 5000;
const SIZES = "(max-width: 1320px) 100vw, 1000px";

/** a category's promo banner; links to the banner's own `href`, else to `href` when given. Two or more rotate as a carousel. */
export default function CategoryBanner({ cat, href, eager }: { cat?: string; href?: string; eager?: boolean }) {
  const list = bannersFor(cat);
  if (!list.length) return null;
  if (list.length > 1) return <Carousel list={list} href={href} eager={eager} />;
  const b = list[0];
  const img = <Image src={b.src} alt={b.alt} width={b.w} height={b.h} sizes={SIZES} loading={eager ? "eager" : "lazy"} />;
  const to = b.href ?? href;
  return to ? <Link href={to} className="cat-banner">{img}</Link> : <div className="cat-banner">{img}</div>;
}

/* slides share one grid cell and cross-fade, so every image sits in view and lazy-loads with the first */
function Carousel({ list, href, eager }: { list: Banner[]; href?: string; eager?: boolean }) {
  const n = list.length;
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const go = (i: number) => setAt((i + n) % n);

  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setAt((v) => (v + 1) % n), DELAY);
    return () => clearTimeout(id);
  }, [at, paused, n]);

  return (
    <div
      className="cat-banner cb-car" role="region" aria-roledescription="carousel" aria-label="Offers"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? e.changedTouches[0].clientX);
        touchX.current = null;
        if (Math.abs(dx) > 40) go(at + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="cb-slides">
        {list.map((b, i) => {
          const on = i === at;
          const img = <Image src={b.src} alt={b.alt} width={b.w} height={b.h} sizes={SIZES} loading={eager && i === 0 ? "eager" : "lazy"} draggable={false} />;
          const to = b.href ?? href;
          const props = { className: `cb-slide${on ? " on" : ""}`, "aria-hidden": !on || undefined };
          return to
            ? <Link key={i} href={to} {...props} tabIndex={on ? undefined : -1}>{img}</Link>
            : <div key={i} {...props}>{img}</div>;
        })}
      </div>
      <button className="cb-arrow l" onClick={() => go(at - 1)} aria-label="Previous banner"><ChevL /></button>
      <button className="cb-arrow r" onClick={() => go(at + 1)} aria-label="Next banner"><ChevR /></button>
      <div className="cb-dots">
        {list.map((_, i) => (
          <button key={i} className={i === at ? "on" : undefined} onClick={() => go(i)} aria-label={`Banner ${i + 1} of ${n}`} aria-current={i === at || undefined} />
        ))}
      </div>
    </div>
  );
}
