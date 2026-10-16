import type { Metadata } from "next";
import PostsAdmin from "@/components/admin/blog/PostsAdmin";

export const metadata: Metadata = { title: "Blog posts" };

export default function Page() {
  return <PostsAdmin />;
}
