"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FONT, PROMOS, ic, pad2 } from "@/lib/data";
import RailNav from "./RailNav";

export default function Promotions() {
  const [left, setLeft] = useState(() => PROMOS.map((p) => p[6] - 1));

  useEffect(() => {
    if (!PROMOS.some((p) => p[6])) return;
    const id = setInterval(() => setLeft((l) => l.map((t) => t - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="wrap sec" id="deals">
      <div className="head"><div><span className="eyebrow">Live now</span><h2>Latest Promotions</h2></div><RailNav id="promos" /></div>
      <div className="rail promos" id="promos">
        {PROMOS.map((p, i) => {
          const t = left[i];
          return (
            <Link key={i} href={p[7]} className="promo">
              <svg viewBox="0 0 320 400" preserveAspectRatio="xMidYMid slice">
                <defs><linearGradient id={`p${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p[3]} /><stop offset="1" stopColor={p[4]} /></linearGradient></defs>
                <rect width="320" height="400" fill={`url(#p${i})`} />
                <text x="24" y="56" fontFamily={FONT} fontWeight="800" fontSize="26" fill="#fff">{p[0]}</text>
                <text x="24" y="88" fontFamily={FONT} fontWeight="800" fontSize="26" fill="#fff">{p[1]}</text>
                <text x="24" y="116" fontFamily={FONT} fontSize="13" fill="#e4e4e7">{p[2]}</text>
                <g transform="translate(70 170) scale(7.5)" stroke="#fff" strokeOpacity=".9" fill="none" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ic[p[5]] }} />
              </svg>
              <div className="time">
                {p[6] ? (
                  <>
                    <small>ENDS IN</small><b>Offer ends soon</b>
                    <div className="cd" suppressHydrationWarning>
                      {([[(t / 86400) | 0, "DAYS"], [((t % 86400) / 3600) | 0, "HRS"], [((t % 3600) / 60) | 0, "MIN"], [t % 60, "SEC"]] as const).map(([v, l]) => (
                        <span key={l}>{pad2(v)}<em>{l}</em></span>
                      ))}
                    </div>
                  </>
                ) : (
                  <><small>ONGOING</small><b>No end date</b><span className="ongoing">While stock lasts</span></>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
