import { ldHtml } from "@/lib/schema";

/** schema.org structured data for search engines; one script per node */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <>{(Array.isArray(data) ? data : [data]).map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={ldHtml(d)} />)}</>;
}
