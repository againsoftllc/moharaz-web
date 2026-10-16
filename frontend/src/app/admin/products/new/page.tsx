import type { Metadata } from "next";
import ProductEditor from "@/components/admin/products/ProductForm";

export const metadata: Metadata = { title: "Add product" };

export default async function Page({ searchParams }: PageProps<"/admin/products/new">) {
  const { from } = await searchParams;
  return <ProductEditor from={typeof from === "string" && from ? Number(from) : undefined} />;
}
