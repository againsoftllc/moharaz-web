import type { Metadata } from "next";
import PostEditor from "@/components/admin/blog/PostForm";

export const metadata: Metadata = { title: "New post" };

export default function Page() {
  return <PostEditor />;
}
