/* The shopper's account, from AgainERP (/api/v1/storefront/auth/*, /account/*), through this site's /api proxy.
   Sign-in is by mobile number: a PIN when the customer has set one, otherwise a one-time code by SMS. The
   session token is kept in this browser and sent as a Bearer token. */

const TOKEN_KEY = "ut-session";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(`/api/v1/storefront${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError("Can't reach the shop — check your connection and try again.", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.detail;
    const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg : null;
    throw new ApiError(msg || "Something went wrong — please try again.", res.status);
  }
  return body as T;
}

/* ── types (AgainERP's) ─────────────────────────────────────────────────── */

export type Customer = {
  id: string;
  customer_code: string;
  name: string;
  phone: string;
  email: string;
  profile_image: string | null;
  city: string;
  region: string;
  country: string;
  reward_points: number;
  total_orders: number;
  wallet_balance: number | string;
  has_pin: boolean;
  identifier: string;
  identifier_type: string;
};

export type Profile = Customer & {
  emergency_number: string;
  address: string;
  customer_since: string | null;
};

export type Session = { token: string; expires_at: string; customer: Customer };

export type Summary = {
  customer: Customer;
  status_stats: { key: string; label: string; count: number; pct: number }[];
  recent_orders: { id: string; order_number: string; title: string; status: string; date: string; amount: number | string }[];
};

export type AccountOrder = {
  id: string;
  order_number: string;
  date: string;
  product_label: string;
  total: number | string;
  paid: number | string;
  due: number | string;
  status: string;
  payment_status: string;
  shipment_status: string;
};

export type AccountPayment = {
  id: string;
  date: string;
  order_number: string;
  amount: number | string;
  method: string;
  status: string;
  trx_id: string | null;
};

/* ── sign in ────────────────────────────────────────────────────────────── */

export const authMethod = (identifier: string) =>
  call<{ method: "pin" | "otp"; identifier: string; masked: string; has_pin: boolean; is_registered: boolean }>(
    "/auth/method", { method: "POST", body: JSON.stringify({ identifier }) });

export const requestOtp = (identifier: string) =>
  call<{ expires_in: number; masked: string; development_otp: string | null }>(
    "/auth/request-otp", { method: "POST", body: JSON.stringify({ identifier }) });

export const verifyOtp = (identifier: string, otp: string, name?: string) =>
  call<Session>("/auth/verify-otp", { method: "POST", body: JSON.stringify({ identifier, otp, name: name || undefined }) });

export const loginPin = (identifier: string, pin: string) =>
  call<Session>("/auth/login-pin", { method: "POST", body: JSON.stringify({ identifier, pin }) });

export const fetchMe = () => call<{ data: Customer }>("/auth/me", {}, true).then((r) => r.data);

export const logout = () => call<{ ok: boolean }>("/auth/logout", { method: "POST" }, true).catch(() => null);

export const setPin = (pin: string, confirm_pin: string) =>
  call<{ data: Customer }>("/auth/pin", { method: "PUT", body: JSON.stringify({ pin, confirm_pin }) }, true).then((r) => r.data);

export const clearPin = () => call<{ data: Customer }>("/auth/pin", { method: "DELETE" }, true).then((r) => r.data);

/* ── account ────────────────────────────────────────────────────────────── */

export const fetchProfile = () => call<{ data: Profile }>("/account/profile", {}, true).then((r) => r.data);

export type ProfilePatch = Partial<Pick<Profile, "name" | "email" | "emergency_number" | "city" | "region" | "address" | "profile_image">>;
export const saveProfile = (patch: ProfilePatch) =>
  call<{ data: Profile }>("/account/profile", { method: "PATCH", body: JSON.stringify(patch) }, true).then((r) => r.data);

export function uploadPhoto(file: File) {
  const form = new FormData();
  form.append("file", file);
  return call<{ data: Profile }>("/account/profile/photo", { method: "POST", body: form }, true).then((r) => r.data);
}

export const fetchSummary = () => call<{ data: Summary }>("/account/summary", {}, true).then((r) => r.data);

export const fetchOrders = () => call<{ data: AccountOrder[]; total: number }>("/account/orders", {}, true);

export const fetchPayments = () => call<{ data: AccountPayment[] }>("/account/payments", {}, true).then((r) => r.data);

/** "01712345678" → valid Bangladeshi mobile number (also +88 / 88 prefixed) */
export const isBdMobile = (v: string) => /^(?:\+?88)?01[3-9]\d{8}$/.test(v.replace(/[\s-]/g, ""));

/* ── checkout ───────────────────────────────────────────────────────────── */

export type OrderLine = { itemId: string; variantId?: string; qty: number };
export type PlaceOrderInput = {
  lines: OrderLine[];
  name: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  /** a different delivery address */
  shipping?: { address: string; district: string };
  shippingMethod: "standard" | "express" | "pickup";
  paymentMethod: string;
  couponCode?: string;
  notes?: string;
};
export type PlacedOrder = { id: string; order_number: string; grand_total: number | string; payment_method: string };

/** Places the order in AgainERP: the lines go into a fresh shop cart, then checkout turns it into a webshop
    order + sales order (admin: Website → Sales → Orders) for the signed-in customer, or a guest matched by
    phone / email. */
export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  let cartToken = "";
  for (const line of input.lines) {
    const res = await call<{ data: { cart_token: string } }>("/cart/items", {
      method: "POST",
      headers: cartToken ? { "X-Cart-Token": cartToken } : {},
      body: JSON.stringify({ item_id: line.itemId, variant_id: line.variantId, quantity: line.qty }),
    });
    cartToken = res.data.cart_token;
  }
  const [first, ...rest] = input.name.trim().split(/\s+/);
  const res = await call<{ data: PlacedOrder }>(
    "/checkout",
    {
      method: "POST",
      headers: { "X-Cart-Token": cartToken },
      body: JSON.stringify({
        first_name: first,
        last_name: rest.join(" "),
        phone: input.phone.replace(/[\s-]/g, ""),
        email: input.email?.trim() || "",
        address: input.address,
        district: input.district,
        billing_same_as_shipping: !input.shipping,
        ...(input.shipping
          ? { shipping_address: input.shipping.address, shipping_city: input.shipping.district, shipping_region: input.shipping.district }
          : {}),
        shipping_method: input.shippingMethod,
        payment_method: input.paymentMethod,
        coupon_code: input.couponCode || undefined,
        notes: input.notes || undefined,
      }),
    },
    true,
  );
  return res.data;
}

/** Whether the shop takes card / bKash / Nagad payments through SSLCOMMERZ right now (its plugin is on). */
export async function sslcommerzAvailable(): Promise<boolean> {
  const res = await call<{ data: { payment_methods: { id: string }[] } }>("/checkout/options");
  return res.data.payment_methods.some((m) => m.id === "sslcommerz");
}

/** Opens an SSLCOMMERZ payment for an order just placed; returns the gateway page to send the shopper to.
    SSLCOMMERZ then brings them back to /payment/sslcommerz/result. */
export async function startSslcommerz(orderId: string): Promise<string> {
  const res = await call<{ data: { gateway_url: string } }>(
    "/payments/sslcommerz/create",
    { method: "POST", body: JSON.stringify({ order_id: orderId }) },
    true,
  );
  if (!res.data.gateway_url) throw new ApiError("SSLCOMMERZ didn't return a payment page", 502);
  return res.data.gateway_url;
}
