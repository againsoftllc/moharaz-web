import type { Metadata } from "next";
import PostEditor from "@/components/admin/blog/PostForm";

export const metadata: Metadata = { title: "Edit post" };

export default async function Page({ params }: PageProps<"/admin/blog/[slug]">) {
  const { slug } = await params;
  return <PostEditor slug={slug} />;
}
