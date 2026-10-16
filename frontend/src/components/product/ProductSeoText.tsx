/* "Buy <product> from Moharaz" — a short text under every product's description, written from the product
   itself: its name, price and key specs, a benefit / audience line that fits its kind of product, and internal links
   to its brand, its category and the category above it. Server-rendered, so search engines read it with the page. */

import Link from "next/link";
import type { Brand } from "@/lib/brands";
import { tk } from "@/lib/data";
import type { Product } from "@/lib/products";

/** what a kind of product is good at, and who it is for — matched on the category trail and the name */
const KINDS: [RegExp, string, string][] = [
  [/monitor|display/i, "smooth, sharp visuals and comfortable viewing for hours", "gamers, creators and professionals"],
  [/laptop|notebook|macbook/i, "fast, dependable performance wherever you work or play", "students, professionals and gamers on the go"],
  [/processor|\bcpu\b(?!.*cooler)/i, "strong multi-core performance for gaming, work and multitasking", "PC builders and upgraders"],
  [/graphics|gpu|vga/i, "high frame rates and stunning detail in games and creative apps", "gamers, streamers and creators"],
  [/motherboard/i, "a stable, feature-rich base for your next build", "PC builders who want room to grow"],
  [/laptop ram|ram|memory/i, "snappier multitasking and smoother gaming", "anyone upgrading a desktop or laptop"],
  [/ssd|hdd|storage|hard (disk|drive)|nvme|pen ?drive|memory card/i, "fast, reliable space for your games, files and projects", "gamers, creators and everyday users"],
  [/power supply|psu/i, "clean, stable power that keeps your system running safely", "gaming and workstation builds"],
  [/casing|case|chassis/i, "good airflow and a clean look for your build", "PC builders"],
  [/cooler|cooling|fan|thermal/i, "lower temperatures and quieter running", "gamers and overclockers"],
  [/keyboard|mouse|headphone|headset|earphone|earbud|speaker|microphone|webcam|gamepad|controller/i, "comfort and precision for gaming, work and calls", "gamers and everyday users"],
  [/ups|ips|power strip|stabili[sz]er/i, "steady power through load-shedding and outages", "homes, offices and PC setups"],
  [/router|switch|network|wifi|wi-fi|adapter|lan/i, "fast, stable connections across your home or office", "homes, offices and gamers"],
  [/printer|scanner|projector|photocopier|office|shredder|laminat/i, "reliable everyday performance for the office", "offices, schools and home users"],
  [/camera|cctv|dvr|nvr|xvr/i, "clear footage and dependable security", "homes, shops and offices"],
  [/tablet|phone|watch|gadget/i, "everyday convenience with modern features", "students, families and professionals"],
  [/desktop|pc build|gaming pc/i, "ready-to-use performance for gaming and work", "gamers, offices and home users"],
];

export default function ProductSeoText({ p, brand }: { p: Product; brand?: Brand }) {
  // the category trail: root (the kind of product: Monitor, Processor …) → … → the product's own category
  const trail = p.catPath ?? (p.cat && p.catName ? ([[p.catName, p.cat]] as [string, string][]) : []);
  const root = trail[0];
  const own = trail.length > 1 ? trail[trail.length - 1] : undefined;
  // a sub-category named after the brand alone ("Logitech" under Mouse) reads as "Logitech Mouse"
  const above = trail.length > 1 ? trail[trail.length - 2] : undefined;
  const ownLabel = own && above && own[0].trim().toLowerCase() === p.brand.trim().toLowerCase() ? `${own[0]} ${above[0]}` : own?.[0];
  const kind = KINDS.find(([re]) => re.test(`${trail.map((t) => t[0]).join(" ")} ${p.name}`));
  const [benefit, audience] = kind ? [kind[1], kind[2]] : ["quality and value you can rely on", "everyday users and professionals"];
  const brandLink = brand && brand.count > 0 ? brand : undefined;
  const price = p.price > 0 ? ` for ${tk(p.price)}` : "";

  return (
    <div className="pd-seo">
      <h3>Buy {p.name} from Moharaz</h3>
      <p>
        {`Get the ${p.name} from Moharaz${price} and enjoy ${benefit}. It's an excellent choice for ${audience} at the best price in Bangladesh.`}
      </p>
      <p>
        {brandLink ? <>See more from <Link href={`/${brandLink.slug}`}>{brandLink.name}</Link>, </> : null}
        {own && ownLabel ? <>explore more <Link href={`/${own[1]}`}>{ownLabel}</Link>, </> : null}
        {root ? <>browse our full range of <Link href={`/${root[1]}`}>{root[0]}</Link></> : <>browse <Link href="/all">all products</Link></>}
        {", or "}<Link href="/pc-builder">build your own PC</Link>{" with compatible parts. Every order comes with official warranty"}
        {" and fast delivery across Bangladesh."}
      </p>
    </div>
  );
}
