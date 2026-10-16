"use client";

import { useState, type FormEvent } from "react";
import { waLink } from "@/lib/stores";

const TOPICS = ["Product & price inquiry", "Order status", "Payment", "Warranty", "Corporate / bulk order", "Other"];
const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;

export default function ContactForm() {
  const [f, setF] = useState({ name: "", phone: "", topic: TOPICS[0], message: "" });
  const [err, setErr] = useState<Partial<Record<keyof typeof f, string>>>({});
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: undefined }); };

  // No backend yet: the message is handed to our WhatsApp sales line, pre-filled.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const e2: typeof err = {};
    if (!f.name.trim()) e2.name = "Please enter your name";
    if (!BD_PHONE.test(f.phone.replace(/[\s-]/g, ""))) e2.phone = "Enter a valid number, e.g. 01712345678";
    if (f.message.trim().length < 5) e2.message = "Please write a short message";
    setErr(e2);
    if (Object.keys(e2).length) return;
    window.open(waLink(`*${f.topic}*\nName: ${f.name.trim()}\nPhone: ${f.phone.trim()}\n\n${f.message.trim()}`), "_blank", "noopener,noreferrer");
    setSent(true);
  };

  if (sent) {
    return (
      <div className="ct-sent">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>
        <b>Thanks, {f.name.split(" ")[0]}!</b>
        <p>Your message opened in WhatsApp — just press send there. Our team replies within working hours.</p>
        <button className="btn btn-line" onClick={() => { setSent(false); setF({ ...f, message: "" }); }}>Send another message</button>
      </div>
    );
  }

  return (
    <form className="ct-form" onSubmit={submit} noValidate>
      <label className={err.name ? "err" : ""}><span>Your name</span><input value={f.name} onChange={set("name")} autoComplete="name" />{err.name && <small>{err.name}</small>}</label>
      <label className={err.phone ? "err" : ""}><span>Mobile number</span><input value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" />{err.phone && <small>{err.phone}</small>}</label>
      <label className="full"><span>Topic</span><select value={f.topic} onChange={set("topic")}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label className={`full ${err.message ? "err" : ""}`}><span>Message</span><textarea rows={5} value={f.message} onChange={set("message")} placeholder="Tell us what you need — product name, order number, etc." />{err.message && <small>{err.message}</small>}</label>
      <button className="btn btn-red full">Send via WhatsApp</button>
    </form>
  );
}
