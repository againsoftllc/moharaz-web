import type { Metadata } from "next";
import { NOINDEX, seo } from "@/lib/seo";
import AuthPage from "@/components/auth/AuthPage";

export const metadata: Metadata = seo({ robots: NOINDEX, alternates: { canonical: "/register" }, title: "Create Account" });

/** ?next=… is kept when switching between login and register */
export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  return <AuthPage mode="register" next={typeof next === "string" ? next : undefined} />;
}
