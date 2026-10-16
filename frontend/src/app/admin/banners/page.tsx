import type { Metadata } from "next";
import BannersAdmin from "@/components/admin/BannersAdmin";

export const metadata: Metadata = { title: "Homepage banners" };

export default function Page() {
  return <BannersAdmin />;
}
