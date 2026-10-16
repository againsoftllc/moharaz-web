"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { resetLocal } from "@/lib/admin/api";
import { signOut, useAdminSession } from "@/lib/admin/session";
import { AdIcon, type AdIconName } from "./icons";
import { ToastProvider } from "./Toast";

const NAV: [string, [string, string, AdIconName][]][] = [
  ["Overview", [["/admin", "Dashboard", "dash"]]],
  ["Catalog", [["/admin/products", "All Products", "box"], ["/admin/products/new", "Add Product", "plus"], ["/admin/categories", "Categories", "tag"]]],
  ["Offers", [["/admin/bundles", "Bundle Offers", "gift"], ["/admin/custom-pc", "Custom PCs", "pc"], ["/admin/banners", "Homepage Banners", "image"]]],
  ["Content", [["/admin/blog", "Blog Posts", "file"], ["/admin/faq", "FAQ", "help"]]],
  ["Settings", [["/admin/menu", "Header Menu", "menu"], ["/admin/socials", "Social Links", "share"]]],
];
const LINKS = NAV.flatMap(([, items]) => items);

/** the nav item with the longest href that prefixes the path (so /admin/products/12 → All Products) */
const activeFor = (path: string) =>
  LINKS.filter(([href]) => path === href || path.startsWith(href + "/")).sort((a, b) => b[0].length - a[0].length)[0];

function toggleTheme() {
  const d = document.documentElement;
  d.dataset.theme = d.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("ut-theme", d.dataset.theme); } catch {}
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, ready } = useAdminSession();
  const [open, setOpen] = useState(false);
  const [reset, setReset] = useState(false);
  const isLogin = path === "/admin/login";
  const active = activeFor(path);

  // every admin page needs a signed-in admin; come back here after signing in
  useEffect(() => {
    if (ready && !user && !isLogin) router.replace(`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`);
  }, [ready, user, isLogin, router]);

  if (isLogin) return <ToastProvider>{children}</ToastProvider>;
  if (!user) {
    return <div className="ad-gate" aria-busy="true" aria-label="Checking sign-in"><span className="spin" style={{ borderColor: "var(--line)", borderTopColor: "var(--red)" }} /></div>;
  }
  const name = user.name;

  return (
    <ToastProvider>
      <div className={`ad ${open ? "nav-open" : ""}`}>
        <aside className="ad-side" aria-label="Admin navigation">
          <Link href="/admin" className="ad-brand" onClick={() => setOpen(false)}>
            <Image className="logo-dark" src="/moharaz-logo-dark.png" alt="Moharaz" width={250} height={83} priority unoptimized />
            <Image className="logo-light" src="/moharaz-logo.png" alt="" width={250} height={83} priority unoptimized />
            <em>Admin</em>
          </Link>
          <nav className="ad-nav">
            {NAV.map(([group, items]) => (
              <div key={group}>
                <h6>{group}</h6>
                {items.map(([href, label, icon]) => (
                  <Link key={href} href={href} className={active?.[0] === href ? "on" : ""} aria-current={active?.[0] === href ? "page" : undefined} onClick={() => setOpen(false)}>
                    <AdIcon n={icon} />{label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="ad-side-foot">
            <Link href="/" target="_blank"><AdIcon n="store" />View store<AdIcon n="ext" /></Link>
            <button onClick={() => setReset(true)}><AdIcon n="refresh" />Reset demo data</button>
            <button onClick={signOut}><AdIcon n="logout" />Sign out</button>
          </div>
        </aside>
        <div className="ad-scrim" onClick={() => setOpen(false)} aria-hidden />

        <div className="ad-main">
          <header className="ad-top">
            <button className="ad-ib ad-burger" onClick={() => setOpen(true)} aria-label="Open menu"><AdIcon n="menu" /></button>
            <div className="ad-top-t">Admin / <b>{active?.[1] ?? "Dashboard"}</b></div>
            <div className="ad-top-r">
              <button className="ad-ib" onClick={toggleTheme} aria-label="Dark / light theme"><AdIcon n="moon" /></button>
              <div className="ad-user">
                <span className="ad-av" aria-hidden>{name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
                <span><b>{name}</b><small title={user.email}>{user.role}</small></span>
                <button className="ad-ib" onClick={signOut} aria-label="Sign out" title="Sign out"><AdIcon n="logout" /></button>
              </div>
            </div>
          </header>
          <main className="ad-body">{children}</main>
        </div>
      </div>

      <ConfirmDialog
        open={reset}
        tone="danger"
        title="Reset demo data?"
        message={<>Every change saved <b>in this browser</b> (products, bundles, banners…) is cleared and the storefront&apos;s original data comes back. Anything saved to the live API is not touched.</>}
        confirmLabel="Reset"
        onCancel={() => setReset(false)}
        onConfirm={() => { resetLocal(); location.reload(); }}
      />
    </ToastProvider>
  );
}
