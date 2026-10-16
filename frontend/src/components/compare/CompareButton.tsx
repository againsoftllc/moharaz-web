"use client";

import { useCompare } from "./CompareProvider";
import { remember } from "@/lib/shop/registry";
import type { Product, ProductId } from "@/lib/products";

export const CompareIcon = () => (
  <svg viewBox="0 0 24 24"><path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7" /></svg>
);

/** Toggle a product in the compare list. `variant="icon"` for cards, `"text"` for rows/detail lists.
    `p`: the product itself — the compare list keeps ids and finds the product in the browser's registry, which
    only knows products a card or product page has shown (the PC builder's rows, cart and bundle lines are not cards). */
export default function CompareButton({ id, p, variant = "icon" }: { id: ProductId; p?: Product; variant?: "icon" | "text" }) {
  const { has, toggle, ready } = useCompare();
  const on = ready && has(id);
  const label = on ? "Remove from compare" : "Add to compare";
  return (
    <button
      type="button"
      className={`cmp-btn ${variant} ${on ? "on" : ""}`}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (p) remember(p); toggle(id); }}
    >
      <CompareIcon />
      {variant === "text" && <span>{on ? "Comparing" : "Compare"}</span>}
    </button>
  );
}
