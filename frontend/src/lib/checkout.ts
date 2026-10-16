/* Shared by the cart page and checkout so prices and codes always agree. */

export type ShipKey = "dhaka" | "outside";
export const SHIPPING: Record<ShipKey, { label: string; fee: number; eta: string; note: string }> = {
  dhaka: { label: "Inside Dhaka City", fee: 70, eta: "Within 24 hours", note: "Up to 500g. Heavier or larger items may cost more — we'll confirm by phone." },
  outside: { label: "Outside Dhaka (Courier)", fee: 150, eta: "2–3 working days", note: "Courier charge is paid by the customer. Partial advance payment required." },};

/** All 64 districts of Bangladesh, grouped by division; only Dhaka can use in-city delivery and cash on delivery. */
export const DISTRICTS: Record<string, string[]> = {
  Dhaka: ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"],
  Chattogram: ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"],
  Rajshahi: ["Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj"],
  Khulna: ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"],
  Barishal: ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  Sylhet: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
  Rangpur: ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"],
  Mymensingh: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
};
/** shipping that matches a district: Dhaka → in-city delivery, anywhere else → courier */
export const shipFor = (district: string): ShipKey => (district === "Dhaka" ? "dhaka" : "outside");

/** demo promo codes: code → % off the items subtotal */
export const COUPONS: Record<string, number> = { MOHARAZ10: 10, WELCOME5: 5 };
/** demo gift certificates: code → fixed amount */
export const GIFTS: Record<string, number> = { GIFT500: 500, GIFT1000: 1000 };

export type PayKey = "online" | "cod";
export const PAYMENTS: Record<PayKey, { label: string; hint: string }> = {
  online: { label: "Credit / Debit Card, bKash, Nagad, DBBL Nexus", hint: "Secure payment via SSLCOMMERZ" },
  cod: { label: "Cash on Delivery", hint: "Inside Dhaka only" },
};
/** EMI (offered on product pages) needs a minimum order value */
export const EMI_MIN = 5000;

export const discountFor = (subtotal: number, coupon?: string) => (coupon && COUPONS[coupon] ? Math.round((subtotal * COUPONS[coupon]) / 100) : 0);

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";
export const ORDER_STATUS: Record<OrderStatus, string> = { pending: "Pending", processing: "Processing", completed: "Completed", cancelled: "Cancelled" };

export type Order = {
  id: string;
  date: string;
  name: string;
  /** the signed-in account (or the email typed at checkout) — the account dashboard lists orders by it */
  email?: string;
  status?: OrderStatus;
  paid?: boolean;
  phone: string;
  total: number;
  items: { name: string; qty: number; price: number }[];
  ship: ShipKey;
  pay: PayKey;
};
export const ORDERS_KEY = "moharaz-orders";
