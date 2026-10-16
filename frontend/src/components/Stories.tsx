"use client";

import { useEffect, useState } from "react";
import { STORIES, type Story } from "@/lib/data";
import { ChevL, ChevR } from "./Icon";
import RailNav from "./RailNav";

const Pic = ({ s, id }: { s: Story; id: string }) => (
  <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={s[2]} /><stop offset="1" stopColor="#0a0a0c" /></linearGradient></defs>
    <rect width="400" height="400" fill={`url(#s${id})`} />
    <circle cx="170" cy="165" r="62" fill={s[3]} opacity=".35" />
    <path d="M60 400c0-70 50-120 110-120s110 50 110 120z" fill={s[3]} opacity=".35" />
    <rect x="270" y="200" width="90" height="160" rx="8" fill="#0e0e11" stroke={s[3]} strokeOpacity=".6" />
  </svg>
);

export default function Stories() {
  const [cur, setCur] = useState(0);
  const [open, setOpen] = useState(false);
  // bumps on each open/step so the 5s auto-advance timer restarts
  const [tick, setTick] = useState(0);
  const n = STORIES.length;

  const op = (i: number) => { setCur(i); setOpen(true); setTick((t) => t + 1); };
  const st = (d: number) => { setCur((c) => (c + d + n) % n); setOpen(true); setTick((t) => t + 1); };
  const cl = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => st(1), 5000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tick]);

  const s = STORIES[cur];

  return (
    <section className="wrap sec">
      <div className="head"><div><span className="eyebrow">They love it</span><h2>Happy Customers</h2><p>আমাদের শোরুম থেকে কাস্টমারদের মুহূর্তগুলো</p></div><RailNav id="stories" /></div>
      <div className="rail stories" id="stories">
        {STORIES.map((s, i) => (
          // opens the viewer, not a page: a button for crawlers and keyboards (an <a> without href is a dead link)
          <div key={i} className="story" role="button" tabIndex={0} aria-label={`${s[0]} — ${s[1]}`} onClick={() => op(i)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); op(i); } }}>
            <div className="in">
              <Pic s={s} id={String(i)} />
              <span className="av" style={{ background: s[3] }}>{s[4]}</span>
              <span className="seen">Moharaz</span>
              <div className="who"><b>{s[0]}</b><span>{s[1]}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className={`lb ${open ? "on" : ""}`} id="lb" onClick={(e) => { if (e.target === e.currentTarget) cl(); }}>
        <button className="x" onClick={cl} aria-label="Close">✕</button>
        <button className="harrow l" onClick={() => st(-1)}><ChevL /></button>
        <div className="box" id="lbox">
          {open && (
            <>
              <div className="bar">{STORIES.map((_, j) => <i key={j} className={j <= cur ? "on" : ""} />)}</div>
              <Pic s={s} id={`L${cur}`} />
              <div className="who"><b>{s[0]}</b><span>{s[1]}</span></div>
            </>
          )}
        </div>
        <button className="harrow r" onClick={() => st(1)}><ChevR /></button>
      </div>
    </section>
  );
}
