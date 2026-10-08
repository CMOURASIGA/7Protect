"use client";
import type { CommercialParameter, CommercialParameterGroup } from "@/domains/core/entities";
import { getFoundation } from "./foundation-service";
import { getRepositoryProvider } from "@/repositories/providers";
import { timestamps } from "@/domains/shared/entity";
async function tenantId() { const { tenant } = await getFoundation(); if (!tenant) throw new Error("Configure a corretora antes de editar os parâmetros."); return tenant.id; }
export async function listCommercialParameters() {
  const tenant = await tenantId(); const repository = getRepositoryProvider().commercialParameters;
  await repository.initializeMatrix(tenant);
  return (await repository.list(tenant)).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "pt-BR"));
}
export async function saveCommercialParameter(input: { id?: string; group: CommercialParameterGroup; label: string; order: number; active: boolean }) {
  const tenant = await tenantId(); const repository = getRepositoryProvider().commercialParameters;
  const current = input.id ? await repository.findById(input.id) : null;
  if (input.id && (!current || current.tenantId !== tenant || current.deletedAt)) throw new Error("Parâmetro não encontrado.");
  const item: CommercialParameter = { ...(current ?? timestamps()), tenantId: tenant, group: input.group, label: input.label, order: input.order, active: input.active };
  return current ? repository.update(item) : repository.create(item);
}
