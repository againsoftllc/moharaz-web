import type { CSSProperties } from "react";
import { ic, type IconKey } from "@/lib/data";

export function Icon({ k, style }: { k: IconKey; style?: CSSProperties }) {
  return <svg viewBox="0 0 24 24" style={style} dangerouslySetInnerHTML={{ __html: ic[k] }} />;
}

export const Arrow = () => (
  <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const ChevL = () => (
  <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>
);
export const ChevR = () => (
  <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
);
export const Cart = () => (
  <svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /></svg>
);
export const WhatsApp = () => (
  <svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z" /></svg>
);
