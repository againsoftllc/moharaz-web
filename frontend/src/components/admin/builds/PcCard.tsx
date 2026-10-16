import { Cart, Icon } from "@/components/Icon";
import { tk, type IconKey } from "@/lib/data";

const SPEC_ICONS: IconKey[] = ["cpu", "gpu", "ram", "ssd"];

/** Same tower art as the homepage "Explore the best prebuilt & custom gaming PC" row. */
export function Tower({ a, b, id }: { a: string; b: string; id: string }) {
  return (
    <svg viewBox="0 0 120 170">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} stopOpacity=".8" /><stop offset="1" stopColor={b} stopOpacity=".8" /></linearGradient></defs>
      <rect x="10" y="5" width="100" height="160" rx="8" fill="#0e0e11" stroke="#3f3f46" strokeWidth="2" />
      <rect x="36" y="18" width="64" height="134" rx="4" fill={`url(#${id})`} />
      <g fill="#52525b">{[...Array(10)].map((_, k) => <rect key={k} x="18" y={20 + k * 13} width="10" height="5" rx="1" />)}</g>
      {[50, 85, 120].map((y) => <circle key={y} cx="68" cy={y} r="14" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2" />)}
    </svg>
  );
}

/** The storefront's PC card, drawn from admin data. */
export default function PcCard({ id, name, badge, colors, highlights, price, old }: { id: string; name: string; badge: string; colors: [string, string]; highlights: string[]; price: number; old: number }) {
  return (
    <article className="pc">
      <div className="img">{badge && <span className="badge">{badge}</span>}<Tower a={colors[0]} b={colors[1]} id={`tw-${id}`} /></div>
      <h3>{name || "PC name"}</h3>
      <ul className="spec">{highlights.filter(Boolean).map((x, j) => <li key={j}><Icon k={SPEC_ICONS[j] ?? "tool"} />{x}</li>)}</ul>
      <div className="row"><div className="price"><b>{tk(price)}</b>{old > price && <s>{tk(old)}</s>}</div>{old > price && <span className="save">Save {tk(old - price)}</span>}</div>
      <div className="emi">0% EMI from <b>{tk(Math.round(price / 12))}/mo</b></div>
      <div className="btns"><span className="btn btn-red">Customize</span><span className="icon-btn"><Cart /></span></div>
    </article>
  );
}
