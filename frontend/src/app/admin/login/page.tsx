import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";

export const metadata: Metadata = { title: "Sign in" };

export default async function Page({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  return <AdminLogin next={typeof next === "string" ? next : undefined} />;
}
