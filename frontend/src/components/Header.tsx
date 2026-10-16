"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type SyntheticEvent } from "react";
import { pad2 } from "@/lib/data";
import { useMenu, type MenuColumn, type MenuItem, type MenuLink } from "@/lib/menu";
import { OPEN_MENU_EVENT } from "@/lib/nav";
import AccountMenu from "./auth/AccountMenu";
import { useCart } from "./cart/CartProvider";
import { useCompare } from "./compare/CompareProvider";
import { Cart } from "./Icon";
import MobileMenu from "./MobileMenu";
import SearchBox, { openSearch } from "./SearchBox";
import { BRANCHES, directionsUrl, tel } from "@/lib/stores";

const DEAL_START = 16 * 3600 + 16 * 60 + 27;
/** columns per row of the mega menu; more groups wrap onto another row under the same dividers */
const MEGA_COLS = 4;
/** a group longer than this flows over the columns instead of one tall column */
const MEGA_ROWS = 14;
/** a flyout longer than this wraps into side-by-side columns, so a long brand list needs no scrolling */
const FLY_ROWS = 15;

type MegaRow = { head: string; href?: string } | { link: MenuLink };

/* Short groups get a column each (wrapping after four); a long one flows down the columns like a newspaper,
   continuing a group in the next column but never leaving a heading at the foot of one. */
function megaColumns(groups: MenuColumn[]): MegaRow[][] {
  const rows = (g: MenuColumn): MegaRow[] => [{ head: g.title, href: g.href }, ...g.links.map((link) => ({ link }))];
  if (groups.every((g) => g.links.length <= MEGA_ROWS)) return groups.map(rows);
  const all = groups.flatMap(rows);
  const per = Math.ceil(all.length / MEGA_COLS);
  const cols: MegaRow[][] = [[]];
  for (const r of all) {
    const cur = cols[cols.length - 1];
    if (cur.length < per || cols.length === MEGA_COLS) { cur.push(r); continue; }
    cols.push("head" in cur[cur.length - 1] ? [cur.pop()!, r] : [r]);
  }
  return cols;
}

/** A flyout opens at the top of its menu; this stretches it at least down to the item that opened it, so the two
    always meet (measured on hover / focus, when the flyout is laid out). */
function reachItem(e: SyntheticEvent<HTMLElement>) {
  const row = e.currentTarget;
  const fly = row.querySelector<HTMLElement>(":scope > .mg-fly, :scope > .dd-fly > .dd-list");
  if (!fly) return;
  fly.style.minHeight = "";
  fly.style.minHeight = `${Math.ceil(row.getBoundingClientRect().bottom - fly.getBoundingClientRect().top) + 6}px`;
}

/** A mega-menu link; one with children shows ▸ and opens them in a flyout beside it.
    A child's own children (4th menu level) sit indented under it inside the flyout. */
function MegaLink({ l, path }: { l: MenuLink; path: string }) {
  const cur = (href: string) => (href === path ? "page" : undefined);
  if (!l.children?.length) return <Link href={l.href} aria-current={cur(l.href)}>{l.label}</Link>;
  // "All …" + every child + every grandchild, one grid row each
  const count = 1 + l.children.reduce((n, c) => n + 1 + (c.children?.length ?? 0), 0);
  return (
    <div className="mg-sub" onMouseEnter={reachItem} onFocus={reachItem}>
      <Link href={l.href} aria-current={cur(l.href)}>{l.label}<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg></Link>
      <div className={count > FLY_ROWS ? "mg-fly multi" : "mg-fly"} style={{ gridTemplateRows: `repeat(${Math.min(count, FLY_ROWS)}, auto)` }}>
        <Link href={l.href}>All {l.label}</Link>
        {l.children.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            <Link href={c.href} aria-current={cur(c.href)} className={c.children?.length ? "mg-parent" : undefined}>{c.label}</Link>
            {c.children?.map((g, k) => <Link key={k} href={g.href} aria-current={cur(g.href)} className="mg-l4">{g.label}</Link>)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** full-width panel under the bar: equal columns split by thin dividers, each an uppercase heading over a plain list */
function Mega({ groups, path }: { groups: MenuColumn[]; path: string }) {
  // one group (a bar item's own sub-categories) needs no heading — the bar item names it
  const cols = groups.length === 1 ? megaColumns(groups).map((c) => c.filter((r) => !("head" in r))) : megaColumns(groups);
  // the heading in force at the top of each column (the last one of the columns before it)
  const heads = cols.map((_, j) => cols.slice(0, j).flat().reduce((h, r) => ("head" in r ? r.head : h), ""));
  return (
    <div className="mega"><div className="wrap mg-cols">
      {cols.map((rows, j) => {
        // a group carried on from the previous column keeps an invisible heading so the lists line up
        const cont = groups.length > 1 && rows.length > 0 && !("head" in rows[0]) ? heads[j] : null;
        return (
          // the right half of each row opens its flyouts leftwards so a wide (multi-column) one stays on screen
          <div key={j} className={j % MEGA_COLS >= MEGA_COLS / 2 ? "mg-col flip" : "mg-col"}><div className="mg-list">
            {cont !== null && <h6 className="eyebrow mg-cont" aria-hidden="true">{cont || "\u00a0"}</h6>}
            {rows.map((r, k) => ("head" in r
              ? <h6 key={k} className="eyebrow">{r.href ? <Link href={r.href} className="mg-head" aria-current={r.href === path ? "page" : undefined}>{r.head}</Link> : r.head}</h6>
              : <MegaLink key={k} l={r.link} path={path} />))}
          </div></div>
        );
      })}
    </div></div>
  );
}

/** a long list wraps into columns of this many rows, so a level never needs its own scrollbar (which would clip the flyouts) */
const DROP_ROWS = 15;

/* Each column is its own list, so an item's flyout opens right beside its column (at the top of the menu). */
function DropList({ links }: { links: MenuLink[] }) {
  const cols = Array.from({ length: Math.ceil(links.length / DROP_ROWS) }, (_, c) => links.slice(c * DROP_ROWS, (c + 1) * DROP_ROWS));
  return (
    <div className="dd-list">
      {cols.map((col, c) => (
        <ul key={c} className="dd-col">
          {col.map((l, i) => (
            <li key={i} className={l.children?.length ? "dd-sub" : undefined} onMouseEnter={l.children?.length ? reachItem : undefined} onFocus={l.children?.length ? reachItem : undefined}>
              <Link href={l.href}>{l.label}{l.children?.length ? <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg> : null}</Link>
              {l.children?.length ? <div className="dd-fly"><DropList links={l.children} /></div> : null}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

/** A dropdown that would run past the right edge of the window moves left until it fits (checked once per opening,
    on the first pointer move after it shows — it is built on first hover). */
function fitDropdown(e: MouseEvent<HTMLElement>) {
  const dd = e.currentTarget.querySelector<HTMLElement>(":scope > .dd");
  if (dd) fitPanel(dd);
}
/** also when the panel first appears (it is built by the hover that shows it) */
function fitPanel(dd: HTMLElement) {
  if (dd.dataset.fitted || dd.offsetParent === null) return;
  dd.style.marginLeft = "";
  const over = dd.getBoundingClientRect().right - (document.documentElement.clientWidth - 8);
  if (over > 0) dd.style.marginLeft = `${-Math.ceil(over)}px`;
  dd.dataset.fitted = "1";
}
const unfitDropdown = (e: MouseEvent<HTMLElement>) => {
  const dd = e.currentTarget.querySelector<HTMLElement>(":scope > .dd");
  if (dd) delete dd.dataset.fitted;
};

/** the previous shop's multi-level dropdown; items near the right edge open their flyouts leftwards */
function Dropdown({ links, flip }: { links: MenuLink[]; flip: boolean }) {
  return <div className={flip ? "dd flip" : "dd"} ref={(el) => { if (el) fitPanel(el); }}><DropList links={links} /></div>;
}

/** `menu`: the header menu from the AgainERP admin (root layout); without it the built-in menu shows */
export default function Header({ menu: adminMenu }: { menu?: MenuItem[] | null }) {
  const [t, setT] = useState(DEAL_START);
  const { count, setDrawer } = useCart();
  const { ids: compareIds, ready: compareReady } = useCompare();
  const [menu, setMenu] = useState(false);
  const builtIn = useMenu();
  const menuItems = adminMenu ?? builtIn;
  const path = usePathname();
  const closeMenu = useCallback(() => setMenu(false), []);

  /* The mega menus and the ⋮ menu open on CSS hover / focus, so after a link inside is clicked they'd stay open under
     the pointer. A link click shuts that menu until the pointer leaves it (or the keyboard moves back in). */
  const [shut, setShut] = useState<string | null>(null);
  /* A dropdown is built the first time its item is hovered, focused or touched, then kept: every page
     used to carry all ~1,100 category links of every dropdown (thousands of DOM nodes to parse, style
     and hydrate before the page was usable). */
  const [built, setBuilt] = useState<ReadonlySet<number>>(() => new Set());
  const build = (i: number) => setBuilt((b) => (b.has(i) ? b : new Set(b).add(i)));
  const hoverMenu = (key: string) => ({
    onClick: (e: MouseEvent) => {
      if (!(e.target as Element).closest("a")) return;
      setShut(key);
      (document.activeElement as HTMLElement | null)?.blur();
    },
    onMouseOver: fitDropdown,
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      unfitDropdown(e);
      setShut((s) => (s === key ? null : s));
    },
    onFocus: () => setShut((s) => (s === key ? null : s)),
  });

  // close the mobile menu whenever the page changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMenu(false), [path]);
  useEffect(() => {
    const open = () => setMenu(true);
    window.addEventListener(OPEN_MENU_EVENT, open);
    return () => window.removeEventListener(OPEN_MENU_EVENT, open);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setT((v) => v - 1), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleTheme = () => {
    const d = document.documentElement;
    d.dataset.theme = d.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("ut-theme", d.dataset.theme); } catch {}
  };

  // the header's real height (it changes with the screen: one row on phones, search + menu bar on desktop)
  // as --site-hdr-h, so what sticks under it (the product page's tab bar) sits flush, never with a gap
  const hdrRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = hdrRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--site-hdr-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dz = [(t / 3600) | 0, ((t % 3600) / 60) | 0, t % 60].map(pad2).join(":");

  return (
    <header className="site-hdr" ref={hdrRef}>
      <div className="hdr"><div className="wrap">
        <button className="ib burger" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}>
          <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <Link href="/" className="logo" aria-label="Moharaz home">
          <Image className="logo-light" src="/moharaz-logo.webp" alt="Moharaz" width={250} height={83} loading="eager" unoptimized />
          <Image className="logo-dark" src="/moharaz-logo-dark.webp" alt="Moharaz" width={250} height={83} loading="eager" unoptimized />
        </Link>
        <SearchBox />
        <div className="icons">
          {/* phones: the search bar becomes a panel opened from here (desktop keeps the bar) */}
          <button className="ib m-search" aria-label="Search" onClick={openSearch}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></button>
          <button className="ib" id="theme" aria-label="Dark / Light" onClick={toggleTheme}><svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg></button>
          <Link href="/compare" className="ib hide-m" aria-label={`Compare, ${compareIds.length} products`} title="Product comparison"><svg viewBox="0 0 24 24"><path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7" /></svg>{compareReady && compareIds.length > 0 && <i>{compareIds.length}</i>}</Link>
          <AccountMenu />
          <button className="ib" aria-label={`Cart, ${count} items`} onClick={() => setDrawer(true)}><Cart />{count > 0 && <i>{count > 99 ? "99+" : count}</i>}</button>
          <div className={`more${shut === "more" ? " shut" : ""}`} {...hoverMenu("more")}><button className="ib" aria-label="More menu"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg></button>
            <div className="drop">
              <Link href="/bundles"><svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="1" /><path d="M12 8v13M3 12h18" /></svg>Bundles &amp; Combos</Link>
              <Link href="/#deals"><svg viewBox="0 0 24 24"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /></svg>Promotions</Link>
              <Link href="/all?sort=discount"><svg viewBox="0 0 24 24"><path d="m23 18-9.5-9.5-5 5L1 6" /><path d="M17 18h6v-6" /></svg>Price Drops</Link>
              <Link href="/account?tab=orders"><svg viewBox="0 0 24 24"><rect x="1" y="6" width="14" height="11" /><path d="M15 10h4l3 3v4h-7" /></svg>Track Order</Link>
              <hr />
              <Link href="/help"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></svg>Help Center</Link>
              <Link href="/warranty"><svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" /></svg>Warranty / RMA</Link>
              <div className="drop-sub">
                <Link href="/contact-us#stores"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>Store Location<svg className="sub-chev" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></Link>
                <div className="drop-fly">
                  {BRANCHES.map((b) => (
                    <div key={b.id} className="fly-branch">
                      <span className="eyebrow">{b.name}</span>
                      <p>{b.address}</p>
                      <small>{b.hours}</small>
                      <div className="fly-acts">
                        <a href={directionsUrl(b)} target="_blank" rel="noopener noreferrer" className="btn btn-red">Get directions</a>
                        <a href={tel(b.phone)} className="btn btn-line">{b.phone}</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/blog"><svg viewBox="0 0 24 24"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" /></svg>Blog</Link>
            </div></div>
        </div>
        <div className="actions">
          <Link className="act deal" href="/#deals"><svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></svg><span><small>Ends in <b id="dz" suppressHydrationWarning>{dz}</b></small><strong>Deal Zone</strong></span></Link>
          <Link href="/pc-builder" className="act pcb"><svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></svg><span><small>Build your own</small><strong>PC Builder</strong></span></Link>
        </div>
      </div></div>
      <nav className="cat" aria-label="Categories"><div className="wrap"><ul className="menu" id="menu">
        {menuItems.map((m, i) => (
          <li
            key={i}
            className={shut === `m${i}` ? "shut" : undefined}
            {...hoverMenu(`m${i}`)}
            onMouseEnter={() => build(i)}
            onTouchStart={() => build(i)}
            onFocus={() => { build(i); setShut((s) => (s === `m${i}` ? null : s)); }}
          >
            <Link href={m.href}>{m.label}{m.columns.length > 0 && <> <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></>}</Link>
            {m.columns.length > 0 && built.has(i) && (m.style === "dropdown"
              ? <Dropdown links={m.columns.flatMap((c) => c.links)} flip={i >= menuItems.length - 3} />
              : <Mega groups={m.columns} path={path} />)}
          </li>
        ))}
      </ul></div></nav>
      <MobileMenu open={menu} onClose={closeMenu} onTheme={toggleTheme} items={menuItems} />
    </header>
  );
}
