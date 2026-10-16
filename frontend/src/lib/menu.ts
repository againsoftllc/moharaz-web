"use client";

import { useEffect, useState } from "react";
import { getSingleton, type Singleton } from "./admin/api";
import { MENU } from "./data";
import { megaHref, subHref, topHref } from "./nav";

/* Header category bar + mobile menu. The live menu comes from the AgainERP admin (lib/shop/menu.ts, passed in
   by the root layout); this built-in one — edited in this site's Admin → Settings → Header Menu — is the fallback. */

/** `children` open in a flyout beside the link; theirs show indented inside that flyout */
export type MenuLink = { label: string; href: string; children?: MenuLink[] };
/** one titled group of a top item's dropdown (mega menu); `href` makes the title a link */
export type MenuColumn = { title: string; href?: string; links: MenuLink[] };
/** top-level item; no columns = plain link, no dropdown. `style` "dropdown" opens its links as a multi-level
    list under the item instead of the full-width mega menu (the default). */
export type MenuItem = { label: string; href: string; enabled: boolean; columns: MenuColumn[]; style?: "mega" | "dropdown" };

/** The menu the store ships with — also what the admin's "Reset to default" restores. */
export const DEFAULT_MENU: MenuItem[] = MENU.map(([label, cols]) => ({
  label,
  href: topHref(label),
  enabled: true,
  columns: (cols ?? []).map(([title, entries]) => ({
    title,
    links: entries.map((e) => {
      const [name, subs] = typeof e === "string" ? [e] : e;
      const href = megaHref(label, title, name);
      return subs ? { label: name, href, children: subs.map((s) => ({ label: s, href: subHref(href, s) })) } : { label: name, href };
    }),
  })),
}));

export const MENU_SETTINGS: Singleton<MenuItem[]> = { name: "menu", path: "/settings/menu", seed: () => structuredClone(DEFAULT_MENU) };

/** Visible menu items — the default menu until the saved one has loaded. */
export function useMenu() {
  const [menu, setMenu] = useState(DEFAULT_MENU);
  useEffect(() => {
    let live = true;
    getSingleton(MENU_SETTINGS).then((r) => live && Array.isArray(r.value) && setMenu(r.value), () => {});
    return () => { live = false; };
  }, []);
  return menu.filter((m) => m.enabled);
}
