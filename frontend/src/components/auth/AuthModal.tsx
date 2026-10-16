"use client";

import { useEffect } from "react";
import { lockScroll } from "@/lib/scrollLock";
import AuthForm from "./AuthForm";
import { useAuth } from "./AuthProvider";

export default function AuthModal() {
  const { modal, openModal } = useAuth();

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openModal(null);
    window.addEventListener("keydown", onKey);
    // the page behind stays put while the popup is open
    const unlock = lockScroll();
    return () => { window.removeEventListener("keydown", onKey); unlock(); };
  }, [modal, openModal]);

  if (!modal) return null;
  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && openModal(null)}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={modal === "login" ? "Login" : "Register"}>
        <div className="modal-glow" aria-hidden />
        <button className="modal-x" onClick={() => openModal(null)} aria-label="Close"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        <AuthForm key={modal} mode={modal} onSwitch={(m) => openModal(m)} onDone={() => openModal(null)} />
      </div>
    </div>
  );
}
