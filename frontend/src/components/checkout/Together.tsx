"use client";

import { useEffect, useState } from "react";
import { GOES_WITH } from "@/lib/productInfo";
import type { Product, ProductId } from "@/lib/products";
import { listProducts } from "@/lib/shop/api";
import { remember } from "@/lib/shop/registry";
import RailNav from "../RailNav";
import ProductCard from "../shop/ProductCard";

export default function Together({ cats, exclude }: { cats: string[]; exclude: ProductId[] }) {
  const [picks, setPicks] = useState<Product[]>([]);
  const key = `${cats.join(",")}|${exclude.join(",")}`;
  useEffect(() => {
    const want = [...new Set(cats.flatMap((c) => GOES_WITH[c] ?? ["keyboard-mouse", "headset", "ssd"]))].filter((c) => !cats.includes(c));
    const ctl = new AbortController();
    // two in-stock picks per complementary category from the shop, discounted first
    void Promise.all(
      want.map((c) =>
        listProducts({ category: c, inStock: true, perPage: 12 }, { signal: ctl.signal })
          .then((r) => r.items.filter((p) => !exclude.includes(p.id)).sort((a, b) => +!!b.old - +!!a.old || a.price - b.price).slice(0, 2))
          .catch(() => [] as Product[]),
      ),
    ).then((lists) => {
      if (ctl.signal.aborted) return;
      const items = lists.flat().slice(0, 10);
      remember(...items);
      setPicks(items);
    });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for cats + exclude
  }, [key]);

  if (!picks.length) return null;
  return (
    <section className="co-together">
      <div className="wrap">
        <div className="head"><div><span className="eyebrow">Complete your setup</span><h2>Purchased Together</h2></div><RailNav id="together" /></div>
        <div className="rail together" id="together">{picks.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </div>
    </section>
  );
}
