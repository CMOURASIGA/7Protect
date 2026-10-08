"use client";
import { getFoundation } from "./foundation-service";
import { getRepositoryProvider } from "@/repositories/providers";
import { timestamps } from "@/domains/shared/entity";
import type { CommercialActivityType, CommercialBenchmark } from "@/domains/core/entities";

async function tenantId() { const { tenant } = await getFoundation(); if (!tenant) throw new Error("Configure a corretora antes de editar benchmarks."); return tenant.id; }
export async function listCommercialBenchmarks() { return getRepositoryProvider().commercialBenchmarks.list(await tenantId()); }
export async function saveCommercialBenchmark(input: { year: number; month: number; activityType: CommercialActivityType; weeklyTarget: number; monthlyTarget: number }) {
  const tenant = await tenantId(); const repository = getRepositoryProvider().commercialBenchmarks;
  const current = (await repository.list(tenant)).find((item) => item.year === input.year && item.month === input.month && item.activityType === input.activityType);
  const row: CommercialBenchmark = { ...(current ?? timestamps()), tenantId: tenant, ...input };
  return current ? repository.update(row) : repository.create(row);
}
