import type { Metadata } from "next";
import { Hind_Siliguri, Plus_Jakarta_Sans } from "next/font/google";
import AuthModal from "@/components/auth/AuthModal";
import { AuthProvider } from "@/components/auth/AuthProvider";
import CartDrawer from "@/components/cart/CartDrawer";
import CompareDock from "@/components/compare/CompareDock";
import { CompareProvider } from "@/components/compare/CompareProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import CartToast from "@/components/cart/CartToast";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { headerMenu } from "@/lib/shop/menu";
import { OG_DEFAULTS } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { siteLd } from "@/lib/schema";
import SiteChrome from "@/components/SiteChrome";
import ThemeScript from "@/components/ThemeScript";
import Tracking from "@/components/Tracking";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import "./globals.css";
import "./shop.css";
import "./auth.css";
import "./bundles.css";
import "./footer.css";
import "./brands.css";
import "./builder.css";
import "./compare.css";
import "./checkout.css";
import "./product.css";
import "./info.css";
import "./blog.css";
import "./account.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MOHARAZ - Computer, Mobile and Gadget Shop in BD",
    template: "%s | Moharaz",
  },
  applicationName: "Moharaz",
  // pages without their own picture share the logo (as the previous shop did)
  openGraph: OG_DEFAULTS,
  // every page indexable unless it says otherwise (cart, checkout, account …); next.config sends the same as X-Robots-Tag
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  description:
    "Shop at Moharaz for top-quality computers, mobiles, and gadgets in Bangladesh. Best prices on laptops, smartphones, and accessories with fast delivery!",
};

/* self-hosted with the site (next/font): no request to Google before the first paint, no render-blocking CSS */
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-jakarta" });
// Bangla text only: not preloaded on every page
const hind = Hind_Siliguri({ subsets: ["bengali", "latin"], weight: ["400", "600"], display: "swap", variable: "--font-hind", preload: false });

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // header menu from the AgainERP admin (Website → Menus → Header); null → the built-in menu
  const menu = await headerMenu();
  return (
    <html lang="en" className={`${jakarta.variable} ${hind.variable}`} data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* dark by default; re-apply a saved light/dark choice before first paint */}
        <ThemeScript />
      </head>
      <body>
        <JsonLd data={siteLd()} />
        <AuthProvider>
        <Tracking />
        <CartProvider>
        <CompareProvider>
        <WishlistProvider>
          <SiteChrome header={<Header menu={menu} />} footer={<><Footer /><CartDrawer /><CartToast /><AuthModal /><CompareDock /></>}>
            {children}
          </SiteChrome>
        </WishlistProvider>
        </CompareProvider>
        </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
