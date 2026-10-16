import type { Tab } from "@/lib/builder";

/* Placeholder blocks shaped like the builder (same layout classes), shown while it loads. */
const B = ({ w, h, r }: { w?: number | string; h: number; r?: number | string }) => (
  <span className="sk" style={{ width: w ?? "100%", height: h, borderRadius: r }} />
);

/** part cards while a slot's parts load (also the picker's own loading state) */
export function PartRowsSkeleton({ label }: { label?: string }) {
  return (
    <>
      {label && <li className="sr-only" role="status">Loading {label.toLowerCase()}…</li>}
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="pk-row sk-row" aria-hidden>
          <span className="sk pk-img" />
          <div className="pk-info">
            <span className="sk-lines"><B w="90%" h={18} /><B w="65%" h={18} /></span>
            <span className="sk-chips"><B w={64} h={22} r={6} /><B w={96} h={22} r={6} /><B w={72} h={22} r={6} /></span>
            <span style={{ marginTop: "auto" }}><B w="40%" h={12} /></span>
          </div>
          <div className="pk-buy"><B w={110} h={26} /><B w={120} h={42} r={8} /></div>
        </li>
      ))}
    </>
  );
}

function PickerSkeleton() {
  return (
    <div className="pkr">
      <aside className="pk-slots">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="pk-card">
            <div className="pk-head">
              <B w={56} h={56} r={12} />
              <span className="sk-lines"><B w="55%" h={16} /><B w="38%" h={10} /></span>
            </div>
          </div>
        ))}
      </aside>
      <section className="pk-main">
        <div className="pk-top">
          <B w={160} h={22} /><span style={{ flex: 1 }} /><B w={200} h={38} r={6} /><B w={84} h={38} r={6} /><B w={140} h={38} r={6} />
        </div>
        <ul className="pk-list list">
          <PartRowsSkeleton />
        </ul>
      </section>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="ov">
      <div className="ov-list">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="ov-row">
            <div className="ov-slot"><B w={64} h={64} r={12} /><B w={56} h={10} /></div>
            <B h={44} r={8} />
            <B w={110} h={40} r={8} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BuilderSkeleton({ tab }: { tab: Tab }) {
  return (
    <div className="wrap pcb-page sk-page" aria-busy="true">
      <span className="sr-only" role="status">Loading PC Builder…</span>
      <div className="pcb-bar">
        <span className="sk-tabs">{[110, 120, 80, 104].map((w, i) => <B key={i} w={w} h={40} r={10} />)}</span>
        <span className="sk-tabs"><B w={150} h={32} r={999} /><B w={36} h={36} r={8} /><B w={36} h={36} r={8} /></span>
      </div>
      {tab === "overview" ? <OverviewSkeleton /> : <PickerSkeleton />}
      <div className="pcb-total">
        <div className="tt-bar"><B w={48} h={12} /><B w={130} h={22} /><span style={{ flex: 1 }} /><B w={40} h={40} r={8} /></div>
      </div>
    </div>
  );
}
