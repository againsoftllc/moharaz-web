import { WA_URL } from "./stores";

/* the store's own pages — used everywhere the site links to them */
export const FACEBOOK_URL = "https://www.facebook.com/moharazcom";
export const YOUTUBE_URL = "https://www.youtube.com/@MoharazBD";
/** Messenger chat with the Facebook page above */
export const MESSENGER_URL = "https://m.me/moharazcom";
export { WA_URL as WHATSAPP_URL };

export type SocialKey = "facebook" | "youtube" | "whatsapp" | "instagram" | "tiktok" | "messenger" | "linkedin" | "x" | "telegram";

/** How each network looks in the footer's "Follow us" row: tile background + inner SVG markup (24×24, stroked). */
export type Network = { key: SocialKey; label: string; bg: string; icon: string; placeholder: string };

export const NETWORKS: Network[] = [
  { key: "facebook", label: "Facebook", bg: "#1877F2", icon: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>', placeholder: "https://www.facebook.com/yourpage" },
  { key: "youtube", label: "YouTube", bg: "#FF0000", icon: '<path d="M22.5 6.4a2.8 2.8 0 0 0-2-2C18.9 4 12 4 12 4s-6.9 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 5.6 2.8 2.8 0 0 0 2 2c1.6.4 8.5.4 8.5.4s6.9 0 8.5-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-5.6z"/><path d="m10 15 5-3-5-3z"/>', placeholder: "https://www.youtube.com/@yourchannel" },
  { key: "whatsapp", label: "WhatsApp", bg: "#25D366", icon: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z"/>', placeholder: "https://api.whatsapp.com/send?phone=8801XXXXXXXXX" },
  { key: "instagram", label: "Instagram", bg: "linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)", icon: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/>', placeholder: "https://www.instagram.com/yourhandle" },
  { key: "tiktok", label: "TikTok", bg: "#222", icon: '<path d="M9 12a4 4 0 1 0 4 4V2c1 3 3 4 6 4"/>', placeholder: "https://www.tiktok.com/@yourhandle" },
  { key: "messenger", label: "Messenger", bg: "#0084FF", icon: '<path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2z"/><path d="m7 13.5 3-3.2 2.2 2.2 4-3"/>', placeholder: "https://m.me/yourpage" },
  { key: "linkedin", label: "LinkedIn", bg: "#0A66C2", icon: '<rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/>', placeholder: "https://www.linkedin.com/company/yourcompany" },
  { key: "x", label: "X (Twitter)", bg: "#000", icon: '<path d="M4 4l11.7 16H20L8.3 4z"/><path d="M4 20l6.8-6.8M13.2 10.8 20 4"/>', placeholder: "https://x.com/yourhandle" },
  { key: "telegram", label: "Telegram", bg: "#229ED9", icon: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>', placeholder: "https://t.me/yourchannel" },
];
export const networkByKey = new Map(NETWORKS.map((n) => [n.key, n]));

export type SocialLink = { key: SocialKey; url: string; enabled: boolean };

/** Footer "Follow us" links, in display order. Empty urls are not shown. */
export const SOCIAL_LINKS: SocialLink[] = [
  { key: "facebook", url: FACEBOOK_URL, enabled: true },
  { key: "youtube", url: YOUTUBE_URL, enabled: true },
  { key: "whatsapp", url: WA_URL, enabled: true },];
