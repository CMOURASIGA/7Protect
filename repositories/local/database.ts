"use client";
import Dexie, { type Table } from "dexie";
import type { Tenant, BrandSettings, Lead, Client, Task, Diagnostic, Plan, ProposalVersion, Coverage, PipelineHistory, AiAnalysis, ReportSnapshot } from "@/domains/core/entities";

export class ProtectDatabase extends Dexie {
  tenants!: Table<Tenant, string>; settings!: Table<BrandSettings, string>; leads!: Table<Lead, string>; clients!: Table<Client, string>; householdMembers!: Table<Record<string, unknown>, string>; diagnostics!: Table<Diagnostic, string>; tasks!: Table<Task, string>; pipelineHistory!: Table<PipelineHistory, string>; plans!: Table<Plan, string>; proposalVersions!: Table<ProposalVersion, string>; coverages!: Table<Coverage, string>; aiAnalyses!: Table<AiAnalysis, string>; reportSnapshots!: Table<ReportSnapshot, string>;
  constructor() { super("7protect"); this.version(1).stores({ tenants: "id, tenantId, name", settings: "id, tenantId", leads: "id, tenantId, stage", clients: "id, tenantId, status", householdMembers: "id, tenantId", diagnostics: "id, tenantId, clientId", tasks: "id, tenantId, status", pipelineHistory: "id, tenantId, leadId, clientId", plans: "id, tenantId, clientId", proposalVersions: "id, tenantId, clientId, planId", coverages: "id, tenantId, proposalVersionId", aiAnalyses: "id, tenantId, clientId", reportSnapshots: "id, tenantId, clientId" }); }
}
export const db = new ProtectDatabase();
export const DOMAIN_STORES = ["tenants", "settings", "leads", "clients", "householdMembers", "diagnostics", "tasks", "pipelineHistory", "plans", "proposalVersions", "coverages", "aiAnalyses", "reportSnapshots"] as const;
