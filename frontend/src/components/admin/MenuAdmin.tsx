"use client";

import { useState } from "react";
import { errorText, logActivity } from "@/lib/admin/api";
import { useCollection, useSingleton } from "@/lib/admin/hooks";
import { db } from "@/lib/admin/resources";
import type { SiteMenu } from "@/lib/admin/types";
import { DEFAULT_MENU, type MenuColumn, type MenuItem, type MenuLink } from "@/lib/menu";
import { AdIcon } from "./icons";
import { useToast } from "./Toast";
import { Card, ErrorBox, Field, Note, Order, PageHead, Skeleton, SourceTag, Toggle, useUnsaved } from "./ui";

/** the store's dropdown has 4 columns; past 4 groups they flow down them */
const MAX_COLS = 8;
/** link suggestions besides the category pages */
const PAGES: [string, string][] = [
  ["/all", "All products"], ["/pc-builder", "PC Builder"], ["/bundles", "Bundle offers"], ["/bundles/create", "Make a bundle"],
  ["/brand", "Brands"], ["/blog", "Blog"], ["/contact-us", "Contact"],
];

const move = <T,>(a: T[], i: number, d: number) => { const n = [...a]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; };
const patch = <T,>(a: T[], i: number, f: (x: T) => T) => a.map((x, j) => (j === i ? f(x) : x));
const without = <T,>(a: T[], i: number) => a.filter((_, j) => j !== i);

const hrefProblem = (href: string) =>
  !href.trim() ? "Add a link" : /^(\/|https?:\/\/|#|tel:|mailto:)/.test(href.trim()) ? null : "Start with / for a store page or https:// for another site";

/** trimmed copy without blank link rows / empty columns */
function tidy(list: SiteMenu): SiteMenu {
  return list.map((m) => ({
    ...m,
    label: m.label.trim(),
    href: m.href.trim(),
    columns: m.columns
      // `...l` keeps a link's flyout entries, which this page doesn't edit
      .map((c) => ({ title: c.title.trim(), links: c.links.map((l) => ({ ...l, label: l.label.trim(), href: l.href.trim() })).filter((l) => l.label || l.href) }))
      .filter((c) => c.title || c.links.length),
  }));
}

/** how many fields in this item still need fixing */
function itemErrors(m: MenuItem) {
  let n = (m.label.trim() ? 0 : 1) + (hrefProblem(m.href) ? 1 : 0);
  for (const c of m.columns) {
    n += (c.title.trim() ? 0 : 1) + (c.links.length ? 0 : 1);
    for (const l of c.links) n += (l.label.trim() ? 0 : 1) + (hrefProblem(l.href) ? 1 : 0);
  }
  return n;
}

export default function MenuAdmin() {
  const s = useSingleton(db.menu);
  return (
    <>
      <PageHead title="Header Menu" mode={s.mode} desc="The category bar under the site header, also used in the mobile menu. Items with dropdown columns open a mega menu on hover." />
      {s.error && <ErrorBox message={s.error} />}
      {s.value ? <MenuForm key={JSON.stringify(s.value)} initial={s.value} save={s.save} mode={s.mode} /> : !s.error && <Skeleton rows={8} />}
    </>
  );
}

function MenuForm({ initial, save, mode }: { initial: SiteMenu; save: (v: SiteMenu) => Promise<SiteMenu>; mode: "api" | "local" | null }) {
  const toast = useToast();
  const cats = useCollection(db.categories);
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const dirty = JSON.stringify(list) !== JSON.stringify(initial);
  const isDefault = JSON.stringify(list) === JSON.stringify(DEFAULT_MENU);
  useUnsaved(dirty && !busy);

  const putItem = (i: number, f: (m: MenuItem) => MenuItem) => setList((l) => patch(l, i, f));
  const moveItem = (i: number, d: number) => { setList((l) => move(l, i, d)); setOpen((o) => (o === i ? i + d : o === i + d ? i : o)); };
  const dropItem = (i: number) => { setList((l) => without(l, i)); setOpen((o) => (o === i ? null : o !== null && o > i ? o - 1 : o)); };
  const addItem = () => { setList((l) => [...l, { label: "", href: "", enabled: true, columns: [] }]); setOpen(list.length); };
  const restart = (to: SiteMenu) => { setList(to); setOpen(null); setTried(false); };

  const submit = async () => {
    const clean = tidy(list);
    setList(clean);
    const bad = clean.findIndex((m) => itemErrors(m) > 0);
    if (bad >= 0) { setTried(true); setOpen(bad); toast("Fix the highlighted fields first", "err"); return; }
    setBusy(true);
    try {
      await save(clean);
      logActivity("Updated the header menu", "/admin/menu");
      toast("Menu saved");
    } catch (e) { toast(errorText(e), "err"); } finally { setBusy(false); }
  };

  const shown = list.filter((m) => m.enabled && m.label.trim());
  const preview = open !== null ? list[open] : undefined;

  return (
    <div className="ad-dash">
      <div className="ad-stack">
        <Card title="Menu items" desc="Reorder with the arrows. Turn an item off to hide it without losing its links." actions={mode && <SourceTag mode={mode} />}>
          <div className="ad-list">
            {list.map((m, i) => {
              const errs = tried ? itemErrors(m) : 0;
              const links = m.columns.reduce((n, c) => n + c.links.length, 0);
              return (
                <div key={i} className={`ad-mi ${open === i ? "open" : ""} ${m.enabled ? "" : "off"}`}>
                  <div className="ad-mi-h">
                    <Order i={i} n={list.length} onMove={(d) => moveItem(i, d)} label={m.label || "item"} />
                    <button className="ad-mi-t" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                      <b>{m.label || "Untitled item"}{errs > 0 && <em>{errs} to fix</em>}</b>
                      <small>
                        {m.columns.length
                          ? `Dropdown · ${m.columns.length} column${m.columns.length > 1 ? "s" : ""} · ${links} link${links === 1 ? "" : "s"}`
                          : `Link · ${m.href || "not set"}`}
                      </small>
                    </button>
                    <Toggle checked={m.enabled} onChange={(enabled) => putItem(i, (x) => ({ ...x, enabled }))} label={<span className="sr-only">Show {m.label}</span>} />
                    <button className="ad-ib ad-del" onClick={() => dropItem(i)} aria-label={`Remove ${m.label || "item"}`}><AdIcon n="trash" /></button>
                  </div>
                  {open === i && <ItemEditor m={m} set={(f) => putItem(i, f)} tried={tried} />}
                </div>
              );
            })}
          </div>
          <div className="ad-add" style={{ marginTop: 14 }}>
            <button type="button" onClick={addItem}><AdIcon n="plus" />Add menu item</button>
          </div>
          <datalist id="ad-menu-links">
            {(cats.items ?? []).map((c) => <option key={c.slug} value={`/${c.slug}`}>{c.name}</option>)}
            {PAGES.map(([href, label]) => <option key={href} value={href}>{label}</option>)}
          </datalist>
        </Card>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
          {dirty && <span className="ad-dirty">Unsaved changes</span>}
          <button className="btn btn-line" disabled={isDefault || busy} onClick={() => restart(structuredClone(DEFAULT_MENU))}>Reset to default</button>
          <button className="btn btn-line" disabled={!dirty || busy} onClick={() => restart(initial)}>Discard</button>
          <button className="btn btn-red" disabled={!dirty || busy} onClick={submit}>{busy ? "Saving…" : "Save menu"}</button>
        </div>
      </div>

      <aside className="ad-stack">
        <Card title="Preview">
          <div className="ad-mprev">
            <ul>{shown.map((m, i) => <li key={i} className={preview === m ? "on" : ""}>{m.label}{m.columns.length > 0 && <AdIcon n="down" />}</li>)}</ul>
            {preview && preview.columns.length > 0 && (
              <div className="ad-mprev-mega">
                {preview.columns.map((c, j) => (
                  <div key={j}><h6>{c.title || "Untitled"}</h6>{c.links.map((l, k) => <span key={k}>{l.label || "—"}</span>)}</div>
                ))}
              </div>
            )}
          </div>
          <p className="ad-mprev-cap">
            {shown.length} of {list.length} items visible · {preview?.columns.length ? `${preview.label || "Untitled item"} dropdown` : "open an item to preview its dropdown"}
          </p>
        </Card>
        <Note>Links starting with <code>/</code> open store pages — pick a category from the suggestions, e.g. <code>/laptop</code>. Use <code>https://</code> for other sites.</Note>
      </aside>
    </div>
  );
}

function ItemEditor({ m, set, tried }: { m: MenuItem; set: (f: (m: MenuItem) => MenuItem) => void; tried: boolean }) {
  const req = (v: string, msg: string) => (tried && !v.trim() ? msg : null);
  const hrefErr = (v: string) => (tried || v.trim() ? hrefProblem(v) : null);
  const putCol = (j: number, f: (c: MenuColumn) => MenuColumn) => set((x) => ({ ...x, columns: patch(x.columns, j, f) }));
  const putLink = (j: number, k: number, p: Partial<MenuLink>) => putCol(j, (c) => ({ ...c, links: patch(c.links, k, (l) => ({ ...l, ...p })) }));

  return (
    <div className="ad-mi-b">
      <div className="ad-g2">
        <Field label="Label" error={req(m.label, "Add a label")}>
          <input value={m.label} onChange={(e) => set((x) => ({ ...x, label: e.target.value }))} placeholder="e.g. Laptop" autoFocus={!m.label} />
        </Field>
        <Field label="Link" error={hrefErr(m.href)} hint={m.columns.length ? "Opens on click; the dropdown shows on hover" : undefined}>
          <input value={m.href} onChange={(e) => set((x) => ({ ...x, href: e.target.value }))} list="ad-menu-links" placeholder="/laptop" />
        </Field>
      </div>

      <div className="ad-mcols">
        <div className="ad-mcols-h">
          <b>Dropdown columns</b>
          <small>{m.columns.length ? "Shown left to right, in this order" : "None — this item is a plain link"}</small>
        </div>
        {m.columns.map((c, j) => (
          <div key={j} className="ad-mcol">
            <div className="ad-mcol-h">
              <Order i={j} n={m.columns.length} onMove={(d) => set((x) => ({ ...x, columns: move(x.columns, j, d) }))} label={c.title || "column"} />
              <Cell label="Column title" value={c.title} onChange={(title) => putCol(j, (x) => ({ ...x, title }))} error={req(c.title, "Add a title")} placeholder="Column title, e.g. Brand" />
              <button className="ad-ib ad-del" onClick={() => set((x) => ({ ...x, columns: without(x.columns, j) }))} aria-label={`Remove column ${c.title}`}><AdIcon n="trash" /></button>
            </div>
            {c.links.map((l, k) => (
              <div key={k} className="ad-ml">
                <Order i={k} n={c.links.length} onMove={(d) => putCol(j, (x) => ({ ...x, links: move(x.links, k, d) }))} label={l.label || "link"} />
                <Cell label="Link text" value={l.label} onChange={(label) => putLink(j, k, { label })} error={req(l.label, "Add the text")} placeholder="Link text" />
                <Cell label="Link URL" value={l.href} onChange={(href) => putLink(j, k, { href })} error={hrefErr(l.href)} placeholder="/…" list="ad-menu-links" />                <button className="ad-ib ad-del" onClick={() => putCol(j, (x) => ({ ...x, links: without(x.links, k) }))} aria-label={`Remove link ${l.label}`}><AdIcon n="trash" /></button>
              </div>
            ))}
            {tried && !c.links.length && <small className="ad-mcol-msg">Add at least one link</small>}
            <div className="ad-add ad-ml-add">
              <button type="button" onClick={() => putCol(j, (x) => ({ ...x, links: [...x.links, { label: "", href: "" }] }))}><AdIcon n="plus" />Add link</button>
            </div>
          </div>
        ))}
        {m.columns.length < MAX_COLS && (
          <div className="ad-add">
            <button type="button" onClick={() => set((x) => ({ ...x, columns: [...x.columns, { title: "", links: [{ label: "", href: "" }] }] }))}>
              <AdIcon n="plus" />Add dropdown column
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** compact input for column / link rows — the label is for screen readers only */
function Cell({ label, value, onChange, error, placeholder, list }: {
  label: string; value: string; onChange: (v: string) => void; error?: string | null; placeholder?: string; list?: string;
}) {
  return (
    <label className={`ad-f ${error ? "err" : ""}`}>
      <span className="sr-only">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} list={list} />
      {error && <small className="msg">{error}</small>}
    </label>
  );
}
