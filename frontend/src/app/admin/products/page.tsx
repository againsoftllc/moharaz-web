import type { Metadata } from "next";
import ProductsAdmin from "@/components/admin/products/ProductsAdmin";

export const metadata: Metadata = { title: "Products" };

export default async function Page({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  return <ProductsAdmin initial={{ q: one("q"), cat: one("cat"), stock: one("stock"), show: one("show") }} />;
}
