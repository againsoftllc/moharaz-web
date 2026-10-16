import type { Metadata } from "next";
import Link from "next/link";
import { NOINDEX, seo } from "@/lib/seo";

export const metadata: Metadata = seo({ robots: NOINDEX, alternates: { canonical: "/payment/sslcommerz/result" }, title: "Payment" });

/* Where AgainERP sends the shopper back after SSLCOMMERZ: ?order=…&status=success|failed|cancelled&message=… */
export default async function SslcommerzResultPage({ searchParams }: PageProps<"/payment/sslcommerz/result">) {
  const sp = await searchParams;
  const order = typeof sp.order === "string" ? sp.order : "";
  const status = typeof sp.status === "string" ? sp.status : "failed";
  const message = typeof sp.message === "string" ? sp.message : "";
  const ok = status === "success";
  const ref = order ? <> for order <b>{order}</b></> : null;

  return (
    <div className="wrap co-page">
      <div className="co-done">
        {ok && <span className="co-tick"><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg></span>}
        <span className="eyebrow">{ok ? "Payment received" : status === "cancelled" ? "Payment cancelled" : "Payment failed"}</span>
        <h1>{ok ? "Thank you!" : "Your order is saved"}</h1>
        {ok ? (
          <p>We&apos;ve received your payment{ref}. Our team will call you within 12 working hours to confirm delivery.</p>
        ) : (
          <p>
            {message || "The payment didn't go through"}. Your order{ref ? <> <b>{order}</b></> : null} is still placed — our team
            will call you with a secure payment link, or you can pay on delivery inside Dhaka.
          </p>
        )}
        <p className="co-demo">Need help? Call us and mention your order number.</p>
        <div className="co-done-btns">
          <Link href="/account?tab=orders" className="btn btn-line">My orders</Link>
          <Link href="/all" className="btn btn-red">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
