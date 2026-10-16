import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { contactLd } from "@/lib/schema";
import Link from "next/link";
import ContactForm from "@/components/contact/ContactForm";
import { WhatsApp } from "@/components/Icon";
import { BRANCHES, PHONES, directionsUrl, embedUrl, tel, waLink } from "@/lib/stores";

export const metadata: Metadata = seo({
  alternates: { canonical: "/contact-us" },
  title: "Contact Us",
  description: "Contact Moharaz: support hotlines, WhatsApp and directions to our head office at West Agargaon, Sher-E-Bangla Nagar, Dhaka.",
});

export default function ContactPage() {
  return (
    <div className="wrap info-page">
      <JsonLd data={contactLd()} />
      <nav className="crumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><b>Contact Us</b></nav>

      <header className="tc-head">
        <span className="eyebrow">Get in touch</span>
        <h1>Contact Us</h1>
        <p>Questions about a product, an order or a warranty claim? Call, message or visit us — we&apos;re open every day, 10am – 8pm.</p>
      </header>

      <div className="ct-grid">
        <section>
          <h2 className="ct-h">Call us</h2>
          <div className="ct-phones">
            {PHONES.map(([label, n]) => (
              <a key={n} href={tel(n)} className="ct-phone">
                <span className="ab-ic"><svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg></span>
                <span><small>{label}</small><b>{n}</b></span>
              </a>
            ))}
            <a href={waLink("Hi Moharaz, I need some help.")} target="_blank" rel="noopener noreferrer" className="ct-phone wa">
              <span className="ab-ic"><WhatsApp /></span>
              <span><small>WhatsApp chat</small><b>01896444228</b></span>
            </a>
          </div>
          <div className="ct-hours">
            <div><span>Every day</span><b>10:00 – 20:00</b></div>
            <div><span>Online orders</span><b>24/7</b></div>
          </div>
        </section>

        <section className="ct-formbox">
          <h2 className="ct-h">Send us a message</h2>
          <ContactForm />
        </section>
      </div>

      <section id="stores" className="ct-stores">
        <h2 className="ct-h">Our locations</h2>
        <div className="ct-branches">
          {BRANCHES.map((b) => (
            <article key={b.id} id={b.id} className="ct-branch">
              <iframe src={embedUrl(b)} title={`Map: ${b.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              <div className="ct-branch-body">
                <span className="eyebrow">{b.name}</span>
                <p>{b.address}</p>
                <ul>
                  <li><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>{b.hours}</li>
                  <li><svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg><a href={tel(b.phone)}>{b.phone}</a></li>
                </ul>
                <a href={directionsUrl(b)} target="_blank" rel="noopener noreferrer" className="btn btn-red">Get directions →</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
