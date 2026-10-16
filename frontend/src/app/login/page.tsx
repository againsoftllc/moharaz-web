import type { Metadata } from "next";
import { NOINDEX, seo } from "@/lib/seo";
import AuthPage from "@/components/auth/AuthPage";

export const metadata: Metadata = seo({ robots: NOINDEX, alternates: { canonical: "/login" }, title: "Login" });

/** ?next=/account?tab=orders — where to return after signing in */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <AuthPage mode="login" next={typeof next === "string" ? next : undefined} />;
}
