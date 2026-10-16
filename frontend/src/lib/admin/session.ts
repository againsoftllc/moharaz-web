"use client";

import { useSyncExternalStore } from "react";
import type { AdminUser } from "./types";

/* The signed-in admin, remembered in this browser. Kept outside the "ut-admin:" demo-data keys
   so "Reset demo data" doesn't sign you out. */
const KEY = "ut-admin-session";
const EVT = "ut-admin-session";

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const subscribe = (f: () => void) => {
  window.addEventListener("storage", f);
  window.addEventListener(EVT, f);
  return () => { window.removeEventListener("storage", f); window.removeEventListener(EVT, f); };
};

/** `ready` is false during server render / hydration, before the browser has been checked. */
export function useAdminSession(): { user: AdminUser | null; ready: boolean } {
  const raw = useSyncExternalStore(subscribe, read, () => undefined);
  if (raw === undefined) return { user: null, ready: false };
  try { return { user: raw ? (JSON.parse(raw) as AdminUser) : null, ready: true }; } catch { return { user: null, ready: true }; }
}

export function signIn(user: AdminUser) {
  try { localStorage.setItem(KEY, JSON.stringify(user)); } catch {}
  window.dispatchEvent(new Event(EVT));
}

export function signOut() {
  try { localStorage.removeItem(KEY); } catch {}
  window.dispatchEvent(new Event(EVT));
}

/** Only follow ?next= back into the admin, never to another site. */
export const safeNext = (next?: string | null) => (next && next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin");
