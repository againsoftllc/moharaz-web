"use client";

import { useId, useSyncExternalStore } from "react";
import { offerEnd } from "@/lib/productInfo";
import type { Product } from "@/lib/products";

/* one shared 1-second clock for every countdown on the page */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function subscribe(cb: () => void) {
  listeners.add(cb);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size) { clearInterval(timer); timer = undefined; }
  };
}
const second = () => Math.floor(Date.now() / 1000) * 1000;
/** the current time, ticking every second; null during SSR so a countdown never shows the server's clock */
const useNow = () => useSyncExternalStore(subscribe, second, () => null);

const pad = (n: number) => String(n).padStart(2, "0");
const UNITS = ["Days", "Hrs", "Min", "Sec"];

/** time left on the product's offer: "1d 04:12:33", or `big` day/hour/min/sec boxes */
export function OfferTimer({ p, big }: { p: Product; big?: boolean }) {
  const now = useNow();
  const left = now === null ? null : Math.max(0, Math.floor((offerEnd(p, now) - now) / 1000));
  if (left === 0) return <span className="otimer over">Offer ended</span>;

  const t = left === null ? null : [Math.floor(left / 86400), Math.floor(left / 3600) % 24, Math.floor(left / 60) % 60, left % 60];
  if (big) return (
    <span className="otimer big" role="timer">
      {UNITS.map((u, i) => <span key={u}><b>{t ? pad(t[i]) : "--"}</b><small>{u}</small></span>)}
    </span>
  );
  return <span className="otimer" role="timer">{t ? `${t[0] ? `${t[0]}d ` : ""}${pad(t[1])}:${pad(t[2])}:${pad(t[3])}` : "--:--:--"}</span>;
}

/** round "trademark" stamp for a running offer — the label circles the rim around a bolt */
export function OfferSeal({ label }: { label: string }) {
  const id = useId();
  return (
    <svg className="oseal" viewBox="0 0 100 100" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff3b44" /><stop offset="1" stopColor="#a50b12" /></linearGradient>
        <path id={`${id}p`} d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1-72 0" />
      </defs>
      <circle cx="50" cy="50" r="49" fill={`url(#${id}g)`} />
      <circle cx="50" cy="50" r="45.5" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1" strokeDasharray="2 2.4" />
      <circle cx="50" cy="50" r="26" fill="#fff" fillOpacity=".12" stroke="#fff" strokeOpacity=".6" />
      <text fill="#fff" fontSize="10" fontWeight="800" fontFamily="inherit">
        <textPath href={`#${id}p`} textLength="224" lengthAdjust="spacing">{`${label.toUpperCase()} ★ `.repeat(2)}</textPath>
      </text>
      <path d="M54 33 41 52h9l-4 15 13-20h-9z" fill="#FFB020" />
    </svg>
  );
}
