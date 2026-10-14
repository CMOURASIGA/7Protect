"use client";
import { getFoundation } from "./foundation-service";
import { ensureCommercialV2DemoData } from "./commercial-service";
import { prepareOperationalDemo } from "./operational-service";
import { CommercialDemoRepository } from "@/repositories/local/commercial-demo-repository";
import { getDatabase } from "@/repositories/local/database";
import { isDemoMode } from "@/lib/demo-mode";

export async function resetCommercialDemoScenario() {
  if (!isDemoMode()) throw new Error("Reset do cenário disponível somente na demonstração.");
  const { tenant } = await getFoundation();
  if (!tenant) throw new Error("Tenant ausente.");
  const result = await new CommercialDemoRepository(getDatabase()).reset(tenant.id);
  await ensureCommercialV2DemoData();
  await prepareOperationalDemo();
  return result;
}
