import { ChevL, ChevR } from "../Icon";

/** 1 … 4 5 6 … 12 style page list */
function pages(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = [1, total, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= total);
  const sorted = [...new Set(set)].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export default function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total < 2) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevL /></button>
      {pages(page, total).map((n, i) =>
        n === "…" ? <span key={`e${i}`} className="gap">…</span> : (
          <button key={n} className={n === page ? "on" : ""} aria-current={n === page ? "page" : undefined} onClick={() => onChange(n)}>{n}</button>
        )
      )}
      <button disabled={page === total} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevR /></button>
    </nav>
  );
}
