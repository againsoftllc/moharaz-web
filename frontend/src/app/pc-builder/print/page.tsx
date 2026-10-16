import type { Metadata } from "next";
import BuildQuote from "@/components/builder/BuildQuote";
import { slotDefsFromErp } from "@/lib/builder";
import { getBuilderSlots } from "@/lib/shop/api";

export const metadata: Metadata = {
  title: "PC Build Quotation",
  robots: { index: false, follow: false },
};

/** a printable quotation of a PC build (?b=<build code> from the builder's print button) */
export default async function PcBuildPrintPage() {
  const erp = await getBuilderSlots();
  return <BuildQuote slots={erp ? slotDefsFromErp(erp) : undefined} />;
}
