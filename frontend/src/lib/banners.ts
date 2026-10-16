export type Banner = { src: string; alt: string; w: number; h: number; href?: string };

/** promo banners per category slug — drop ~1456×180 images in /public/banners and list them here; two or more rotate as a carousel */
const BANNERS: Record<string, Banner[]> = {
  "graphics-card": [
    {
      src: "/banners/graphics-card.webp",
      alt: "Ultimate upgrade, powers unleashed — get CONTROL Resonant with select GeForce RTX 50 Series",
      w: 1456,
      h: 180,
    },
  ],
};

/** shown for categories (and All Products) that don't have their own banners yet; [] hides it */
const FALLBACK: Banner[] = BANNERS["graphics-card"];

export const bannersFor = (cat?: string): Banner[] => (cat && BANNERS[cat]?.length ? BANNERS[cat] : FALLBACK);
