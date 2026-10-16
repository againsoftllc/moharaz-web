"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { pad2 } from "@/lib/data";
import type { HomeSlide } from "@/lib/shop/api";
import { ChevL, ChevR } from "./Icon";

/** The home slider: the slides set in AgainERP (homepage hero — images from the media library, i.e. Cloudflare R2),
    else the built-in ones. The slider takes the first slide's proportions; phones crop to a taller frame. */
export default function Hero({ slides: fromErp }: { slides?: HomeSlide[] | null }) {
  const slides = fromErp ?? [];
  const [si, setSi] = useState(0);
  // bumps on every navigation so the progress bar remounts and restarts
  const [run, setRun] = useState(0);
  const n = slides.length;

  const go = (d: number) => {
    setSi((v) => (v + d + n) % n);
    setRun((r) => r + 1);
  };

  useEffect(() => {
    const id = setTimeout(() => go(1), 6000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  if (!n) return null;

  return (
    <section className="wrap hero" aria-label="Featured offers">
      <div className="slider" style={{ "--slide-ratio": `${slides[0].w} / ${slides[0].h}` } as CSSProperties}>
        <div id="slides">
          {slides.map((b, i) => (
            <Link key={`${i}-${b.src}`} href={b.href} className={`slide ${i === si ? "on" : ""}`} aria-label={b.alt} aria-hidden={i !== si} tabIndex={i === si ? 0 : -1}>
              {/* the built-in banners come in 1000 / 1600 px copies (a phone no longer loads the 2828 px original);
                  on phones (<=680px) the frame is cropped to 23:10, so the picture is ~1.17× as wide as the screen.
                  R2 images are served as they are (already web-sized) */}
              {/^\/banner-[\w-]+\.webp$/.test(b.src) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.src.replace(".webp", "-1600.webp")}
                  srcSet={`${b.src.replace(".webp", "-1000.webp")} 1000w, ${b.src.replace(".webp", "-1600.webp")} 1600w, ${b.src} 2828w`}
                  sizes="(max-width: 680px) 117vw, (max-width: 1320px) 100vw, 1320px"
                  alt={b.alt}
                  width={b.w}
                  height={b.h}
                  decoding="async"
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
              ) : (
                <Image src={b.src} alt={b.alt} fill sizes="(max-width: 1320px) 100vw, 1320px" priority={i === 0} />
              )}
            </Link>
          ))}
        </div>
        <button className="harrow l" onClick={() => go(-1)} aria-label="Previous"><ChevL /></button>
        <button className="harrow r" onClick={() => go(1)} aria-label="Next"><ChevR /></button>
        <div className="counter" id="counter">{pad2(si + 1)} <span>/ {pad2(n)}</span></div>
        <div className="progress run" id="prog" key={run} />
      </div>
    </section>
  );
}
