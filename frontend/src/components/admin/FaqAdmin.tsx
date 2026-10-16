"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { errorText, logActivity } from "@/lib/admin/api";
import { move, uid } from "@/lib/admin/format";
import { useCollection } from "@/lib/admin/hooks";
import { db } from "@/lib/admin/resources";
import { FAQ_CATS, type AdminFaq, type FaqCat } from "@/lib/admin/types";
import { AdIcon } from "./icons";
import { useToast } from "./Toast";
import { Empty, ErrorBox, Field, Order, PageHead, Seg, Skeleton, Toggle } from "./ui";

type Where = "all" | "home" | "help";

function FaqEditor({ initial, onSave, onCancel, busy }: { initial: AdminFaq; onSave: (f: AdminFaq) => void; onCancel: () => void; busy: boolean }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const set = (patch: Partial<AdminFaq>) => setF((x) => ({ ...x, ...patch }));
  const save = () => {
    if (!f.q.trim() || !f.a.trim()) { setErr("Write both the question and the answer."); return; }
    if (!f.home && !f.help) { setErr("Choose at least one place to show it."); return; }
    onSave({ ...f, q: f.q.trim(), a: f.a.trim() });
  };
  return (
    <div className="ad-faq-edit">
      <Field label="Question"><input value={f.q} onChange={(e) => set({ q: e.target.value })} autoFocus placeholder="e.g. Do you deliver outside Dhaka?" /></Field>
      <Field label="Answer" count={f.a.length} max={600}><textarea rows={3} value={f.a} onChange={(e) => set({ a: e.target.value })} /></Field>
      <div className="ad-g3" style={{ alignItems: "end" }}>
        <Field label="Topic">
          <select value={f.cat} onChange={(e) => set({ cat: e.target.value as FaqCat })}>{FAQ_CATS.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Toggle checked={f.home} onChange={(home) => set({ home })} label="Homepage" desc="FAQ section + Google rich results" />
        <Toggle checked={f.help} onChange={(help) => set({ help })} label="Help Center" desc="Searchable on /help" />
      </div>
      {err && <small style={{ color: "var(--red)", fontSize: 12, fontWeight: 600 }}>{err}</small>}
      <div>
        <button className="btn btn-line ad-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-red ad-sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save question"}</button>
      </div>
    </div>
  );
}

export default function FaqAdmin() {
  const faqs = useCollection(db.faqs);
  const toast = useToast();
  const [cat, setCat] = useState<FaqCat | "All">("All");
  const [where, setWhere] = useState<Where>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<AdminFaq | null>(null);
  const [del, setDel] = useState<AdminFaq | null>(null);
  const [busy, setBusy] = useState(false);

  const all = [...(faqs.items ?? [])].sort((a, b) => a.order - b.order);
  const shown = all.filter((f) => (cat === "All" || f.cat === cat) && (where === "all" || f[where]));
  const filtered = cat !== "All" || where !== "all";

  const run = async (fn: () => Promise<unknown>, ok: string, log?: string) => {
    setBusy(true);
    try { await fn(); toast(ok); if (log) logActivity(log, "/admin/faq"); return true; }
    catch (e) { toast(errorText(e), "err"); return false; }
    finally { setBusy(false); }
  };

  const reorder = (i: number, d: number) => {
    const next = move(all, i, d);
    const changed = next.filter((f, k) => f.order !== all[k]?.order || f.id !== all[k]?.id);
    run(() => Promise.all(changed.map((f) => faqs.save(f, f.id))), "Order updated");
  };

  const startAdd = () => {
    setOpen(null);
    setAdding({ id: uid("faq"), q: "", a: "", cat: cat === "All" ? "General" : cat, home: where !== "help", help: where !== "home", order: all.length + 1, published: true });
  };

  return (
    <>
      <PageHead
        title="FAQ"
        mode={faqs.mode}
        desc="Questions on the homepage (also sent to Google as FAQ rich results) and in the Help Center."
        actions={<button className="btn btn-red" onClick={startAdd}><AdIcon n="plus" />Add question</button>}
      />
      {faqs.error && <ErrorBox message={faqs.error} onRetry={faqs.reload} />}

      <div className="ad-tools">
        <select className="ad-in" value={cat} onChange={(e) => setCat(e.target.value as FaqCat | "All")} aria-label="Topic">
          <option value="All">All topics ({all.length})</option>
          {FAQ_CATS.map((c) => <option key={c} value={c}>{c} ({all.filter((f) => f.cat === c).length})</option>)}
        </select>
        <Seg label="Shown on" value={where} onChange={setWhere} options={[["all", "Everywhere"], ["home", "Homepage"], ["help", "Help Center"]] as const} />
      </div>

      {adding && (
        <div className="ad-faq open" style={{ marginBottom: 12 }}>
          <div><span className="ad-n"><AdIcon n="plus" /></span><div className="ad-faq-q"><b>New question</b></div></div>
          <FaqEditor initial={adding} busy={busy} onCancel={() => setAdding(null)} onSave={async (f) => { if (await run(() => faqs.save(f), "Question added", `Added FAQ “${f.q}”`)) setAdding(null); }} />
        </div>
      )}

      {faqs.loading ? <Skeleton rows={6} /> : !shown.length && !adding ? (
        <div className="ad-card"><Empty icon="help" title={all.length ? "No questions here" : "No questions yet"} action={<button className="btn btn-red" onClick={startAdd}>Add question</button>} /></div>
      ) : (
        <div className="ad-list">
          {shown.map((f) => {
            const i = all.indexOf(f);
            return (
              <div key={f.id} className={`ad-faq ${open === f.id ? "open" : ""} ${f.published ? "" : "off"}`}>
                <div>
                  {filtered ? <span className="ad-n">{f.order}</span> : <Order i={i} n={all.length} onMove={(d) => reorder(i, d)} label={f.q} />}
                  <button className="ad-faq-q" onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id}>
                    <b>{f.q}</b>
                    <small>{f.a}</small>
                  </button>
                  <span className="ad-pills" style={{ flex: "none" }}>
                    <span className="ad-b plain">{f.cat}</span>
                    {f.home && <span className="ad-b blue plain">Home</span>}
                    {f.help && <span className="ad-b plain">Help</span>}
                  </span>
                  <Toggle checked={f.published} onChange={(published) => run(() => faqs.save({ ...f, published }, f.id), published ? "Question shown" : "Question hidden")} label={<span className="sr-only">Published</span>} />
                  <button className="ad-ib" onClick={() => setOpen(open === f.id ? null : f.id)} aria-label={`Edit ${f.q}`}><AdIcon n="edit" /></button>
                  <button className="ad-ib ad-del" onClick={() => setDel(f)} aria-label={`Delete ${f.q}`}><AdIcon n="trash" /></button>
                </div>
                {open === f.id && (
                  <FaqEditor initial={f} busy={busy} onCancel={() => setOpen(null)} onSave={async (x) => { if (await run(() => faqs.save(x, f.id), "Question saved", `Updated FAQ “${x.q}”`)) setOpen(null); }} />
                )}
              </div>
            );
          })}
        </div>
      )}
      {filtered && shown.length > 1 && <p style={{ marginTop: 12, fontSize: 12, color: "var(--dim)" }}>Clear the filters to change the order.</p>}

      <ConfirmDialog
        open={!!del}
        tone="danger"
        title="Delete this question?"
        message={<><b>{del?.q}</b> will be removed. This can&apos;t be undone.</>}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDel(null)}
        onConfirm={async () => { if (del) await run(() => faqs.remove(del.id), "Question deleted", `Deleted FAQ “${del.q}”`); setDel(null); }}
      />
    </>
  );
}
