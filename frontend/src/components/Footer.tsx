import Link from "next/link";
import type { ReactNode } from "react";
import { StoreStatus, ToTop } from "./FooterExtras";
import { WhatsApp } from "./Icon";
import BottomNav from "./BottomNav";
import ContactFab from "./ContactFab";
import { SHOW_CONTACT_FAB, SHOW_PC_BUILDER } from "@/lib/features";
import { FACEBOOK_URL, WHATSAPP_URL, YOUTUBE_URL } from "@/lib/socials";
import { BRANCHES, PHONES, directionsUrl, tel } from "@/lib/stores";
import PaymentLogos from "./PaymentLogos";

const PHONE_IC = <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>;

/* per-branch label + icon for the store cards */
const BRANCH_LOOK: Record<string, [string, ReactNode]> = {
  showroom: ["Sales & live demos", <svg key="s" viewBox="0 0 24 24"><path d="M3 9 4.5 4h15L21 9" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /></svg>],
  service: ["Repairs & warranty", <svg key="r" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" /></svg>],
};

function VisitStore() {
  return (
    <section className="f-visit" aria-labelledby="fv-h">
      <div className="fv-intro">
        <span className="eyebrow fv-eye"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>Visit our store</span>
        <h3 id="fv-h">Come see it. <em>Try it in person.</em></h3>
        <p>Visit our head office at West Agargaon, Sher-E-Bangla Nagar, Dhaka. Drop by to see the latest gadgets and accessories up close.</p>
        <StoreStatus />
        <ul className="fv-hours">
          <li><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>Every day · 10 AM – 8 PM</li>
        </ul>
      </div>

      <div className="fv-cards">
        {BRANCHES.map((b, i) => {
          const [tag, icon] = BRANCH_LOOK[b.id] ?? BRANCH_LOOK.showroom;
          const floor = b.address.match(/Level \d+/)?.[0];
          return (
            <article key={b.id} className="fv-card">
              <a className="fv-map" href={directionsUrl(b)} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden>
                {floor && <span className="fv-floor">{floor}</span>}
                <span className="fv-go">Open in Maps <svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9" /></svg></span>
                <span className="fv-pin">{icon}</span>
              </a>
              <div className="fv-body">
                <span className="fv-no" aria-hidden>0{i + 1}</span>
                <div className="fv-title"><i className="fv-ic">{icon}</i><div><small>{tag}</small><h4>{b.name}</h4></div></div>
                <p className="fv-addr">{b.address}</p>
                <div className="fv-acts">
                  <a href={directionsUrl(b)} target="_blank" rel="noopener noreferrer" className="btn btn-red">Get directions</a>
                  <a href={tel(b.phone)} className="btn fv-call" aria-label={`Call ${b.name}: ${b.phone}`}>{PHONE_IC}{b.phone}</a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function Footer() {
  return (
    <>
      <footer>
        <div className="wrap">
          <VisitStore />

          <div className="f-call">
            <div className="fc-label">{PHONE_IC}<span><b>Call us</b>Hotlines</span></div>
            <ul className="fc-list" aria-label="Call us">
              {PHONES.map(([label, n]) => (
                <li key={n}><a href={tel(n)}><small>{label}</small><b>{n}</b></a></li>
              ))}
            </ul>
          </div>

          <div className="f-main">
            <nav aria-label="Customer service"><h5>CUSTOMER SERVICE</h5><Link href="/account?tab=orders" className="l">Track Order</Link><Link href="/shipping" className="l">Shipping &amp; Delivery</Link><Link href="/warranty" className="l">Warranty &amp; RMA</Link><Link href="/refund" className="l">Refund &amp; Returns</Link></nav>
            <nav aria-label="Company"><h5>COMPANY</h5><Link href="/about-us" className="l">About Moharaz</Link><Link href="/contact-us" className="l">Contact Us</Link><Link href="/blog" className="l">Blog</Link></nav>
            <nav aria-label="Important links" className="f-links"><h5>IMPORTANT LINKS</h5>{SHOW_PC_BUILDER && <Link href="/pc-builder" className="l">PC Builder</Link>}<Link href="/brand" className="l">Brands</Link><Link href="/#deals" className="l">Deal Zone</Link><Link href="/bundles" className="l">Bundle Deals</Link><Link href="/compare" className="l">Compare Products</Link></nav>
            <div className="f-follow">
              <h5>FOLLOW US</h5>
              <div className="soc">
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" style={{ background: "#1877F2" }} aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg></a>
                <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" style={{ background: "#FF0000" }} aria-label="YouTube"><svg viewBox="0 0 24 24"><path d="M22.5 6.4a2.8 2.8 0 0 0-2-2C18.9 4 12 4 12 4s-6.9 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 5.6 2.8 2.8 0 0 0 2 2c1.6.4 8.5.4 8.5.4s6.9 0 8.5-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-5.6z" /><path d="m10 15 5-3-5-3z" /></svg></a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ background: "#25D366" }} aria-label="WhatsApp"><WhatsApp /></a>              </div>
            </div>
          </div>

          <div className="f-pay">
            <h5>PAYMENT METHODS</h5>
            <PaymentLogos />
          </div>

          <div className="f-bot">
            <span className="fb-copy">© 2026 Moharaz. All rights reserved.</span>
            <nav className="fb-links" aria-label="Legal"><Link href="/terms-conditions">Terms &amp; Conditions</Link><span aria-hidden>·</span><Link href="/privacy-policy">Privacy Policy</Link><span aria-hidden>·</span><a href="/sitemap.xml">Sitemap</a></nav>
            <span className="fb-dev">Developed by&nbsp;<a href="https://againsoft.com" target="_blank" rel="noopener" className="dev">Againsoft</a><ToTop /></span>
          </div>
          <div className="f-mark" aria-hidden>MOHA<span>RAZ</span></div>
        </div>
      </footer>

      {SHOW_CONTACT_FAB && <ContactFab />}
      <BottomNav />
    </>
  );
}
