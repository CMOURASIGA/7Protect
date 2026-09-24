"use client";
import { timestamps } from "@/domains/shared/entity";
import type { BrandSettings, Tenant } from "@/domains/core/entities";
import { getRepositoryProvider } from "@/repositories/providers";
import { getDatabase, DOMAIN_STORES, replaceDatabaseContents } from "@/repositories/local/database";

export type SetupInput = { clientName: string; logoUrl?: string; primaryColor: string; highlightColor: string; phone: string; email: string; address?: string };
export type BackupPayload = { schemaVersion: 1; exportedAt: string; data: Record<string, unknown[]> };
const ROOT_TENANT_ID = "root";
const provider = () => getRepositoryProvider();
export async function getFoundation() { const p = provider(); const tenants = await p.tenants.list(ROOT_TENANT_ID); const tenant = tenants[0] ?? null; const settings = tenant ? (await p.settings.list(tenant.id))[0] ?? null : null; return { tenant, settings }; }
export async function setupFoundation(input: SetupInput) { const p = provider(); const current = await getFoundation(); const tenant: Tenant = current.tenant ? { ...current.tenant, name: input.clientName } : { ...timestamps(), tenantId: ROOT_TENANT_ID, name: input.clientName }; const savedTenant = current.tenant ? await p.tenants.update(tenant) : await p.tenants.create(tenant); const settings: BrandSettings = current.settings ? { ...current.settings, ...input } : { ...timestamps(), tenantId: savedTenant.id, ...input }; return current.settings ? p.settings.update(settings) : p.settings.create(settings); }
export async function seedDemoData() { const current = await getFoundation(); if (!current.tenant || !current.settings) return current; const p = provider(); if ((await p.leads.list(current.tenant.id)).length > 0) return current; const tenantId = current.tenant.id; const lead = { ...timestamps(), tenantId, name: "Marina Azevedo", email: "marina@email.com", phone: "(21) 98888-0000", stage: "calculation" as const, nextAction: "Revisar proteção familiar" }; await p.leads.create(lead); const client = { ...timestamps(), tenantId, name: "Rafael Mendes", email: "rafael@email.com", phone: "(21) 97777-0000", status: "active" as const }; await p.clients.create(client); await p.tasks.create({ ...timestamps(), tenantId, title: "Preparar reunião de apresentação", dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), status: "open", relatedId: client.id }); return { tenant: (await getFoundation()).tenant, settings: current.settings }; }
export async function exportBackup(): Promise<BackupPayload> { const data: Record<string, unknown[]> = {}; const db = getDatabase(); for (const store of DOMAIN_STORES) data[store] = await db.table(store).toArray(); return { schemaVersion: 1, exportedAt: new Date().toISOString(), data }; }
export function validateBackup(value: unknown): value is BackupPayload { return Boolean(value && typeof value === "object" && (value as BackupPayload).schemaVersion === 1 && typeof (value as BackupPayload).data === "object"); }
export async function restoreBackup(backup: BackupPayload) { if (!validateBackup(backup)) throw new Error("Arquivo de backup inválido."); await replaceDatabaseContents(backup.data); }
