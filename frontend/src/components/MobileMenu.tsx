"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMenu, type MenuItem } from "@/lib/menu";
import { useAuth } from "./auth/AuthProvider";
import UserAvatar from "./auth/UserAvatar";
import { useCart } from "./cart/CartProvider";
import { useCompare } from "./compare/CompareProvider";

const QUICK: [string, string, string][] = [
  ["/pc-builder", "PC Builder", '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>'],
  ["/#deals", "Deal Zone", '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'],
  ["/bundles/create", "Make a Bundle", '<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="3"/>'],
  ["/bundles", "Bundles", '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18"/>'],
  ["/brand", "Brands", '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/>'],
  ["/blog", "Blog", '<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>'],
];

/** `items`: the menu the header shows (the AgainERP admin's, or the built-in one) */
export default function MobileMenu({ open, onClose, onTheme, items }: { open: boolean; onClose: () => void; onTheme: () => void; items?: MenuItem[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const builtIn = useMenu();
  const menuItems = items ?? builtIn;
  const { user, openModal, signOut } = useAuth();
  const { count, setDrawer } = useCart();
  const { ids } = useCompare();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  return (
    <>
      <div className={`scrim mm-scrim ${open ? "on" : ""}`} onClick={onClose} />
      <aside className={`mm ${open ? "on" : ""}`} aria-label="Menu" aria-hidden={!open} inert={!open}>
        <div className="mm-head">
          {user
            ? <span className="mm-user"><UserAvatar user={user} /><span><b>Hi, {user.name}</b><small>{user.phone || user.email}</small></span></span>
            : <span className="mm-auth">
                <button className="btn btn-red" onClick={() => { onClose(); openModal("login"); }}>Login</button>
                <button className="btn btn-line" onClick={() => { onClose(); openModal("register"); }}>Register</button>
              </span>}
          <button className="ib" onClick={onClose} aria-label="Close menu"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>

        <div className="mm-body">
          <nav className="mm-quick" aria-label="Shortcuts">
            {QUICK.map(([href, label, icon]) => (
              <Link key={href} href={href} onClick={onClose}><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: icon }} />{label}</Link>
            ))}
          </nav>

          <h6 className="side-h">Shop by category</h6>
          <ul className="mm-cats">
            {menuItems.map((m, i) => {
              const isOpen = expanded === i;
              return (
                <li key={i} className={isOpen ? "open" : ""}>
                  {m.columns.length > 0 ? (
                    <>
                      <button onClick={() => setExpanded(isOpen ? null : i)} aria-expanded={isOpen}>
                        {m.label}<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                      {isOpen && (
                        <div className="mm-sub">
                          <Link href={m.href} onClick={onClose} className="mm-all">View all {m.label} →</Link>
                          {m.columns.map((c, j) => {
                            const plain = c.links.filter((x) => !x.children?.length);
                            return (
                              <div key={j}>
                                <span className="eyebrow">{c.title}</span>
                                {plain.length > 0 && <div className="mm-links">{plain.map((x, k) => <Link key={k} href={x.href} onClick={onClose}>{x.label}</Link>)}</div>}
                                {/* links with a flyout on desktop expand in place here */}
                                {c.links.filter((x) => x.children?.length).map((x, k) => (
                                  <details key={k} className="mm-more">
                                    <summary>{x.label}<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></summary>
                                    <div className="mm-links">
                                      <Link href={x.href} onClick={onClose}>All {x.label}</Link>
                                      {x.children!.map((s, n) => (
                                        <span key={n} style={{ display: "contents" }}>
                                          <Link href={s.href} onClick={onClose}>{s.label}</Link>
                                          {s.children?.map((g, m) => <Link key={m} href={g.href} onClick={onClose} className="mm-l4">{g.label}</Link>)}
                                        </span>
                                      ))}
                                    </div>
                                  </details>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link href={m.href} onClick={onClose}>{m.label}</Link>
                  )}
                </li>
              );
            })}
          </ul>

          <h6 className="side-h">My account</h6>
          <div className="mm-rows">
            {user && <Link href="/account" onClick={onClose}>Dashboard</Link>}
            <button onClick={() => { onClose(); setDrawer(true); }}>Cart{count > 0 && <em>{count}</em>}</button>
            <Link href="/compare" onClick={onClose}>Compare{ids.length > 0 && <em>{ids.length}</em>}</Link>
            <button onClick={onTheme}>Dark / light theme</button>
            {user && <button onClick={() => { signOut(); onClose(); }} className="mm-out">Logout</button>}
          </div>

          <div className="mm-contact">
            <a href="tel:+8801805042474"><b>01805042474</b><small>Support hotline</small></a>
            <p>Every day 10:00–20:00<br />West Agargaon, Sher-E-Bangla Nagar, Dhaka</p>
          </div>
        </div>
      </aside>
    </>
  );
}
