"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Storefront header, footer and overlays — left out under /admin, which brings its own shell. */
export default function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  if (usePathname().startsWith("/admin")) return children;
  return (
    <>
      {header}
      <main>{children}</main>
      {footer}
    </>
  );
}
