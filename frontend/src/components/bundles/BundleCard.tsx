import Link from "next/link";
import { tk } from "@/lib/data";
import type { Bundle } from "@/lib/bundles";
import { Fragment } from "react";
import ProductArt from "../shop/ProductArt";
import AddBundle from "./AddBundle";

/** the card shows this many photos / product lines; a bigger bundle shows a "+N" tile and a "+N more" line */
const MAX_PHOTOS = 4;
const MAX_LINES = 4;

export default function BundleCard({ b }: { b: Bundle }) {
  const photos = b.items.length > MAX_PHOTOS ? b.items.slice(0, MAX_PHOTOS - 1) : b.items;
  const morePhotos = b.items.length - photos.length;
  const lines = b.items.length > MAX_LINES ? b.items.slice(0, MAX_LINES - 1) : b.items;
  const moreLines = b.items.length - lines.length;
  return (
    <article className="combo">
      <div className="tag">
        <span className="eyebrow">Bundle · {b.items.length} items</span>
        <span className="pill">Save {tk(b.save)}</span>
      </div>
      <h3><Link href={`/bundles/${b.slug}`}>{b.name}</Link></h3>
      {/* the picture strip repeats the title link and the "View Bundle" button: kept out of the tab order and the
          accessibility tree, so screen readers hear each bundle link once */}
      <Link href={`/bundles/${b.slug}`} className="stack" aria-hidden="true" tabIndex={-1}>
        {photos.map((p, i) => (
          <Fragment key={p.id}>
            {i > 0 && <span className="plus">+</span>}
            <span className="th"><ProductArt p={p} /></span>
          </Fragment>
        ))}
        {morePhotos > 0 && (
          <>
            <span className="plus">+</span>
            <span className="th more" title={`${morePhotos} more item${morePhotos > 1 ? "s" : ""}`}><b>+{morePhotos}</b><small>more</small></span>
          </>
        )}
        <span className="pct">-{b.pct}%</span>
      </Link>
      <ul>
        {lines.map((p, i) => <li key={p.id}><span>{(b.quantities?.[i] ?? 1) > 1 ? `${b.quantities![i]} × ` : ""}{p.name}</span><em>{tk(p.price * (b.quantities?.[i] ?? 1))}</em></li>)}
        {moreLines > 0 && <li className="more"><Link href={`/bundles/${b.slug}`}>+{moreLines} more item{moreLines > 1 ? "s" : ""}</Link></li>}
      </ul>
      <div className="foot">
        <div className="price"><b>{tk(b.price)}</b><s>{tk(b.total)}</s></div>
        <div className="foot-btns">
          <AddBundle bundle={b} icon disabled={b.stock === "Out of stock"} />
          <Link href={`/bundles/${b.slug}`} className="btn btn-red">View Bundle</Link>
        </div>
      </div>
    </article>
  );
}
