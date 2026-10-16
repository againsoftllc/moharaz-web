"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AdIcon } from "./icons";

type Toast = { id: number; text: string; tone: "ok" | "err" };
const Ctx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

let next = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const close = useCallback((id: number) => setList((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = next++;
    setList((l) => [...l.slice(-3), { id, text, tone }]);
    setTimeout(() => close(id), tone === "err" ? 7000 : 3500);
  }, [close]);
  const value = useMemo(() => push, [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="ad-toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`ad-toast ${t.tone}`}>
            <AdIcon n={t.tone === "ok" ? "check" : "alert"} />
            <span>{t.text}</span>
            <button onClick={() => close(t.id)} aria-label="Dismiss"><AdIcon n="x" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
