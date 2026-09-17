import type { Tenant, BrandSettings, Lead, Client, Task, Diagnostic, PipelineHistory } from "@/domains/core/entities";
import type { Repository } from "./repository";
export type TenantRepository = Repository<Tenant>;
export type SettingsRepository = Repository<BrandSettings>;
export type LeadRepository = Repository<Lead>;
export type ClientRepository = Repository<Client>;
export type TaskRepository = Repository<Task>;
export type DiagnosticRepository = Repository<Diagnostic>;
export type PipelineHistoryRepository = Repository<PipelineHistory>;

