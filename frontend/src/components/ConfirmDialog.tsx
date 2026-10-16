"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  message: ReactNode;
  /** optional extra content between the message and the buttons (e.g. a summary of what is affected) */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

/** Styled replacement for window.confirm(): Esc / backdrop cancel, focus lands on Cancel. */
export default function ConfirmDialog({ open, title, message, children, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "default", onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus(); };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className={`modal confirm ${tone}`} role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-msg" onClick={(e) => e.stopPropagation()}>
        <span className="cf-icon" aria-hidden>
          {tone === "danger"
            ? <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
            : <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>}
        </span>
        <h2 id="cf-title">{title}</h2>
        <p id="cf-msg">{message}</p>
        {children}
        <div className="cf-btns">
          <button ref={cancelRef} className="btn btn-line" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn btn-red" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
