"use client";

import Link from "next/link";
import { useCart } from "../cart/CartProvider";
import { useAuth, type Mode } from "./AuthProvider";
import UserAvatar from "./UserAvatar";

const UserIcon = () => (
  <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);

/** Account icon: click → /login page, hover → quick Login / Register (opens modal). */
export default function AccountMenu() {
  const { user, signOut, openModal } = useAuth();
  const { setDrawer } = useCart();

  const open = (m: Mode) => {
    // drop focus so the :focus-within dropdown closes behind the modal
    (document.activeElement as HTMLElement | null)?.blur();
    openModal(m);
  };

  return (
    <div className="acct hide-m">
      {user ? (
        <Link href="/account" className="ib" aria-label={`Account: ${user.name}`}><UserAvatar user={user} /></Link>
      ) : (
        <Link href="/login" className="ib" aria-label="Account — login"><UserIcon /></Link>
      )}

      <div className="acct-drop" role="menu">
        <div className="acct-glow" aria-hidden />
        {user ? (
          <>
            <div className="acct-hi">
              <UserAvatar user={user} className="lg" />
              <p><b>Hi, {user.name}</b><span>{user.phone || user.email}</span></p>
            </div>
            <nav className="acct-links">
              <Link href="/account"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>Dashboard</Link>
              <button onClick={() => setDrawer(true)}><svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" /></svg>My Cart</button>
              <Link href="/account?tab=orders"><svg viewBox="0 0 24 24"><rect x="1" y="6" width="14" height="11" /><path d="M15 10h4l3 3v4h-7" /></svg>My Orders</Link>
              <Link href="/account?tab=wishlist"><svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>Wishlist</Link>
              <a><svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" /></svg>Warranty / RMA</a>
            </nav>
            <button className="acct-out" onClick={signOut}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>Logout</button>
          </>
        ) : (
          <>
            <div className="acct-head">
              <span className="acct-badge"><UserIcon /></span>
              <b>Welcome to Moharaz</b>
              <span>Track orders, save PC builds and check out faster.</span>
            </div>
            <div className="acct-btns">
              <button className="btn btn-red" onClick={() => open("login")}>Login</button>
              <button className="btn btn-line" onClick={() => open("register")}>Register</button>
            </div>
            <p className="acct-note">New here? Registration takes 30 seconds.</p>
          </>
        )}
      </div>
    </div>
  );
}
