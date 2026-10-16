import { highlights } from "@/lib/productInfo";
import { catOf, type Product } from "@/lib/products";
import { glyphSvg, specKind } from "@/lib/specIcons";
import { Arrow } from "../Icon";

/** the product card's highlights, each as a labelled tile with an icon for its kind of spec (lib/specIcons) —
    "Cores / Threads: 6C/12T" splits into label and value; anything no rule knows gets the category's icon */
export default function KeyFeatures({ p }: { p: Product }) {
  const fallback = catOf(p).icon;
  const items = highlights(p).map((h) => {
    const kind = specKind(h);
    const at = h.indexOf(": ");
    const icon = glyphSvg(kind?.glyph ?? fallback);
    return at > 0 ? { label: h.slice(0, at), value: h.slice(at + 2), icon } : { label: kind?.label ?? "Feature", value: h, icon };
  });
  if (!items.length) return null;

  return (
    <section className="pd-keys" aria-labelledby="pd-keys-h">
      <div className="pd-keys-top">
        <h2 id="pd-keys-h" className="eyebrow">Key features</h2>
        <a href="#pd-specs">Full specs <Arrow /></a>
      </div>
      <ul>
        {items.map((x, i) => (
          <li key={`${i}-${x.value}`}>
            <span className="pd-keys-ic"><svg viewBox="0 0 24 24" aria-hidden dangerouslySetInnerHTML={{ __html: x.icon }} /></span>
            <span><small>{x.label}</small><b title={x.value}>{x.value}</b></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
