"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { setTrackingConfig, setTrackingUser, track, type TrackingConfig } from "@/lib/tracking";

/** links that count as a Meta "Contact": a call, WhatsApp or Messenger */
const CONTACT = /^(tel:|https?:\/\/(wa\.me|api\.whatsapp\.com|m\.me|(www\.)?messenger\.com)\b)/i;

/** Loads this site's marketing tags (admin: Workspace → Plugins → Marketing Tracking) and sends page views. */
export default function Tracking() {
  const [config, setConfig] = useState<TrackingConfig | null>(null);
  const path = usePathname();
  const { user } = useAuth();

  // The tags (GTM, GA4, Meta Pixel) cost the page ~0.6 s of main-thread time, so they load once the page has
  // loaded and the browser is idle — or at the shopper's first scroll / tap / key, at most 4 s in. Events
  // tracked before that wait in lib/tracking's queue and are sent then.
  useEffect(() => {
    let live = true;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      stop();
      fetch("/api/v1/storefront/tracking")
        .then((r) => (r.ok ? r.json() : { data: { enabled: false } }))
        .then((j: { data: TrackingConfig }) => j.data)
        .catch((): TrackingConfig => ({ enabled: false }))
        .then((c) => {
          setTrackingConfig(c);
          if (live) setConfig(c);
        });
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    const stop = () => events.forEach((e) => window.removeEventListener(e, start));
    events.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    const cap = window.setTimeout(start, 4000);
    // Safari has no requestIdleCallback: a short timeout after load stands in
    const canIdle = typeof window.requestIdleCallback === "function";
    let idle = 0;
    const whenIdle = () => {
      idle = canIdle ? window.requestIdleCallback(start, { timeout: 2500 }) : window.setTimeout(start, 1500);
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
    return () => {
      live = false;
      stop();
      window.clearTimeout(cap);
      window.removeEventListener("load", whenIdle);
      if (canIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    setTrackingUser(user ? { email: user.email, name: user.name } : null);
  }, [user]);

  // one page view per page, including the first (the Pixel snippet's own PageView is left out so this one carries an event id)
  useEffect(() => {
    if (config?.enabled) track("PageView");
  }, [path, config]);

  useEffect(() => {
    if (!config?.enabled) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (a && CONTACT.test(a.getAttribute("href") ?? "")) track("Contact");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [config]);

  return null;
}
