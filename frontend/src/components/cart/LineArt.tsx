import type { Bundle } from "@/lib/bundles";
import { ic } from "@/lib/data";
import ProductArt from "../shop/ProductArt";
import type { CartLine } from "./CartProvider";

/** Mosaic of a bundle's product images (first item large, others stacked). */
export function BundleArt({ b }: { b: Bundle }) {
  return (
    <span className={`bart n${b.items.length}`}>
      {b.items.map((p) => <span key={p.id}><ProductArt p={p} /></span>)}
    </span>
  );
}

export default function LineArt({ line }: { line: CartLine }) {
  if (line.service) return <svg className="art svc" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ic.tool }} />;
  return line.bundle ? <BundleArt b={line.bundle} /> : <ProductArt p={line.product!} />;
}
