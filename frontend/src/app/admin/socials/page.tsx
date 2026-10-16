import type { Metadata } from "next";
import SocialsAdmin from "@/components/admin/SocialsAdmin";

export const metadata: Metadata = { title: "Social links" };

export default function Page() {
  return <SocialsAdmin />;
}
