import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

// popular store categories (real category pages) to carry on from
const POPULAR: [string, string][] = [
  ["Laptop", "/laptop"],
  ["Processor", "/processor"],
  ["Graphics Card", "/graphics-card"],
  ["Monitor", "/monitor"],
  ["RAM", "/ram"],
  ["SSD", "/ssd"],
];

export default function NotFound() {
  return (
    <section className="wrap nf">
      <div className="nf-card">
        <div className="nf-code" aria-hidden>
          <span>4</span>
          {/* the 0 is a cooling fan */}
          <svg className="nf-fan" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" />
            <g className="nf-blades">
              {[0, 72, 144, 216, 288].map((r) => (
                <path key={r} d="M60 60c6-18 22-26 34-20-4 14-18 22-34 20Z" transform={`rotate(${r} 60 60)`} />
              ))}
            </g>
            <circle cx="60" cy="60" r="9" className="nf-hub" />
          </svg>
          <span>4</span>
        </div>

        <span className="eyebrow">Error 404 · Page not found</span>
        <h1>This page took a wrong turn</h1>
        <p>The page you’re looking for may have moved, been renamed or is no longer available. Try a search, or head back to the home page.</p>

        <form action="/all" className="nf-search" role="search">
          <svg viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input name="q" placeholder="Search laptops, processors, monitors…" aria-label="Search products" />
          <button className="btn btn-red" type="submit">Search</button>
        </form>

        <div className="nf-acts">
          <Link href="/" className="btn btn-red">
            <svg viewBox="0 0 24 24" aria-hidden><path d="M3 11 12 4l9 7" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>
            Go to Home
          </Link>
          <Link href="/pc-builder" className="btn btn-line">Build a PC</Link>
        </div>

        <div className="nf-cats">
          <span>Popular categories</span>
          <div>{POPULAR.map(([name, href]) => <Link key={href} href={href}>{name}</Link>)}</div>
        </div>

        <p className="nf-help">Need help finding something? Call <a href="tel:+8801805042474">01805042474</a></p>
      </div>
    </section>
  );
}
