"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SHOW_PC_BUILDER } from "@/lib/features";
import { useWishlist } from "./wishlist/WishlistProvider";

/** Mobile bottom bar. PC Builder is the raised icon in the middle (hidden while SHOW_PC_BUILDER is off — Home takes its place). */
export default function BottomNav() {
  const path = usePathname();
  const on = (prefix: string) => (path.startsWith(prefix) ? "on" : undefined);
  const { ids: saved, ready } = useWishlist();
  const cols = SHOW_PC_BUILDER ? 6 : 5; // Wishlist makes one more than the five slots the bar was drawn for

  return (
    <nav className="bnav" aria-label="Mobile" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {!SHOW_PC_BUILDER && (
        <Link href="/" className={path === "/" ? "on" : undefined}>
          <svg viewBox="0 0 24 24"><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></svg>Home
        </Link>
      )}
      <Link href="/bundles" className={on("/bundles")}>
        <svg viewBox="0 0 24 24"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>Bundle
      </Link>
      {SHOW_PC_BUILDER && (
        <>
      <Link href="/#custom-pc">
        <svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 6h4M10 9.5h4" /><circle cx="12" cy="16" r="2.5" /></svg>Custom PC
      </Link>
      <Link href="/pc-builder" className="bn-main">
        <span className="bn-main-ic" aria-hidden><svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></svg></span>PC Builder
      </Link>
        </>
      )}
      <Link href="/#deals">
        <svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></svg>Deal Zone
      </Link>
      <Link href="/account?tab=wishlist" aria-label={`Wishlist, ${saved.length} saved`} style={{ position: "relative" }}>
        <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>
        Wishlist
        {ready && saved.length > 0 && (
          <em style={{ position: "absolute", top: -2, left: "calc(50% + 6px)", minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--red)", color: "#fff", fontSize: 10, fontStyle: "normal", lineHeight: "16px", textAlign: "center" }}>{saved.length}</em>
        )}
      </Link>
      <Link href="/login" className={on("/login") ?? on("/register")}>
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>Account
      </Link>
    </nav>
  );
}
