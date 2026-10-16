import type { Metadata } from "next";
import BundlesAdmin from "@/components/admin/bundles/BundlesAdmin";

export const metadata: Metadata = { title: "Bundle offers" };

export default function Page() {
  return <BundlesAdmin />;
}
