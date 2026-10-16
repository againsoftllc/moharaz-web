"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthForm from "./AuthForm";
import type { Mode } from "./AuthProvider";

const PERKS = [
  ["Track every order", "Live status from our store to your door", '<rect x="1" y="6" width="14" height="11"/><path d="M15 10h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'],
  ["Faster checkout", "Saved addresses for quicker orders", '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'],
  ["Warranty in one place", "Invoices and RMA claims, always handy", '<path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>'],
];

/** where to go after signing in: only a path on this site ("/account?tab=orders"), never "//other.site" or "https://…" */
const safeNext = (next?: string) => (next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : undefined);

export default function AuthPage({ mode, next: rawNext }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const reg = mode === "register";
  const next = safeNext(rawNext);

  return (
    <div className="wrap auth-page">
      <section className="auth-hero" aria-hidden={false}>
        <div className="auth-orb a" /><div className="auth-orb b" />
        <span className="eyebrow">{reg ? "Join Moharaz" : "Member login"}</span>
        <h1>{reg ? <>Build more.<br />Pay less.<br /><em>Join free.</em></> : <>Good to see<br />you again.<br /><em>Let&apos;s build.</em></>}</h1>
        <ul>
          {PERKS.map(([t, d, ic]) => (
            <li key={t}>
              <span className="pk"><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ic }} /></span>
              <p><b>{t}</b><span>{d}</span></p>
            </li>
          ))}
        </ul>
        <p className="auth-foot">Moharaz · West Agargaon, Dhaka</p>
      </section>

      <section className="auth-card">
        <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><b>{reg ? "Register" : "Login"}</b></nav>
        <AuthForm mode={mode} onSwitch={(m) => router.push(next ? `/${m}?next=${encodeURIComponent(next)}` : `/${m}`)} onDone={() => router.push(next ?? "/account")} />
      </section>
    </div>
  );
}
