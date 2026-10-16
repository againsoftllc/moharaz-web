/* Marketing tags and events, set up per site in the AgainERP admin (Workspace → Plugins → Marketing Tracking).

   <Tracking /> (root layout) reads this site's settings from /api/v1/storefront/tracking — through the shop's own
   proxy, so the ERP knows which site is asking — and loads Google Tag Manager, GA4 and the Meta Pixel. Shop code
   calls track(): the event goes to the GTM dataLayer (GA4 e-commerce names), to GA4 when it is set up directly, to
   the Pixel, and — when the Conversions API is on — to the ERP, which sends it to Meta server-side under the same
   event ID so Meta counts it once. Events fired before the settings arrive wait in a queue. */

export type MetaEvent =
  | "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "Search" | "CompleteRegistration" | "Contact";

export type TrackingConfig = {
  enabled: boolean;
  gtm_id?: string;
  ga4_id?: string;
  fb_pixel_id?: string;
  pixel_events?: MetaEvent[];
  capi?: boolean;
};

export type TrackItem = { id: string; name: string; price: number; qty: number; brand?: string; category?: string };

export type TrackData = {
  items?: TrackItem[];
  /** defaults to the items' total */
  value?: number;
  search?: string;
  /** Purchase: the order number (also makes the event id, so a reload does not count twice) */
  orderId?: string;
};

type TrackUser = { email?: string; phone?: string; name?: string };

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const GA4_EVENT: Record<MetaEvent, string> = {
  PageView: "page_view",
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
  Search: "search",
  CompleteRegistration: "sign_up",
  Contact: "generate_lead",
};

let config: TrackingConfig | null = null;
let queue: [MetaEvent, TrackData][] = [];
let user: TrackUser | null = null;
const sent = new Set<string>();

const addScript = (src: string) => {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
};

/** the vendors' own loader snippets, run once: they set up dataLayer / gtag / fbq straight away and fetch the
    libraries in the background, so nothing tracked meanwhile is lost */
function loadTags(c: TrackingConfig) {
  const w = window;
  w.dataLayer = w.dataLayer || [];
  if (c.gtm_id) {
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    addScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(c.gtm_id)}`);
  }
  if (c.ga4_id) {
    w.gtag = function gtag() {
      // gtag queues the `arguments` object itself, as Google's snippet does
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
    w.gtag("js", new Date());
    w.gtag("config", c.ga4_id, { send_page_view: false });
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(c.ga4_id)}`);
  }
  if (c.fb_pixel_id && !w.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    w.fbq = fbq;
    w._fbq = fbq;
    addScript("https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", c.fb_pixel_id);
  }
}

export function setTrackingConfig(c: TrackingConfig) {
  if (config) return;
  config = c;
  if (c.enabled) loadTags(c);
  const waiting = queue;
  queue = [];
  if (c.enabled) waiting.forEach(([n, d]) => track(n, d));
}

export function setTrackingUser(u: TrackUser | null) {
  user = u;
}

const cookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1];

/** Meta's click id: the _fbc cookie, else built from ?fbclid= on the landing page */
function fbc() {
  const saved = cookie("_fbc");
  if (saved) return saved;
  const id = new URLSearchParams(location.search).get("fbclid");
  return id ? `fb.1.${Date.now()}.${id}` : undefined;
}

export function track(name: MetaEvent, data: TrackData = {}) {
  if (typeof window === "undefined") return;
  if (!config) {
    queue.push([name, data]);
    return;
  }
  if (!config.enabled) return;

  const eventId = data.orderId ? `purchase-${data.orderId}` : `${name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  if (sent.has(eventId)) return;
  sent.add(eventId);
  const items = data.items ?? [];
  const value = Math.round((data.value ?? items.reduce((s, i) => s + i.price * i.qty, 0)) * 100) / 100;

  // Google Tag Manager / GA4 (GA4 e-commerce event names and item fields)
  const ga = GA4_EVENT[name];
  const gaItems = items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty, item_brand: i.brand, item_category: i.category }));
  const gaParams = {
    ...(items.length ? { currency: "BDT", value, items: gaItems } : {}),
    ...(data.orderId ? { transaction_id: data.orderId } : {}),
    ...(data.search ? { search_term: data.search } : {}),
  };
  if (config.gtm_id) {
    if (items.length) window.dataLayer!.push({ ecommerce: null });
    window.dataLayer!.push({
      event: ga,
      event_id: eventId,
      ...(name === "PageView" ? { page_location: location.href, page_title: document.title } : {}),
      ...(items.length ? { ecommerce: gaParams } : gaParams),
    });
  }
  if (config.ga4_id && window.gtag) window.gtag("event", ga, gaParams);

  // Meta Pixel (+ Conversions API through the ERP)
  if (!config.fb_pixel_id || !config.pixel_events?.includes(name)) return;
  const custom: Record<string, unknown> = {
    ...(items.length ? {
      currency: "BDT",
      value,
      content_type: "product",
      content_ids: items.map((i) => i.id),
      contents: items.map((i) => ({ id: i.id, quantity: i.qty, item_price: i.price })),
      num_items: items.reduce((s, i) => s + i.qty, 0),
    } : {}),
    ...(name === "ViewContent" && items[0] ? { content_name: items[0].name, content_category: items[0].category } : {}),
    ...(data.search ? { search_string: data.search } : {}),
    ...(data.orderId ? { order_id: data.orderId } : {}),
  };
  window.fbq?.("track", name, custom, { eventID: eventId });
  if (config.capi) {
    const [first, ...rest] = (user?.name ?? "").trim().split(/\s+/);
    void fetch("/api/v1/storefront/tracking/events", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event_name: name,
        event_id: eventId,
        event_source_url: location.href,
        fbp: cookie("_fbp"),
        fbc: fbc(),
        user: user ? { email: user.email, phone: user.phone, first_name: first || undefined, last_name: rest.join(" ") || undefined } : undefined,
        custom_data: custom,
      }),
    }).catch(() => {});
  }
}

/** a catalogue product as a tracked item */
export const productItem = (p: { name: string; price: number; brand?: string; cat?: string }, id: string, qty = 1): TrackItem => ({
  id,
  name: p.name,
  price: p.price,
  qty,
  brand: p.brand || undefined,
  category: p.cat || undefined,
});
