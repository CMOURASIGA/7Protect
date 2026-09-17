import type { EntityMetadata } from "@/domains/shared/entity";

export type Tenant = EntityMetadata & { name: string };
export type BrandSettings = EntityMetadata & { clientName: string; logoUrl?: string; primaryColor: string; highlightColor: string; phone: string; email: string; address?: string };
export type Lead = EntityMetadata & { name: string; email?: string; phone?: string; stage: "new" | "form" | "calculation" | "waiting" | "closed"; nextAction?: string };
export type Client = EntityMetadata & { name: string; email?: string; phone?: string; status: "active" | "prospect" };
export type Task = EntityMetadata & { title: string; dueDate?: string; status: "open" | "done"; relatedId?: string };
export type Diagnostic = EntityMetadata & { clientId: string; planningCycle: string; status: "draft" | "complete"; declaredData: Record<string, unknown> };
export type Plan = EntityMetadata & { clientId: string; name: string; status: "draft" | "active" };
export type ProposalVersion = EntityMetadata & { clientId: string; planId?: string; number: number; status: "draft" | "presented" };
export type Coverage = EntityMetadata & { proposalVersionId: string; name: string; insuredCapital?: number; monthlyPremium?: number };
export type PipelineHistory = EntityMetadata & { leadId?: string; clientId?: string; fromStage?: string; toStage: string };
export type AiAnalysis = EntityMetadata & { clientId: string; status: "pending" | "complete"; content?: string };
export type ReportSnapshot = EntityMetadata & { clientId: string; type: string; payload: Record<string, unknown> };
