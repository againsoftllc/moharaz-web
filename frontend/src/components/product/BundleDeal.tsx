import Link from "next/link";
import type { Bundle } from "@/lib/bundles";
import { tk } from "@/lib/data";
import { productHref, type ProductId } from "@/lib/products";
import ProductArt from "../shop/ProductArt";

/** the bundle this product belongs to, as a strip under the flash-sale one — hover a photo for its name */
export default function BundleDeal({ bundle, current }: { bundle: Bundle; current: ProductId }) {
  return (
    <div className="pd-offer pd-bundle">
      <span className="pd-offer-l">
        <svg viewBox="0 0 24 24"><path d="m21 8-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></svg>
        <span><b>Bundle Deal <i>-{bundle.pct}%</i></b><em>Save {tk(bundle.save)} on {bundle.items.length} items</em></span>
      </span>
      <div className="pd-bundle-r">
        <ul className="pd-bundle-items" aria-label={`Items in ${bundle.name}`}>
          {bundle.items.map((x, i) => (
            <li key={x.id}>
              {i > 0 && <span className="plus" aria-hidden>+</span>}
              <Link
                href={productHref(x)}
                className={`pd-bt ${x.id === current ? "cur" : ""}`}
                aria-label={`${x.name} — ${tk(x.price)}`}
                aria-current={x.id === current ? "page" : undefined}
              >
                <span className="pd-bt-img"><ProductArt p={x} /></span>
                <span className="pd-bt-tip" aria-hidden>
                  {x.id === current && <i>This item</i>}
                  <b>{x.name}</b><em>{tk(x.price)}</em>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href={`/bundles/${bundle.slug}`} className="btn btn-red">View Bundle</Link>
      </div>
    </div>
  );
}
