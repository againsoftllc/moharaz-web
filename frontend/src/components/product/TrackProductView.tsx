"use client";

import { useEffect } from "react";
import { productItem, track } from "@/lib/tracking";

/** Meta ViewContent / GA4 view_item for the product page (renders nothing). */
export default function TrackProductView({ id, name, price, brand, cat }: { id: string; name: string; price: number; brand?: string; cat?: string }) {
  useEffect(() => {
    track("ViewContent", { items: [productItem({ name, price, brand, cat }, id)] });
  }, [id, name, price, brand, cat]);
  return null;
}
