import type { EntityMetadata } from "@/domains/shared/entity";

export type Tenant = EntityMetadata & { name: string };
export type BrandSettings = EntityMetadata & { clientName: string; logoUrl?: string; primaryColor: string; highlightColor: string; phone: string; email: string; address?: string };
export const PIPELINE_STAGES = ["new", "form", "calculation", "in_progress", "ready", "presented", "waiting", "closed", "lost"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type Lead = EntityMetadata & { name: string; email?: string; phone?: string; origin?: string; referredBy?: string; profession?: string; city?: string; notes?: string; nextAction?: string; nextActionAt?: string; tags?: string[]; stage: PipelineStage; archivedAt?: string | null; potentialValue?: number; priority?: "low" | "normal" | "high" };
export type Client = EntityMetadata & { name: string; sourceLeadId?: string; cpf?: string; birthDate?: string; maritalStatus?: string; email?: string; phone?: string; profession?: string; company?: string; address?: string; status: "active" | "inactive"; notes?: string; pipelineStage?: PipelineStage; nextAction?: string; nextActionAt?: string; potentialValue?: number };
export type Task = EntityMetadata & { title: string; dueDate?: string; status: "open" | "done"; relatedId?: string };
export type Diagnostic = EntityMetadata & { clientId: string; planningCycle: string; status: "draft" | "complete"; declaredData: Record<string, unknown> };
export type Plan = EntityMetadata & { clientId: string; name: string; status: "draft" | "active" };
export type ProposalVersion = EntityMetadata & { clientId: string; planId?: string; number: number; status: "draft" | "presented" };
export type Coverage = EntityMetadata & { proposalVersionId: string; name: string; insuredCapital?: number; monthlyPremium?: number };
export type PipelineHistory = EntityMetadata & { leadId?: string; clientId?: string; fromStage?: PipelineStage; toStage: PipelineStage; changedAt: string; reason?: string; eventType?: "created" | "moved" | "converted" | "diagnostic_completed" };
export type AiAnalysis = EntityMetadata & { clientId: string; status: "pending" | "complete"; content?: string };
export type ReportSnapshot = EntityMetadata & { clientId: string; type: string; payload: Record<string, unknown> };

