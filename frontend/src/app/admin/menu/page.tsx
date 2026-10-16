import type { Metadata } from "next";
import MenuAdmin from "@/components/admin/MenuAdmin";

export const metadata: Metadata = { title: "Header menu" };

export default function Page() {
  return <MenuAdmin />;
}
