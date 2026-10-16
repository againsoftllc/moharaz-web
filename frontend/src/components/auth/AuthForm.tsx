"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAuth, type Mode } from "./AuthProvider";
import { track } from "@/lib/tracking";
import { authMethod, isBdMobile, loginPin, requestOtp, verifyOtp, type Session } from "@/lib/account";

type Step = "phone" | "pin" | "otp";
const RESEND_SECONDS = 45;

function Field({ label, error, children, aside }: { label: string; error?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <label className={`fld ${error ? "err" : ""}`}>
      <span className="fld-top"><span>{label}</span>{aside}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}

/** four boxes for a 4-digit PIN or code: typing moves on, backspace moves back, a pasted code fills them all */
function Digits({ value, onChange, onDone, secret = false, label }: {
  value: string; onChange: (v: string) => void; onDone?: (v: string) => void; secret?: boolean; label: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (next: string) => {
    const v = next.replace(/\D/g, "").slice(0, 4);
    onChange(v);
    refs.current[Math.min(v.length, 3)]?.focus();
    if (v.length === 4) onDone?.(v);
  };
  return (
    <div className="otp-boxes" role="group" aria-label={label}>
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] ?? ""}
          type={secret ? "password" : "text"}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={4}
          aria-label={`${label} digit ${i + 1}`}
          autoFocus={i === 0}
          onChange={(e) => set(value.slice(0, i) + e.target.value.replace(/\D/g, "") + value.slice(i + 1))}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) {
              e.preventDefault();
              onChange(value.slice(0, i - 1));
              refs.current[i - 1]?.focus();
            }
          }}
          onPaste={(e) => { e.preventDefault(); set(e.clipboardData.getData("text")); }}
        />
      ))}
    </div>
  );
}

/**
 * Sign in / create account with a mobile number (as on Monarch IT): number → Continue → the 4-digit PIN when
 * the customer has set one, otherwise a one-time code by SMS. A new number becomes an account with the name
 * given here. The same form serves the login and register pages and the popup.
 */
export default function AuthForm({ mode, onSwitch, onDone }: { mode: Mode; onSwitch: (m: Mode) => void; onDone: () => void }) {
  const { signIn } = useAuth();
  const reg = mode === "register";
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [masked, setMasked] = useState("");
  const [isNew, setIsNew] = useState(reg);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  // resend countdown
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const finish = (s: Session) => {
    signIn(s.token, s.customer);
    if (isNew) track("CompleteRegistration");
    onDone();
  };

  const sendCode = async () => {
    setErr("");
    setBusy(true);
    try {
      const r = await requestOtp(phone);
      setMasked(r.masked);
      setDevCode(r.development_otp);
      setCode("");
      setStep("otp");
      setWait(RESEND_SECONDS);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't send the code");
    } finally {
      setBusy(false);
    }
  };

  const onContinue = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!isBdMobile(phone)) return setErr("Enter your mobile number, e.g. 01712345678");
    if (reg && name.trim().length < 2) return setErr("Enter your name");
    setErr("");
    setBusy(true);
    try {
      const m = await authMethod(phone);
      setMasked(m.masked);
      setIsNew(!m.is_registered);
      if (m.method === "pin") {
        setCode("");
        setStep("pin");
        setBusy(false);
        return;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
      return;
    }
    await sendCode();
  };

  const submitCode = async (value = code) => {
    if (value.length !== 4 || busy) return;
    if (step === "otp" && isNew && name.trim().length < 2) return setErr("Enter your name to create the account");
    setErr("");
    setBusy(true);
    try {
      finish(step === "pin" ? await loginPin(phone, value) : await verifyOtp(phone, value, name.trim() || undefined));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't sign in");
      setCode("");
      setBusy(false);
    }
  };

  const back = () => { setStep("phone"); setErr(""); setCode(""); };

  return (
    <form className="auth-form" onSubmit={step === "phone" ? onContinue : (e) => { e.preventDefault(); void submitCode(); }} noValidate>
      <div className="auth-title">
        <h2>{reg ? <>Join <em>Moharaz</em></> : <>Welcome to <em>Moharaz</em></>}</h2>
        <p>{reg ? "Create your account with your mobile number" : "Your complete tech hub"}</p>
      </div>

      {step === "phone" && (
        <>
          <p className="auth-hint">
            {reg
              ? "We'll send a one-time code to your mobile to confirm it's you."
              : "If you set a login PIN, you'll enter it after Continue — otherwise we send a one-time code by SMS."}
          </p>
          {reg && (
            <Field label="Your name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rakib Hasan" autoComplete="name" />
            </Field>
          )}
          <Field label="Mobile number" error={err}>
            <input
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/[^\d+]/g, "").slice(0, 14)); setErr(""); }}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
            />
          </Field>
          <button className="btn btn-red auth-submit" disabled={busy}>{busy ? <span className="spin" /> : "Continue"}</button>
        </>
      )}

      {step === "pin" && (
        <>
          <p className="auth-hint">Enter the 4-digit PIN for <b>{masked}</b>.</p>
          <Digits value={code} onChange={(v) => { setCode(v); setErr(""); }} onDone={(v) => void submitCode(v)} secret label="PIN" />
          {err && <small className="auth-err" role="alert">{err}</small>}
          <button className="btn btn-red auth-submit" disabled={busy || code.length !== 4}>{busy ? <span className="spin" /> : "Sign in"}</button>
          <div className="auth-row">
            <button type="button" className="link" onClick={back}>← Change number</button>
            <button type="button" className="link" onClick={() => void sendCode()} disabled={busy}>Forgot PIN? Get a code by SMS</button>
          </div>
        </>
      )}

      {step === "otp" && (
        <>
          <p className="auth-hint">We sent a 4-digit code to <b>{masked}</b>. It expires in 5 minutes.</p>
          {isNew && !reg && (
            <Field label="Your name (new account)">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rakib Hasan" autoComplete="name" />
            </Field>
          )}
          <Digits value={code} onChange={(v) => { setCode(v); setErr(""); }} onDone={(v) => void submitCode(v)} label="Code" />
          {devCode && <p className="auth-dev">Test mode (no SMS set up): use code <b>{devCode}</b></p>}
          {err && <small className="auth-err" role="alert">{err}</small>}
          <button className="btn btn-red auth-submit" disabled={busy || code.length !== 4}>
            {busy ? <span className="spin" /> : isNew ? "Create account" : "Verify & sign in"}
          </button>
          <div className="auth-row">
            <button type="button" className="link" onClick={back}>← Change number</button>
            <button type="button" className="link" onClick={() => void sendCode()} disabled={busy || wait > 0}>
              {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
            </button>
          </div>
        </>
      )}

      <p className="auth-switch">
        {reg ? "Already have an account?" : "New here?"}{" "}
        <button type="button" onClick={() => onSwitch(reg ? "login" : "register")}>{reg ? "Sign in" : "Create an account"}</button>
      </p>
      <p className="auth-terms">
        By continuing you agree to our <Link href="/terms-conditions" target="_blank">Terms</Link> and{" "}
        <Link href="/privacy-policy" target="_blank">Privacy Policy</Link>.
      </p>
    </form>
  );
}
