export type Branch = { id: string; name: string; address: string; phone: string; hours: string; mapQuery: string };

export const BRANCHES: Branch[] = [
  {
    id: "showroom",
    name: "Moharaz Head Office",
    address: "(Level 2) 60, West Agargaon, Sher-E-Bangla Nagar, Dhaka 1207, Bangladesh",
    phone: "01805042474",
    hours: "10:00 – 20:00",
    mapQuery: "60 West Agargaon, Sher-E-Bangla Nagar, Dhaka 1207",
  },
];

/** Daily opening hours in Dhaka time (hours 0–23, day 0 = Sunday); closedDay -1 = open every day */
export const STORE_HOURS = { open: 10, close: 20, closedDay: -1 };

/** Google Maps directions from the visitor's current location */
export const directionsUrl = (b: Branch) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.mapQuery)}`;
/** Keyless Google Maps embed for an <iframe> */
export const embedUrl = (b: Branch) => `https://www.google.com/maps?q=${encodeURIComponent(b.mapQuery)}&z=17&output=embed`;

export const PHONES: [string, string][] = [
  ["Support", "01805042474"],
  ["Support", "01805042478"],
];

export const EMAIL = "info@moharaz.com";

export const tel = (n: string) => `tel:+88${n.replace(/-/g, "")}`;
export const WA_NUMBER = "8801896444228";
/** the store's WhatsApp chat (footer, socials) */
export const WA_URL = `https://api.whatsapp.com/send?phone=${WA_NUMBER}`;
/** the same chat with a message typed in for the customer */
export const waLink = (text: string) => `${WA_URL}&text=${encodeURIComponent(text)}`;
