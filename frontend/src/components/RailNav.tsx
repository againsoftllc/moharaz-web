"use client";

import { ChevL, ChevR } from "./Icon";

export default function RailNav({ id }: { id: string }) {
  const sc = (d: number) => {
    const r = document.getElementById(id);
    r?.scrollBy({ left: d * r.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="navs">
      <button onClick={() => sc(-1)} aria-label="Previous"><ChevL /></button>
      <button onClick={() => sc(1)} aria-label="Next"><ChevR /></button>
    </div>
  );
}
