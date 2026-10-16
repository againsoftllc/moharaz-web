"use client";

import type { ProductVariant } from "@/lib/products";

/* swatch for a colour name; its last known word decides ("Midnight Black" → black) — same palette as VariantPicker */
const SWATCH: Record<string, string> = {
  black: "#1F2023", white: "#F4F4F2", silver: "#C9CCD1", gray: "#8A8F98", grey: "#8A8F98", red: "#D7262E", green: "#2FA86B",
  mint: "#9FE0C4", blue: "#2F6FD6", purple: "#7C4DCC", lilac: "#C6B3E6", pink: "#F2A7C3", magenta: "#D0368A", yellow: "#F5C518", gold: "#D4AF37",
};
const swatch = (name: string) => name.toLowerCase().split(/[\s-]+/).reverse().map((w) => SWATCH[w]).find(Boolean);

/** the variant with `value` for `axis` that keeps as many of the current options as possible */
function closest(variants: ProductVariant[], own: Record<string, string>, axis: string, value: string) {
  let best: ProductVariant | undefined, score = -1;
  for (const v of variants) {
    if (v.options[axis] !== value) continue;
    const s = Object.keys(own).filter((k) => k !== axis && v.options[k] === own[k]).length + (v.inStock ? 0.5 : 0);
    if (s > score) [best, score] = [v, s];
  }
  return best;
}

/** One row of choices per option of a real product (Color, Switch Color, …); picking one switches the variant in place. */
export default function OptionPicker({ variants, value, onChange }: { variants: ProductVariant[]; value?: ProductVariant; onChange: (v: ProductVariant) => void }) {
  const own = value?.options ?? {};
  const axes = [...new Set(variants.flatMap((v) => Object.keys(v.options)))];
  const rows = axes
    .map((axis) => ({ axis, values: [...new Set(variants.map((v) => v.options[axis]).filter(Boolean))] }))
    .filter((r) => r.values.length > 1);
  if (!rows.length) return null;

  return (
    <div className="pd-variants">
      {rows.map(({ axis, values }) => {
        const color = /colou?r/i.test(axis);
        return (
          <div key={axis}>
            <span className="eyebrow">{axis}{own[axis] && <em>: {own[axis]}</em>}</span>
            <div className={`pd-chips${color ? " pd-colors" : ""}`}>
              {values.map((v, vi) => {
                const target = closest(variants, own, axis, v);
                const on = own[axis] === v;
                const out = !target?.inStock;
                const sw = color ? swatch(v) : undefined;
                return (
                  <button
                    key={`${vi}-${v}`}
                    type="button"
                    className={[on && "on", out && "out"].filter(Boolean).join(" ") || undefined}
                    aria-pressed={on}
                    title={out ? `${v} — out of stock` : v}
                    onClick={() => target && onChange(target)}
                  >
                    {sw && <i style={{ background: sw }} />}
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
