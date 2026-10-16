import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { blogLd } from "@/lib/schema";
import BlogList from "@/components/blog/BlogList";
import { blogPosts } from "@/lib/shop/api";

export const revalidate = 60;

export const metadata: Metadata = seo({
  alternates: { canonical: "/blog" },
  title: { absolute: "Moharaz Blog" },
  description: "Buying guides, tips and news from Moharaz, Bangladesh.",
});

export default async function BlogPage() {
  const posts = await blogPosts().catch(() => []);
  return (
    <>
      <JsonLd data={blogLd(posts)} />
      <BlogList posts={posts} />
    </>
  );
}
