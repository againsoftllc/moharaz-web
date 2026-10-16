/* The header menu from the AgainERP admin (Website → Menus → Header, slot "header.primary").

   Admin tree:   top item → sub items → their children → (one more level)
   Shop menu:    top item → one group of its sub items (flowing over the mega menu's columns),
                 each sub item's children in its flyout, and a 4th level indented inside that flyout. */

import type { MenuItem, MenuLink } from "../menu";
import { getCategories, getMenu, type ApiCategory, type ApiMenuItem } from "./api";

/* No admin menu yet → the previous shop's top menu, in its order, each with its category tree below.
   (The catalogue's show_in_top_menu flag also marks stray roots like "offer", so the roots are listed here.) */
export const TOP_MENU = [
  "laptop", "pc-components", "desktop", "monitor", "accessories", "ups",
  "network-accessories", "gaming-gears", "gadget", "office-equipment", "camera", "tablet",
];
/** root names the catalogue keeps in capitals */
const TOP_LABEL: Record<string, string> = { "gaming-gears": "Gaming Gears" };

const link = (n: ApiMenuItem): MenuLink => ({
  label: n.label,
  href: n.href || "#",
  ...(n.children?.length ? { children: n.children.map(link) } : {}),
});

/* Accessories and PC Components open a full-width mega menu (their many sub-categories over four columns, each
   sub-category's own list in a flyout); every other item a multi-level dropdown */
const MEGA = new Set(["/accessories", "/pc-components"]);

export function menuFromApi(items: ApiMenuItem[]): MenuItem[] {
  return items.map((top) => ({
    label: top.label,
    href: top.href || "#",
    enabled: true,
    columns: top.children?.length ? [{ title: top.label, href: top.href, links: top.children.map(link) }] : [],
    style: MEGA.has(top.href) ? "mega" : "dropdown",
  }));
}

const fromCategory = (c: ApiCategory): ApiMenuItem => ({
  id: c.id,
  label: TOP_LABEL[c.slug] ?? c.name,
  href: `/${c.slug}`,
  children: c.children.map(fromCategory),
});

async function catalogMenu(): Promise<ApiMenuItem[] | null> {
  try {
    const roots = new Map((await getCategories()).map((c) => [c.slug, c]));
    const items = TOP_MENU.flatMap((slug) => { const c = roots.get(slug); return c ? [fromCategory(c)] : []; });
    return items.length ? items : null;
  } catch {
    return null;
  }
}

/** the admin's header menu, else one built from the catalogue, or null (the header then keeps the built-in menu) */
export async function headerMenu(): Promise<MenuItem[] | null> {
  const items = (await getMenu("header.primary")) ?? (await catalogMenu());
  return items ? menuFromApi(items) : null;
}
