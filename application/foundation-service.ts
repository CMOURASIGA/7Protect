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
export async function exportBackup(): Promise<BackupPayload> { const data: Record<string, unknown[]> = {}; const db = getDatabase(); for (const store of DOMAIN_STORES) data[store] = await db.table(store).toArray(); return { schemaVersion: 1, exportedAt: new Date().toISOString(), data }; }
export function validateBackup(value: unknown): value is BackupPayload { return Boolean(value && typeof value === "object" && (value as BackupPayload).schemaVersion === 1 && typeof (value as BackupPayload).data === "object"); }
export async function restoreBackup(backup: BackupPayload) { if (!validateBackup(backup)) throw new Error("Arquivo de backup inválido."); await replaceDatabaseContents(backup.data); }
