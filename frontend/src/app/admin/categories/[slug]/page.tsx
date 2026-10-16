import type { Metadata } from "next";
import CategoryEditor from "@/components/admin/categories/CategoryForm";

export const metadata: Metadata = { title: "Edit category" };

export default async function Page({ params }: PageProps<"/admin/categories/[slug]">) {
  const { slug } = await params;
  return <CategoryEditor slug={slug} />;
}
