"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { DEMO_ADMIN, errorText, login, usesApi } from "@/lib/admin/api";
import { safeNext, signIn, useAdminSession } from "@/lib/admin/session";
import { AdIcon } from "./icons";

export default function AdminLogin({ next }: { next?: string }) {
  const router = useRouter();
  const { user, ready } = useAdminSession();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const to = safeNext(next);

  // already signed in (or just signed in): go where we were headed
  useEffect(() => { if (ready && user) router.replace(to); }, [ready, user, router, to]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pw) { setErr("Enter your email and password."); return; }
    setBusy(true);
    setErr(null);
    try {
      signIn(await login(email, pw));
    } catch (x) {
      setErr(errorText(x));
      setBusy(false);
    }
  };

  return (
    <div className="ad-login">
      <form className="ad-login-card" onSubmit={submit} noValidate>
        <span className="ad-brand">
          <Image className="logo-dark" src="/moharaz-logo-dark.png" alt="Moharaz" width={250} height={83} priority unoptimized />
          <Image className="logo-light" src="/moharaz-logo.png" alt="" width={250} height={83} priority unoptimized />
          <em>Admin</em>
        </span>
        <div>
          <h1>Sign in to the dashboard</h1>
          <p>Manage products, offers and content for Moharaz.</p>
        </div>

        {err && <div className="ad-err" role="alert"><AdIcon n="alert" /><div><b>Couldn&apos;t sign in</b><p>{err}</p></div></div>}

        <label className="ad-f">
          <span className="ad-f-top"><span>Email</span></span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@moharaz.com" autoFocus />
        </label>
        <label className="ad-f">
          <span className="ad-f-top"><span>Password</span></span>
          <span className="ad-pw">
            <input type={show ? "text" : "password"} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}><AdIcon n="eye" /></button>
          </span>
        </label>
        <button className="btn btn-red" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>

        {!usesApi("auth") && (
          <div className="ad-demo">
            <span>Demo account<br /><b>{DEMO_ADMIN.email}</b> · <b>{DEMO_ADMIN.password}</b></span>
            <button type="button" className="btn btn-line ad-sm" onClick={() => { setEmail(DEMO_ADMIN.email); setPw(DEMO_ADMIN.password); setErr(null); }}>Fill in</button>
          </div>
        )}
        <Link href="/" className="ad-login-back">← Back to the store</Link>
      </form>
    </div>
  );
}
