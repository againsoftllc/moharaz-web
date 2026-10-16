import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { pageLd } from "@/lib/schema";
import PcBuilder from "@/components/builder/PcBuilder";
import { applySlots, firstSlot, slotByKey, slotDefsFromErp, type Tab } from "@/lib/builder";
import { getBuilderSettings, getBuilderSlots } from "@/lib/shop/api";

export const metadata: Metadata = seo({
  alternates: { canonical: "/pc-builder" },
  title: "PC Builder — Build Your Custom PC",
  description: "Pick compatible CPU, motherboard, RAM, graphics card, storage and more. Live compatibility checks, power estimate and free assembly option.",
});

const TABS: Tab[] = ["overview", "components", "extras", "peripherals"];

export default async function PcBuilderPage({ searchParams }: PageProps<"/pc-builder">) {
  const [sp, erp, settings] = await Promise.all([searchParams, getBuilderSlots(), getBuilderSettings()]);
  // the admin's slots (falls back to the built-in list when AgainERP can't be reached)
  const slots = erp ? slotDefsFromErp(erp) : undefined;
  if (slots) applySlots(slots);
  const tab = TABS.includes(sp.tab as Tab) && (sp.tab === "overview" || firstSlot(sp.tab as Tab)) ? (sp.tab as Tab) : "components";
  const slot = typeof sp.slot === "string" && slotByKey.has(sp.slot) ? sp.slot : undefined;
  return (
    <>
      <JsonLd data={pageLd("/pc-builder", "PC Builder", metadata.description ?? undefined)} />
      <h1 className="sr-only">PC Builder</h1>
      {/* full-width wrapper carries the circuit-board texture behind the builder */}
      <div className="pcb-bg">
        <PcBuilder slots={slots} settings={settings} initialTab={tab} initialSlot={slot && slotByKey.get(slot)!.tab === tab ? slot : undefined} />
      </div>
    </>
  );
}
