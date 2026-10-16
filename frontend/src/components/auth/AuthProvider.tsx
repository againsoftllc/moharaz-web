"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { lockScroll } from "@/lib/scrollLock";
import { fetchMe, getToken, logout, setToken, type Customer } from "@/lib/account";

export type Mode = "login" | "register";
/** the signed-in shopper (an AgainERP customer) */
export type User = {
  id: string;
  name: string;
  phone: string;
  email: string;
  /** profile photo URL */
  avatar?: string;
  hasPin: boolean;
};

type Auth = {
  user: User | null;
  /** true once the saved session has been checked, so pages can tell "signed out" from "not loaded yet" */
  ready: boolean;
  /** a session from AgainERP (OTP / PIN sign-in) */
  signIn: (token: string, customer: Customer) => void;
  signOut: () => void;
  /** after the profile changed (name, photo, PIN …) */
  updateUser: (customer: Customer) => void;
  modal: Mode | null;
  openModal: (m: Mode | null) => void;
};

const Ctx = createContext<Auth | null>(null);

const toUser = (c: Customer): User => ({
  id: c.id,
  name: c.name || c.phone || "Customer",
  phone: c.phone || (c.identifier_type === "phone" ? c.identifier : ""),
  email: c.email || "",
  avatar: c.profile_image || undefined,
  hasPin: c.has_pin,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [modal, setModal] = useState<Mode | null>(null);
  const [ready, setReady] = useState(false);

  // the saved session: asked of the shop once per visit (an expired one is dropped)
  useEffect(() => {
    try { localStorage.removeItem("moharaz-user"); } catch {} // the old demo sign-in
    let live = true;
    const check = getToken()
      ? fetchMe()
        .then((c) => { if (live) setUser(toUser(c)); })
        .catch((err) => { if (live && err?.status === 401) setToken(null); })
      : Promise.resolve();
    void check.finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (modal) return lockScroll();
  }, [modal]);

  const signIn = useCallback((token: string, customer: Customer) => {
    setToken(token);
    setUser(toUser(customer));
  }, []);
  const signOut = useCallback(() => {
    void logout();
    setToken(null);
    setUser(null);
  }, []);
  const updateUser = useCallback((customer: Customer) => setUser(toUser(customer)), []);

  const value = useMemo(
    () => ({ user, ready, signIn, signOut, updateUser, modal, openModal: setModal }),
    [user, ready, signIn, signOut, updateUser, modal],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
