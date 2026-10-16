import type { Metadata } from "next";
import BuildsAdmin from "@/components/admin/builds/BuildsAdmin";

export const metadata: Metadata = { title: "Custom PCs" };

export default function Page() {
  return <BuildsAdmin />;
}
