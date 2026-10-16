import type { Brand } from "@/lib/brands";

/** The brand's real logo on a white tile, or a coloured wordmark tile until we have one. */
export default function BrandLogo({ b, size = "md" }: { b: Brand; size?: "md" | "lg" | "xl" }) {
  if (b.logo) return (
    <span className={`blogo ${size} img`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.logo} alt={`${b.name} logo`} loading="lazy" />
    </span>
  );
  return (
    <span className={`blogo ${size}`} style={{ background: b.bg, color: b.fg }} aria-hidden>
      {b.mark}
    </span>
  );
}
