import Link from "next/link";
import { tk } from "@/lib/data";
import { optionsOf } from "@/lib/productInfo";
import { productHref, type Product } from "@/lib/products";

/* swatch for a colour name; when the full name isn't listed, its last known word decides ("Midnight Black" → black) */
const SWATCH: Record<string, string> = {
  black: "#1F2023", white: "#F4F4F2", silver: "#C9CCD1", gray: "#8A8F98", grey: "#8A8F98", red: "#D7262E", green: "#2FA86B",
  mint: "#9FE0C4", blue: "#2F6FD6", purple: "#7C4DCC", lilac: "#C6B3E6", pink: "#F2A7C3", magenta: "#D0368A", yellow: "#F5C518", gold: "#D4AF37",
};
const swatch = (name: string) => name.toLowerCase().split(/[\s-]+/).reverse().map((w) => SWATCH[w]).find(Boolean) ?? "var(--dim)";

/** the variant with `value` for `axis` that keeps as many of the current product's other options as possible */
function closest(variants: Product[], own: Record<string, string>, axis: string, value: string) {
  let best = variants[0], score = -1;
  for (const v of variants) {
    const o = optionsOf(v);
    if (o[axis] !== value) continue;
    const s = Object.keys(own).filter((k) => k !== axis && o[k] === own[k]).length;
    if (s > score) [best, score] = [v, s];
  }
  return best;
}

/** One row of choices per option of the group — e.g. RAM / Storage, then Color. */
export default function VariantPicker({ p, variants }: { p: Product; variants: Product[] }) {
  const own = optionsOf(p);
  const rows = [...new Set(variants.flatMap((v) => Object.keys(optionsOf(v))))]
    .map((axis) => ({ axis, values: [...new Set(variants.map((v) => optionsOf(v)[axis]).filter(Boolean))] }))
    .filter((r) => r.values.length > 1);
  if (!rows.length) return null;

  return (
    <div className="pd-variants">
      {rows.map(({ axis, values }) => {
        const color = axis === "Color";
        return (
          <div key={axis}>
            <span className="eyebrow">{axis}{color && own[axis] && <em>: {own[axis]}</em>}</span>
            <div className={`pd-chips${color ? " pd-colors" : ""}`}>
              {values.map((value, vi) => {
                const v = closest(variants, own, axis, value);
                const on = own[axis] === value;
                const out = v.stock === "Out of stock";
                return (
                  <Link key={`${vi}-${value}`} href={productHref(v)} scroll={false} className={[on && "on", out && "out"].filter(Boolean).join(" ") || undefined} aria-current={on || undefined} title={out ? `${value} — out of stock` : value}>
                    {color && <i style={{ background: swatch(value) }} />}
                    {value}
                    {!color && <em>{tk(v.price)}</em>}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
