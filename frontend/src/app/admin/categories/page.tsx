import type { Metadata } from "next";
import CategoriesAdmin from "@/components/admin/categories/CategoriesAdmin";

export const metadata: Metadata = { title: "Categories" };

export default function Page() {
  return <CategoriesAdmin />;
}
