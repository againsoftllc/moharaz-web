import type { Metadata } from "next";
import BundleEditor from "@/components/admin/bundles/BundleForm";

export const metadata: Metadata = { title: "New bundle" };

export default function Page() {
  return <BundleEditor />;
}
