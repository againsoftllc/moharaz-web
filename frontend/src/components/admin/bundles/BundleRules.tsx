"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { errorText, logActivity } from "@/lib/admin/api";
import { slugify } from "@/lib/admin/format";
import { useSingleton } from "@/lib/admin/hooks";
import { db } from "@/lib/admin/resources";
import type { BundleRules as Rules } from "@/lib/admin/types";
import { ic, type IconKey } from "@/lib/data";
import { AdIcon } from "../icons";
import { useToast } from "../Toast";
import { Card, ErrorBox, Field, Note, Skeleton, SourceTag, Toggle, useUnsaved } from "../ui";

/** Discount / free-gift plans for customer-made bundles (/bundles/create) and the gift list. */
export default function BundleRules() {
  const rules = useSingleton(db.bundleRules);
  if (rules.error) return <ErrorBox message={rules.error} />;
  if (!rules.value) return <Skeleton rows={8} />;
  return <RulesForm key={JSON.stringify(rules.value)} initial={rules.value} save={rules.save} mode={rules.mode} />;
}

function RulesForm({ initial, save, mode }: { initial: Rules; save: (r: Rules) => Promise<Rules>; mode: "api" | "local" | null }) {
  const toast = useToast();
  const [r, setR] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(r) !== JSON.stringify(initial);
  useUnsaved(dirty && !busy);

  const plans = [...r.plans].sort((a, b) => a.size - b.size);
  const setPlan = (size: number, patch: Partial<Rules["plans"][number]>) => setR((x) => ({ ...x, plans: x.plans.map((p) => (p.size === size ? { ...p, ...patch } : p)) }));
  const setGift = (i: number, patch: Partial<Rules["gifts"][number]>) => setR((x) => ({ ...x, gifts: x.gifts.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));

  const problems = [
    ...plans.filter((p, i) => i > 0 && p.pct < plans[i - 1].pct).map((p) => `The ${p.size}-item plan gives a smaller discount than the ${p.size - 1}-item plan.`),
    ...plans.filter((p) => p.picks > r.gifts.filter((g) => p.premium || !g.premium).length).map((p) => `The ${p.size}-item plan offers ${p.picks} gift picks but only has ${r.gifts.filter((g) => p.premium || !g.premium).length} gifts to choose from.`),
    ...r.gifts.filter((g) => !g.name.trim()).map(() => "Every gift needs a name."),
  ];

  const submit = async () => {
    if (problems.length) { toast(problems[0], "err"); return; }
    setBusy(true);
    try {
      await save({ ...r, gifts: r.gifts.map((g) => ({ ...g, id: g.id || slugify(g.name) })) });
      logActivity("Updated create-your-own bundle rules", "/admin/bundles");
      toast("Bundle rules saved");
    } catch (e) { toast(errorText(e), "err"); } finally { setBusy(false); }
  };

  return (
    <div className="ad-stack">
      <Note>These apply on <b>/bundles/create</b>, where shoppers pick 2–{plans[plans.length - 1]?.size} products themselves. The bigger the bundle, the bigger the discount and the more free gifts they choose.</Note>

      <Card title="Plans by bundle size" actions={mode && <SourceTag mode={mode} />}>
        <div className="ad-tw">
          <table className="ad-t">
            <thead><tr><th>Bundle size</th><th>Discount</th><th>Free gifts to choose</th><th>Premium gifts allowed</th></tr></thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.size}>
                  <td><b>{p.size} products</b></td>
                  <td style={{ width: 160 }}><div className="ad-pre" style={{ maxWidth: 120 }}><input className="ad-in" type="number" min={0} max={50} value={p.pct} onChange={(e) => setPlan(p.size, { pct: Math.max(0, +e.target.value) })} aria-label={`${p.size}-item discount`} style={{ border: 0 }} /><span>%</span></div></td>
                  <td style={{ width: 160 }}><input className="ad-in" type="number" min={0} max={5} value={p.picks} onChange={(e) => setPlan(p.size, { picks: Math.max(0, +e.target.value) })} aria-label={`${p.size}-item gift picks`} style={{ maxWidth: 100 }} /></td>
                  <td><Toggle checked={p.premium} onChange={(premium) => setPlan(p.size, { premium })} label={p.premium ? "Yes" : "No"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Free gifts" desc="Premium gifts are only offered with plans that allow them." actions={<button className="btn btn-line ad-sm" onClick={() => setR((x) => ({ ...x, gifts: [...x.gifts, { id: "", name: "", value: 0, icon: "tool" }] }))}><AdIcon n="plus" />Add gift</button>}>
        <div className="ad-list">
          {r.gifts.map((g, i) => (
            <div key={i} className="ad-li" style={{ flexWrap: "wrap" }}>
              <span className="ad-th" style={{ color: "var(--red)" }}><Icon k={g.icon} /></span>
              <Field label="Gift name" className="grow" ><input value={g.name} onChange={(e) => setGift(i, { name: e.target.value })} placeholder="e.g. Gaming Mouse Pad" /></Field>
              <Field label="Value"><div className="ad-pre" style={{ width: 130 }}><span>৳</span><input type="number" min={0} value={g.value} onChange={(e) => setGift(i, { value: Math.max(0, +e.target.value) })} /></div></Field>
              <Field label="Icon">
                <select value={g.icon} onChange={(e) => setGift(i, { icon: e.target.value as IconKey })} style={{ width: 120 }}>
                  {(Object.keys(ic) as IconKey[]).map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </Field>
              <div style={{ alignSelf: "end", paddingBottom: 10 }}><Toggle checked={!!g.premium} onChange={(premium) => setGift(i, { premium })} label="Premium" /></div>
              <button className="ad-ib ad-del" style={{ alignSelf: "end", marginBottom: 2 }} onClick={() => setR((x) => ({ ...x, gifts: x.gifts.filter((_, j) => j !== i) }))} aria-label={`Remove ${g.name || "gift"}`}><AdIcon n="trash" /></button>
            </div>
          ))}
        </div>
      </Card>

      {problems.length > 0 && <div className="ad-warn"><AdIcon n="alert" /><span>{problems.join(" ")}</span></div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
        {dirty && <span className="ad-dirty">Unsaved changes</span>}
        <button className="btn btn-line" disabled={!dirty || busy} onClick={() => setR(initial)}>Discard</button>
        <button className="btn btn-red" disabled={!dirty || busy} onClick={submit}>{busy ? "Saving…" : "Save rules"}</button>
      </div>
    </div>
  );
}
