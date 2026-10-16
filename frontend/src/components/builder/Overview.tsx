"use client";

import { SLOTS, pickedIn, type Check } from "@/lib/builder";
import { ic, tk } from "@/lib/data";
import { stockClass } from "@/lib/products";
import ProductArt from "../shop/ProductArt";
import SlotArt from "./SlotArt";
import type { BuilderApi } from "./PcBuilder";

const Trash = () => <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>;

export default function Overview({ api, issues }: { api: BuilderApi; issues: Check[] }) {
  const { build, open, drop } = api;
  const rows = SLOTS.filter((s) => s.core || pickedIn(build, s.key).length);
  const nextEmpty = rows.find((s) => !pickedIn(build, s.key).length)?.key;
  const extras = SLOTS.filter((s) => !s.core && !pickedIn(build, s.key).length);

  return (
    <div className="ov">
      {issues.length > 0 && (
        <div className="ov-checks">
          <h6 className="side-h">Compatibility check</h6>
          <ul>
            {issues.map((c) => (
              <li key={c.msg} className={c.level}>
                {c.level === "ok"
                  ? <svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg>
                  : <svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>}
                {c.msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ov-list">
        {rows.map((s) => {
          const picks = pickedIn(build, s.key);
          return (
            <div key={s.key} className={`ov-row ${picks.length ? "has" : ""}`}>
              <button className="ov-slot" onClick={() => open(s.key)}>
                <SlotArt slot={s} size={64} />
                <span>{s.label}</span>
              </button>
              <div className="ov-body">
                {picks.length ? picks.map(({ product: p, qty }) => (
                  <div key={p.id} className="ov-pick">
                    <span className="thumb"><ProductArt p={p} /></span>
                    <div className="ov-name">
                      <b>{p.name}</b>
                      <span><span className={`stk ${stockClass(p.stock)}`}>{p.stock}</span>
                        {qty > 1 && <em>× {qty}</em>}</span>
                    </div>
                    <div className="ov-price">
                      {p.old && <span className="tt-save">Save {tk((p.old - p.price) * qty)} <em>-{Math.round((1 - p.price / p.old) * 100)}%</em></span>}
                      <b>{tk(p.price * qty)}</b>
                      {p.old && <s>Was {tk(p.old * qty)}</s>}
                    </div>
                    <button className="rm" aria-label={`Remove ${p.name}`} onClick={() => drop(s.key, p.id)}><Trash /></button>
                  </div>
                )) : <button className="ov-empty" onClick={() => open(s.key)}>No selection</button>}
              </div>
              {(!picks.length || s.multi) && (
                <button className={`btn ${s.key === nextEmpty ? "btn-red" : "btn-line"} ov-add`} onClick={() => open(s.key)}>
                  + {picks.length ? "Add" : s.label}
                </button>
              )}
              {picks.length > 0 && !s.multi && <button className="btn btn-line ov-add" onClick={() => open(s.key)}>Change</button>}
            </div>
          );
        })}
      </div>

      {extras.length > 0 && (
        <div className="ov-more">
          <span>Add more:</span>
          {extras.map((s) => (
            <button key={s.key} onClick={() => open(s.key)}>
              <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ic[s.icon] }} />{s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
