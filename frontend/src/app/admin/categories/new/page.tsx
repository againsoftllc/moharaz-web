import type { Metadata } from "next";
import CategoryEditor from "@/components/admin/categories/CategoryForm";

export const metadata: Metadata = { title: "Add category" };

export default function Page() {
  return <CategoryEditor />;
}
