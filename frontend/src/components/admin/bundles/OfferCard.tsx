import { Fragment } from "react";
import type { BundleTheme } from "@/lib/admin/themes";
import type { AdminCategory, AdminProduct } from "@/lib/admin/types";
import { ic, tk } from "@/lib/data";
import type { Gift } from "@/lib/bundles";

/** A bundle offer drawn in its theme's colours — the admin's preview of how the offer is presented. */
export default function OfferCard({ theme, name, tagline, badge, items, catMap, total, price, pct, gifts = [] }: {
  theme: BundleTheme;
  name: string;
  tagline: string;
  badge?: string;
  items: AdminProduct[];
  catMap: Map<string, AdminCategory>;
  total: number;
  price: number;
  pct: number;
  gifts?: Gift[];
}) {
  return (
    <div className="ad-offer" style={{ background: `radial-gradient(circle at 85% 15%,${theme.accent}40,transparent 45%),linear-gradient(130deg,${theme.from},${theme.to})` }}>
      <div className="ad-offer-top">
        <small style={{ color: theme.accent }}>{theme.type} bundle · {items.length} items</small>
        {(badge || pct > 0) && <em style={{ background: theme.accent }}>{badge || `-${pct}%`}</em>}
      </div>
      <h3>{name || "Bundle name"}</h3>
      {tagline && <p>{tagline}</p>}
      <div className="ad-offer-items">
        {items.length ? items.map((p, i) => {
          const c = catMap.get(p.cat);
          return (
            <Fragment key={p.id}>
              {i > 0 && <b style={{ background: theme.accent }}>+</b>}
              <span title={p.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image ? <img src={p.image} alt="" /> : (
                  <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, color: c?.color ?? "#71717a" }} dangerouslySetInnerHTML={{ __html: ic[c?.icon ?? "tool"] }} />
                )}
              </span>
            </Fragment>
          );
        }) : <p>Pick products to see them here.</p>}
      </div>
      {gifts.length > 0 && <div className="ad-offer-gifts">{gifts.map((g) => <span key={g.id}>🎁 {g.name}</span>)}</div>}
      <div className="ad-offer-price">
        <b>{tk(price)}</b>
        {total > price && <s>{tk(total)}</s>}
        {total > price && <span style={{ color: theme.accent, fontWeight: 800, fontSize: 13 }}>Save {tk(total - price)}</span>}
      </div>
    </div>
  );
}
