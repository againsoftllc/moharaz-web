/* Admin data layer.

   Every admin screen reads and writes through a Collection (list / get / save / remove) or a
   Singleton (get / put). SOURCE decides where each one lives:

     "api"    REST calls to API_BASE — the backend on localhost while it's being built. There is no
              health check: a localhost API_BASE is only used when the admin itself runs on localhost
              (on the live site it's skipped, so browsers never try to reach their own machine), and if
              the server can't be reached at all, screens fall back to the browser copy below.
     "local"  a demo copy in this browser's localStorage, seeded from the storefront's static data.

   Flip a resource to "api" once its endpoints are live.

   Contract (JSON bodies are the types in ./types.ts):
     GET    /{path}                      → T[]   (or { data: T[] })
     GET    /{path}/{id}                 → T
     POST   /{path}                      T → T   (backend assigns product ids)
     PUT    /{path}/{id}                 T → T   (id in the URL is the old one when a slug changes)
     DELETE /{path}/{id}                 → 204
     GET    /settings/{name}             → T     (social links, bundle rules, header menu)
     PUT    /settings/{name}             T → T
     POST   /uploads                     multipart "file" → { url }
     POST   /auth/login                  { email, password } → AdminUser   (401 + { message } when wrong)
   Errors: non-2xx with optional { message } — the message is shown to the admin. */

import type { Activity, AdminUser } from "./types";

/* set NEXT_PUBLIC_API_URL in frontend/.env.local (or the host's env); unset = no backend, screens use the browser copy */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type Resource = "products" | "categories" | "bundles" | "bundleRules" | "builds" | "posts" | "faqs" | "banners" | "socials" | "menu" | "uploads" | "auth";
export type Mode = "api" | "local";

export const SOURCE: Record<Resource, Mode> = {
  products: "api",
  categories: "api",
  posts: "api",
  banners: "api",
  uploads: "api",
  bundles: "local",
  bundleRules: "local",
  builds: "local",
  faqs: "local",
  socials: "local",
  menu: "local",
  auth: "local",
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/* ---------- is there a backend to use? (no network check) ---------- */
const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i;
/** set once a request can't connect at all; the rest of this visit uses the browser copy */
let unreachable = false;

/** API_BASE is set, hasn't failed to connect, and isn't someone else's localhost (a localhost backend only exists on the dev machine). */
export function apiEnabled() {
  if (!API_BASE || unreachable || typeof window === "undefined") return false;
  return !LOCALHOST.test(API_BASE) || ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
}

export const usesApi = (r: Resource) => SOURCE[r] === "api";
async function modeOf(r: Resource): Promise<Mode> {
  return usesApi(r) && apiEnabled() ? "api" : "local";
}
const cantConnect = (e: unknown) => e instanceof ApiError && e.status === 0;

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const form = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      cache: "no-store",
      headers: body === undefined || form ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    unreachable = true;
    throw new ApiError(0, `Can't reach the server at ${API_BASE}`);
  }
  if (!res.ok) {
    let msg = `${method} ${path} failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = String(j.message);
    } catch {}
    throw new ApiError(res.status, msg);
  }
  const text = res.status === 204 ? "" : await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ---------- browser copy ---------- */
const LS = "ut-admin:";
function readLocal<T>(name: string, seed: () => T): T {
  try {
    const raw = localStorage.getItem(LS + name);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return seed();
}
function writeLocal(name: string, value: unknown) {
  try {
    localStorage.setItem(LS + name, JSON.stringify(value));
  } catch {
    throw new ApiError(0, "This browser's demo storage is full — use smaller images or reset the demo data.");
  }
}
/** Forget every local edit and go back to the storefront's static data. */
export function resetLocal() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(LS)).forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/* ---------- collections ---------- */
export type Key = string | number;
export type Collection<T, K extends Key = Key> = {
  name: Resource;
  path: string;
  /** singular, for messages: "product" */
  noun: string;
  key: (t: T) => K;
  seed: () => T[];
  /** give a new item its key before it's stored locally (e.g. next product id) */
  assignKey?: (t: T, existing: T[]) => T;
};

const enc = (k: Key) => encodeURIComponent(String(k));

/* reads that can't connect fall through to the browser copy */
export async function listItems<T, K extends Key>(c: Collection<T, K>): Promise<{ items: T[]; mode: Mode }> {
  if ((await modeOf(c.name)) === "api") {
    try {
      const r = await http<T[] | { data: T[] }>("GET", c.path);
      return { items: Array.isArray(r) ? r : r?.data ?? [], mode: "api" };
    } catch (e) {
      if (!cantConnect(e)) throw e;
    }
  }
  return { items: readLocal(c.name, c.seed), mode: "local" };
}

export async function getItem<T, K extends Key>(c: Collection<T, K>, key: K): Promise<{ item: T | undefined; mode: Mode }> {
  if ((await modeOf(c.name)) === "api") {
    try {
      return { item: await http<T>("GET", `${c.path}/${enc(key)}`), mode: "api" };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return { item: undefined, mode: "api" };
      if (!cantConnect(e)) throw e;
    }
  }
  return { item: readLocal(c.name, c.seed).find((t) => c.key(t) === key), mode: "local" };
}

/** Create (prevKey undefined) or update the item stored under prevKey. */
export async function saveItem<T, K extends Key>(c: Collection<T, K>, item: T, prevKey?: K): Promise<T> {
  if ((await modeOf(c.name)) === "api") {
    return prevKey === undefined ? http<T>("POST", c.path, item) : http<T>("PUT", `${c.path}/${enc(prevKey)}`, item);
  }
  const all = readLocal(c.name, c.seed);
  const saved = prevKey === undefined && c.assignKey ? c.assignKey(item, all) : item;
  const k = c.key(saved);
  const clash = all.findIndex((t) => c.key(t) === k);
  if (prevKey === undefined) {
    if (clash >= 0) throw new ApiError(409, `A ${c.noun} with the id "${k}" already exists.`);
    all.push(saved);
  } else {
    const at = all.findIndex((t) => c.key(t) === prevKey);
    if (at < 0) throw new ApiError(404, `That ${c.noun} no longer exists.`);
    if (clash >= 0 && clash !== at) throw new ApiError(409, `A ${c.noun} with the id "${k}" already exists.`);
    all[at] = saved;
  }
  writeLocal(c.name, all);
  return saved;
}

export async function removeItem<T, K extends Key>(c: Collection<T, K>, key: K): Promise<void> {
  if ((await modeOf(c.name)) === "api") return http<void>("DELETE", `${c.path}/${enc(key)}`);
  writeLocal(c.name, readLocal(c.name, c.seed).filter((t) => c.key(t) !== key));
}

/* ---------- singletons ---------- */
export type Singleton<T> = { name: Resource; path: string; seed: () => T };

export async function getSingleton<T>(s: Singleton<T>): Promise<{ value: T; mode: Mode }> {
  if ((await modeOf(s.name)) === "api") {
    try {
      return { value: await http<T>("GET", s.path), mode: "api" };
    } catch (e) {
      if (!cantConnect(e)) throw e;
    }
  }
  return { value: readLocal(s.name, s.seed), mode: "local" };
}
export async function putSingleton<T>(s: Singleton<T>, value: T): Promise<T> {
  if ((await modeOf(s.name)) === "api") return http<T>("PUT", s.path, value);
  writeLocal(s.name, value);
  return value;
}

/* ---------- uploads ---------- */
export type Uploaded = { url: string; w: number; h: number };

/** Upload an image and return its url plus the original size. Offline / local: a downscaled data URL. */
export async function uploadImage(file: File, maxW = 1600): Promise<Uploaded> {
  if (!file.type.startsWith("image/")) throw new ApiError(415, "Please choose an image file (JPG, PNG, WebP or SVG).");
  const bmp = file.type === "image/svg+xml" ? null : await createImageBitmap(file);
  const w = bmp?.width ?? 0, h = bmp?.height ?? 0;

  if ((await modeOf("uploads")) === "api") {
    const fd = new FormData();
    fd.append("file", file);
    const r = await http<{ url: string }>("POST", "/uploads", fd);
    return { url: r.url, w, h };
  }
  if (!bmp) return { url: await readAsDataUrl(file), w, h };
  const scale = Math.min(1, maxW / w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return { url: canvas.toDataURL("image/webp", 0.82), w, h };
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fail(new ApiError(0, "Couldn't read that file."));
    r.readAsDataURL(file);
  });

/* ---------- sign-in ---------- */

/** Demo-only account checked in the browser until SOURCE.auth is "api". Not real security: anyone can read it in the bundle. */
export const DEMO_ADMIN = { email: "admin@moharaz.com", password: "admin123", name: "Store Admin", role: "Administrator" };

export async function login(email: string, password: string): Promise<AdminUser> {
  if ((await modeOf("auth")) === "api") return http<AdminUser>("POST", "/auth/login", { email, password });
  if (email.trim().toLowerCase() === DEMO_ADMIN.email && password === DEMO_ADMIN.password) {
    const { name, role } = DEMO_ADMIN;
    return { name, email: DEMO_ADMIN.email, role };
  }
  throw new ApiError(401, "That email and password don't match an admin account.");
}

/* ---------- recent changes (this browser only) ---------- */
export function logActivity(text: string, href?: string) {
  const list = readLocal<Activity[]>("activity", () => []);
  try { writeLocal("activity", [{ at: new Date().toISOString(), text, href }, ...list].slice(0, 30)); } catch {}
}
export const readActivity = () => readLocal<Activity[]>("activity", () => []);
