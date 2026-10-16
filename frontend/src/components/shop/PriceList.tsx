import { cleanHtml } from "@/lib/cleanHtml";
import Link from "next/link";
import { tk } from "@/lib/data";
import { callForPrice, productHref, type Product } from "@/lib/products";

/* today in Dhaka, e.g. ["07-10-2026", "2026"] — rendered on the server so it can't differ from the browser's clock */
function today() {
  const d = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date()).replaceAll("/", "-");
  return [d, d.slice(-4)];
}

/** "Latest {category} price list in BD" block under a category's products — up to 10 products on offer, newest first.
    `about`: the category's long description (HTML from the store's admin), shown after the list. */
export default function PriceList({ name, items, about }: { name: string; items: Product[]; about?: string | null }) {
  if (!items.length && !about) return null;
  const [date, year] = today();

  return (
    <section className="price-list" aria-labelledby="pl-h">
      {items.length > 0 && <>
        <span className="eyebrow">{name}</span>
        <h2 id="pl-h">What is the latest {name} price list in BD {year}?</h2>
        <p>
          Check {name} price updated on {date} in Bangladesh. Find the lowest prices in Bangladesh with product specifications,
          key features, images, ratings and more. Latest {name} prices are mentioned here for easy price comparison.
        </p>
        <div className="pl-table">
          <table>
            <thead><tr><th scope="col">{name} list</th><th scope="col">Price in BD</th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}><td><Link href={productHref(p)}>{p.name}</Link></td><td>{callForPrice(p) ? "Call for price" : <>{tk(p.price)}{p.old && <s style={{ marginLeft: 8, opacity: 0.55, fontWeight: 400 }}>{tk(p.old)}</s>}</>}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
      {/* the description as written, minus the styling copied in from other sites (lib/cleanHtml) */}
      {about && <div className="pd-ov cat-about" dangerouslySetInnerHTML={{ __html: cleanHtml(about) }} />}
    </section>
  );
}
