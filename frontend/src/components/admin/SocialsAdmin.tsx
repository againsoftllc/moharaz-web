"use client";

import { useState } from "react";
import { errorText, logActivity } from "@/lib/admin/api";
import { useSingleton } from "@/lib/admin/hooks";
import { db } from "@/lib/admin/resources";
import type { Socials } from "@/lib/admin/types";
import { NETWORKS, networkByKey, type SocialKey } from "@/lib/socials";
import { AdIcon } from "./icons";
import { useToast } from "./Toast";
import { Card, ErrorBox, Note, Order, PageHead, Skeleton, SourceTag, Toggle, useUnsaved } from "./ui";

/** "01805042474" → https://api.whatsapp.com/send?phone=8801805042474 ; anything else is returned trimmed */
function normalise(key: SocialKey, url: string) {
  const v = url.trim();
  if (key === "whatsapp" && /^\+?[\d\s-]{10,}$/.test(v)) {
    const d = v.replace(/\D/g, "");
    return `https://api.whatsapp.com/send?phone=${d.startsWith("880") ? d : `88${d.replace(/^0?/, "0")}`}`;
  }
  return v;
}
const problem = (url: string) => (!url ? null : /^https?:\/\/[^\s.]+\.[^\s]+$/.test(url) ? null : "Enter a full link starting with https://");

export default function SocialsAdmin() {
  const s = useSingleton(db.socials);
  return (
    <>
      <PageHead title="Social Links" mode={s.mode} desc="The “Follow us” icons in the site footer. Links without a URL are hidden." />
      {s.error && <ErrorBox message={s.error} />}
      {s.value ? <SocialsForm key={JSON.stringify(s.value)} initial={s.value} save={s.save} mode={s.mode} /> : !s.error && <Skeleton rows={6} />}
    </>
  );
}

function SocialsForm({ initial, save, mode }: { initial: Socials; save: (v: Socials) => Promise<Socials>; mode: "api" | "local" | null }) {
  const toast = useToast();
  const [list, setList] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const dirty = JSON.stringify(list) !== JSON.stringify(initial);
  useUnsaved(dirty && !busy);

  const put = (i: number, patch: Partial<Socials[number]>) => setList((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const moveRow = (i: number, d: number) => setList((l) => { const n = [...l]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const missing = NETWORKS.filter((n) => !list.some((x) => x.key === n.key));
  const shown = list.filter((x) => x.enabled && x.url && !problem(x.url));
  const bad = list.filter((x) => problem(x.url)).length;

  const submit = async () => {
    setTried(true);
    if (bad) { toast("Fix the highlighted links first", "err"); return; }
    setBusy(true);
    try {
      await save(list);
      logActivity("Updated social media links", "/admin/socials");
      toast("Social links saved");
    } catch (e) { toast(errorText(e), "err"); } finally { setBusy(false); }
  };

  return (
    <div className="ad-dash">
      <div className="ad-stack">
        <Card title="Networks" desc="Reorder with the arrows. Turn a network off to hide it without losing its link." actions={mode && <SourceTag mode={mode} />}>
          <div className="ad-list">
            {list.map((x, i) => {
              const n = networkByKey.get(x.key)!;
              const err = tried || x.url ? problem(x.url) : null;
              return (
                <div key={x.key} className={`ad-soc ${x.enabled ? "" : "off"}`}>
                  <Order i={i} n={list.length} onMove={(d) => moveRow(i, d)} label={n.label} />
                  <span className="ad-soc-ic" style={{ background: n.bg }}><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: n.icon }} /></span>
                  <label className={`ad-f ${err ? "err" : ""}`}>
                    <span className="ad-f-top"><span>{n.label}</span>{!x.url && <em>Not set — hidden</em>}</span>
                    <input value={x.url} onChange={(e) => put(i, { url: e.target.value })} onBlur={(e) => put(i, { url: normalise(x.key, e.target.value) })} placeholder={x.key === "whatsapp" ? "Phone number or https://api.whatsapp.com/send?phone=…" : n.placeholder} inputMode="url" />
                    {err && <small className="msg">{err}</small>}
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Toggle checked={x.enabled} onChange={(enabled) => put(i, { enabled })} label={<span className="sr-only">Show {n.label}</span>} />
                    {x.url && !problem(x.url) && <a className="ad-ib" href={x.url} target="_blank" rel="noreferrer" aria-label={`Open ${n.label}`}><AdIcon n="ext" /></a>}
                    <button className="ad-ib ad-del" onClick={() => setList((l) => l.filter((_, j) => j !== i))} aria-label={`Remove ${n.label}`}><AdIcon n="trash" /></button>
                  </div>
                </div>
              );
            })}
          </div>
          {missing.length > 0 && (
            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              <small style={{ fontSize: 12, fontWeight: 700, color: "var(--dim)" }}>Add another network</small>
              <div className="ad-add">
                {missing.map((n) => <button key={n.key} type="button" onClick={() => setList((l) => [...l, { key: n.key, url: "", enabled: true }])}><AdIcon n="plus" />{n.label}</button>)}
              </div>
            </div>
          )}
        </Card>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          {dirty && <span className="ad-dirty">Unsaved changes</span>}
          <button className="btn btn-line" disabled={!dirty || busy} onClick={() => { setList(initial); setTried(false); }}>Discard</button>
          <button className="btn btn-red" disabled={!dirty || busy} onClick={submit}>{busy ? "Saving…" : "Save links"}</button>
        </div>
      </div>

      <aside className="ad-stack">
        <Card title="Footer preview">
          <div className="ad-soc-prev">
            <h5>FOLLOW US</h5>
            {shown.length ? (
              <div className="soc">
                {shown.map((x) => {
                  const n = networkByKey.get(x.key)!;
                  return <a key={x.key} style={{ background: n.bg }} aria-label={n.label} title={x.url}><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: n.icon }} /></a>;
                })}
              </div>
            ) : <p>No links to show yet.</p>}
            <p>{shown.length} of {list.length} networks visible</p>
          </div>
        </Card>
        <Note>WhatsApp accepts a phone number — it&apos;s turned into an <code>api.whatsapp.com</code> chat link for you.</Note>
      </aside>
    </div>
  );
}
