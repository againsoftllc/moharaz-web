import type { Metadata } from "next";
import ProductEditor from "@/components/admin/products/ProductForm";

export const metadata: Metadata = { title: "Edit product" };

export default async function Page({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  return <ProductEditor id={Number(id)} />;
}
