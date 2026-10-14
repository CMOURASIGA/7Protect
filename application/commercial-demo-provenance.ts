"use client";
import { getDatabase } from "@/repositories/local/database";

export const DEMO_SCENARIO_KEY = "commercial-v2-scenario-v1";
export type DemoOwned = { id: string; tenantId: string; version: number; demoScenarioKey?: string; demoScenarioVersion?: number };

// Only a returned ID from a creation performed by the scenario may be marked.
// A matching name, email or timestamp never establishes ownership.
export async function markCommercialDemoCreated(store: "contacts" | "prospectQualifications" | "hot40Memberships" | "commercialActivities" | "hot40StageEvents" | "commercialGoals" | "commercialBenchmarks", id: string, tenantId: string) {
  const table = getDatabase().table<DemoOwned, string>(store);
  const row = await table.get(id) as DemoOwned | undefined;
  if (!row || row.tenantId !== tenantId) throw new Error("Registro demonstrativo não encontrado.");
  await table.update(id, { demoScenarioKey: DEMO_SCENARIO_KEY, demoScenarioVersion: row.version });
}
