import type { Metadata } from "next";
import BundleEditor from "@/components/admin/bundles/BundleForm";

export const metadata: Metadata = { title: "Edit bundle" };

export default async function Page({ params }: PageProps<"/admin/bundles/[slug]">) {
  const { slug } = await params;
  return <BundleEditor slug={slug} />;
}
