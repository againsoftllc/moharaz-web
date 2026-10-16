"use client";

import { useEffect, useRef, useState } from "react";
import { WhatsApp } from "./Icon";
import { MESSENGER_URL } from "@/lib/socials";
import { waLink } from "@/lib/stores";

export default function ContactFab() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside tap / Escape
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    // the options open on a click of the main button only (not on hover); outside tap / Escape closes them
    <div ref={ref} className={`fab ${open ? "open" : ""}`}>
      <div className="fab-items" aria-hidden={!open}>
        <a tabIndex={open ? 0 : -1} className="fab-it" style={{ background: "linear-gradient(45deg,#0099FF,#A033FF,#FF5280)" }} href={MESSENGER_URL} target="_blank" rel="noopener noreferrer">
          <span className="lbl">Messenger</span>
          <svg viewBox="0 0 24 24" className="fill"><path d="M12 2C6.4 2 2 6.1 2 11.6c0 2.9 1.2 5.4 3.1 7.1v3.3l3-1.7c1.2.3 2.5.5 3.9.5 5.6 0 10-4.1 10-9.6S17.6 2 12 2zm1 12.9-2.5-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.5 5.8z" /></svg>
        </a>
        <a tabIndex={open ? 0 : -1} className="fab-it" style={{ background: "#25D366" }} href={waLink("Hi Moharaz, I need some help.")} target="_blank" rel="noopener noreferrer">
          <span className="lbl">WhatsApp</span>
          <WhatsApp />
        </a>
      </div>

      <button type="button" className="fab-main" aria-label={open ? "Close contact options" : "Contact us"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open
          ? <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
          : <svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>}
      </button>
    </div>
  );
}
