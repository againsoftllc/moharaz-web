import type { Metadata } from "next";
import BuildEditor from "@/components/admin/builds/BuildForm";

export const metadata: Metadata = { title: "Edit custom PC" };

export default async function Page({ params }: PageProps<"/admin/custom-pc/[id]">) {
  const { id } = await params;
  return <BuildEditor id={id} />;
}
