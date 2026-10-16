import type { Metadata } from "next";
import BuildEditor from "@/components/admin/builds/BuildForm";

export const metadata: Metadata = { title: "New custom PC" };

export default function Page() {
  return <BuildEditor />;
}
