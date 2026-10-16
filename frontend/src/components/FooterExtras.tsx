"use client";

import { useSyncExternalStore } from "react";
import { STORE_HOURS } from "@/lib/stores";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const clock = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

/** open / closing soon / closed, from the store schedule at `ms` */
function storeStatus(ms: number) {
  const { open, close, closedDay } = STORE_HOURS;
  // Dhaka is UTC+6 all year (no DST), so shifting the epoch gives local wall time
  const d = new Date(ms + 6 * 3_600_000);
  const day = d.getUTCDay(), mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  const workday = day !== closedDay;

  if (workday && mins >= open * 60 && mins < close * 60)
    return close * 60 - mins <= 60
      ? { tone: "soon", head: "Closing soon", tail: `open until ${clock(close)}` }
      : { tone: "open", head: "Open now", tail: `until ${clock(close)} today` };
  if (workday && mins < open * 60) return { tone: "closed", head: "Closed now", tail: `opens today at ${clock(open)}` };

  let next = (day + 1) % 7;
  if (next === closedDay) next = (next + 1) % 7;
  const when = next === (day + 1) % 7 ? "tomorrow" : DAYS[next];
  return { tone: "closed", head: workday ? "Closed now" : "Closed today", tail: `opens ${when} at ${clock(open)}` };
}

const tick = (cb: () => void) => { const id = setInterval(cb, 30_000); return () => clearInterval(id); };
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;

/** live store status pill; hidden during SSR so it never shows the server's clock */
export function StoreStatus() {
  const now = useSyncExternalStore(tick, minuteNow, () => null);
  if (now === null) return <p className="fv-status pending" aria-hidden>&nbsp;</p>;
  const s = storeStatus(now);
  return <p className={`fv-status ${s.tone}`}><i /><b>{s.head}</b>· {s.tail}</p>;
}

export function ToTop() {
  return (
    <button className="totop" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">
      <svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6" /></svg>
    </button>
  );
}
