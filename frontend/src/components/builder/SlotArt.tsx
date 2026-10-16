import Image from "next/image";
import type { Slot, SlotKey } from "@/lib/builder";
import { ic } from "@/lib/data";

/* HD transparent photo per builder slot — [src, width, height] of the files in /public/products
   (credits in public/products/CREDITS.md). Slots without a matching photo keep their line icon. */
const PHOTO: Partial<Record<SlotKey, [string, number, number]>> = {
  chassis: ["/products/desktop.png", 751, 800],
  cpu: ["/products/cpu.png", 800, 610],
  motherboard: ["/products/motherboard.png", 800, 800],
  memory: ["/products/ram.png", 800, 532],
  gpu: ["/products/gpu.png", 800, 322],
  ssd: ["/products/ssd.png", 800, 223],
  monitor: ["/products/monitor.png", 790, 692],
  keyboard: ["/products/keyboard.png", 800, 534],
  headset: ["/products/headset.png", 541, 705],
};

/** The slot's part photo on a soft tile — greyed out until the slot has a pick (styled by the parent's .has / .on). `size` is the rendered width, for image sizing; the tile size lives in builder.css. */
export default function SlotArt({ slot, size }: { slot: Slot; size: number }) {
  const photo = PHOTO[slot.key];
  return (
    <span className="slot-art" aria-hidden>
      {photo
        ? <Image src={photo[0]} alt="" width={photo[1]} height={photo[2]} sizes={`${size}px`} />
        : <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ic[slot.icon] }} />}
    </span>
  );
}
