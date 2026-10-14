"use client";
import type { Contact, ProspectQualification, CommercialBenchmark, ImportBatch, ImportOperation, Hot40Membership } from "@/domains/core/entities";
import { validateQualification, isValidQualification } from "@/domains/commercial/qualification";
import { timestamps } from "@/domains/shared/entity";
import type { ProtectDatabase } from "./database";

export type ImportRowCommand = { tenantId: string; batchId: string; operationKey: string; rowFingerprint: string; row: number; name: string; phone?: string; contactId?: string; expectedContactVersion?: number; qualification?: Partial<ProspectQualification>; expectedQualificationVersion?: number; hot40: boolean; applyContact: boolean };
export type ImportBenchmarkCommand = { tenantId: string; batchId: string; operationKey: string; rowFingerprint: string; row: number; year: number; month: number; activityType: CommercialBenchmark["activityType"]; weeklyTargets: [number, number, number, number, number]; replace: boolean; expectedVersion?: number };
const revised = <T extends { version: number; updatedAt: string }>(row: T): T => ({ ...row, version: row.version + 1, updatedAt: new Date().toISOString() });
const phoneKey = (s?: string) => s?.replace(/\D/g, "") || "";

export class ImportRepository {
  constructor(private db: ProtectDatabase) {}
  batches(tenantId: string) { return this.db.importBatches.where("tenantId").equals(tenantId).toArray(); }
  operations(tenantId: string, batchId: string) { return this.db.importOperations.where("batchId").equals(batchId).filter((r) => r.tenantId === tenantId).toArray(); }
  async findBatch(tenantId: string, fingerprint: string) { return this.db.importBatches.where("[tenantId+fingerprint]").equals([tenantId, fingerprint]).first(); }
  createBatch(batch: ImportBatch) { return this.db.transaction("rw", this.db.importBatches, async () => {
    const prior = await this.findBatch(batch.tenantId, batch.fingerprint); if (prior) return prior;
    await this.db.importBatches.add(batch); return batch;
  }); }
  recordIssue(input: Omit<ImportOperation, "id" | "createdAt" | "updatedAt" | "version">) { return this.db.transaction("rw", this.db.importOperations, async () => {
    const prior = await this.db.importOperations.where("[tenantId+operationKey]").equals([input.tenantId, input.operationKey]).first(); if (prior) { if (["review", "error"].includes(prior.status)) { const next = revised({ ...prior, ...input }); await this.db.importOperations.put(next); return next; } return prior; }
    const op: ImportOperation = { ...timestamps(), ...input }; await this.db.importOperations.add(op); return op;
  }); }
  commitRow(input: ImportRowCommand) { const db = this.db; return db.transaction("rw", [db.contacts, db.prospectQualifications, db.hot40Memberships, db.hot40StageEvents, db.commercialParameters, db.importOperations], async () => {
    const prior = await db.importOperations.where("[tenantId+operationKey]").equals([input.tenantId, input.operationKey]).first(); if (prior && !["review", "error"].includes(prior.status)) return prior; if (prior) await db.importOperations.delete(prior.id);
    let contact = input.contactId ? await db.contacts.get(input.contactId) : undefined;
    if (input.contactId && (!contact || contact.deletedAt || contact.tenantId !== input.tenantId)) throw new Error("Contact não encontrado neste tenant.");
    if (contact && contact.version !== input.expectedContactVersion) throw new Error("Contact alterado após o preview.");
    const phone = phoneKey(input.phone);
    if (phone && (await db.contacts.where("tenantId").equals(input.tenantId).toArray()).some((c) => !c.deletedAt && c.id !== contact?.id && phoneKey(c.phone) === phone)) throw new Error("Telefone pertence a outro Contact.");
    const before: ImportOperation["before"] = {}; let created = false;
    if (!contact) { if (!input.name.trim()) throw new Error("Nome obrigatório."); contact = { ...timestamps(), tenantId: input.tenantId, fullName: input.name.trim(), phone: input.phone, status: "active", commercialStage: "market_base" }; await db.contacts.add(contact); created = true; }
    else if (input.applyContact) { before.contact = contact; contact = revised({ ...contact, fullName: input.name.trim(), phone: input.phone || contact.phone }); await db.contacts.put(contact); }
    let qualification: ProspectQualification | undefined;
    const existing = (await db.prospectQualifications.where("contactId").equals(contact.id).toArray()).find((q) => q.tenantId === input.tenantId && !q.deletedAt);
    if (input.qualification) {
      if (existing && existing.version !== input.expectedQualificationVersion) throw new Error("Qualificação alterada após o preview.");
      if (existing) before.qualification = existing;
      const nonempty = Object.fromEntries(Object.entries(input.qualification).filter(([, v]) => v !== undefined && v !== ""));
      qualification = { ...(existing || timestamps()), ...nonempty, tenantId: input.tenantId, contactId: contact.id, status: input.qualification.status || existing?.status || "pending" };
      validateQualification(qualification, await db.commercialParameters.where("tenantId").equals(input.tenantId).toArray(), existing);
      if (existing?.status === "qualified" && qualification.status !== "qualified" && (await db.hot40Memberships.where("contactId").equals(contact.id).toArray()).some((m) => m.tenantId === input.tenantId && !m.deletedAt && m.status === "active")) throw new Error("A importação não pode desqualificar um HOT40 existente.");
      if (existing) qualification = revised(qualification); await db.prospectQualifications.put(qualification);
    } else qualification = existing;
    let membership: Hot40Membership | undefined; let createdMembership = false;
    const pendingHot40 = input.hot40 && (!isValidQualification(qualification) || contact.commercialStage === "client");
    if (input.hot40 && !pendingHot40) {
      membership = (await db.hot40Memberships.where("contactId").equals(contact.id).toArray()).find((m) => m.tenantId === input.tenantId && !m.deletedAt && (m.status === "active" || m.status === "paused"));
      if (!membership) { const now = new Date().toISOString(); membership = { ...timestamps(), tenantId: input.tenantId, contactId: contact.id, status: "active", enteredAt: now, stage: "ab_phone", stageChangedAt: now, priority: "normal" }; await db.hot40Memberships.add(membership); await db.hot40StageEvents.add({ ...timestamps(), tenantId: input.tenantId, contactId: contact.id, membershipId: membership.id, toStage: "ab_phone", occurredAt: now, notes: "Entrada por importação" }); createdMembership = true; }
      if (contact.commercialStage !== "hot40") { if (!created && !before.contact) before.contact = contact; contact = revised({ ...contact, commercialStage: "hot40" as const }); await db.contacts.put(contact); }
    }
    if (!contact) throw new Error("Contact ausente.");
    const op: ImportOperation = { ...timestamps(), tenantId: input.tenantId, batchId: input.batchId, operationKey: input.operationKey, rowFingerprint: input.rowFingerprint, sheet: "Mercado Base", row: input.row, kind: "contact", status: created ? "created" : before.contact || before.qualification ? "updated" : "matched", contactId: contact.id, qualificationId: input.qualification ? qualification?.id : undefined, membershipId: createdMembership ? membership?.id : undefined, before, afterVersions: { contact: contact.version, qualification: input.qualification ? qualification?.version : undefined, membership: createdMembership ? membership?.version : undefined }, message: pendingHot40 ? "HOT40 pendente: qualificação incompleta ou Contact já cliente." : undefined };
    await db.importOperations.add(op); return op;
  }); }
  commitBenchmark(input: ImportBenchmarkCommand) { const db = this.db; return db.transaction("rw", [db.commercialBenchmarks, db.importOperations], async () => {
    const prior = await db.importOperations.where("[tenantId+operationKey]").equals([input.tenantId, input.operationKey]).first(); if (prior && !["review", "error"].includes(prior.status)) return prior; if (prior) await db.importOperations.delete(prior.id);
    const current = (await db.commercialBenchmarks.where("[tenantId+year+month+activityType]").equals([input.tenantId, input.year, input.month, input.activityType]).toArray()).find((b) => !b.deletedAt);
    if (current && (!input.replace || current.version !== input.expectedVersion)) throw new Error("Benchmark existente ou alterado. Revise a substituição.");
    const benchmark: CommercialBenchmark = current ? revised({ ...current, weeklyTargets: input.weeklyTargets, legacyWeeklyTarget: undefined, legacyMonthlyTarget: undefined }) : { ...timestamps(), tenantId: input.tenantId, year: input.year, month: input.month, activityType: input.activityType, weeklyTargets: input.weeklyTargets };
    await db.commercialBenchmarks.put(benchmark);
    const op: ImportOperation = { ...timestamps(), tenantId: input.tenantId, batchId: input.batchId, operationKey: input.operationKey, rowFingerprint: input.rowFingerprint, sheet: "Indicadores", row: input.row, kind: "benchmark", status: current ? "updated" : "created", benchmarkId: benchmark.id, before: current ? { benchmark: current } : undefined, afterVersions: { benchmark: benchmark.version } };
    await db.importOperations.add(op); return op;
  }); }
  finish(batchId: string, tenantId: string, totals: ImportBatch["totals"]) { return this.db.transaction("rw", this.db.importBatches, async () => {
    const batch = await this.db.importBatches.get(batchId); if (!batch || batch.tenantId !== tenantId) throw new Error("Lote não encontrado.");
    const next = revised({ ...batch, totals, status: totals.errors || totals.review ? "partial" as const : "completed" as const, completedAt: new Date().toISOString() }); await this.db.importBatches.put(next); return next;
  }); }
  async rollback(tenantId: string, batchId: string) { const db = this.db; const batch = await db.importBatches.get(batchId); if (!batch || batch.tenantId !== tenantId) throw new Error("Lote não encontrado.");
    const outcome: Array<{ row: number; status: string; message: string }> = [];
    for (const op of (await this.operations(tenantId, batchId)).reverse()) {
      if ((!op.contactId && !op.benchmarkId) || op.status === "rolled_back") continue;
      await db.transaction("rw", [db.contacts, db.prospectQualifications, db.hot40Memberships, db.hot40StageEvents, db.commercialActivities, db.commercialOpportunities, db.referrals, db.notifications, db.importOperations, db.commercialBenchmarks], async () => {
        const contact = op.contactId ? await db.contacts.get(op.contactId) : undefined; const qualification = op.qualificationId ? await db.prospectQualifications.get(op.qualificationId) : undefined; const member = op.membershipId ? await db.hot40Memberships.get(op.membershipId) : undefined; const benchmark = op.benchmarkId ? await db.commercialBenchmarks.get(op.benchmarkId) : undefined;
        const later = contact && ((await db.commercialActivities.where("contactId").equals(contact.id).count()) || (await db.commercialOpportunities.where("contactId").equals(contact.id).count()) || (await db.referrals.where("contactId").equals(contact.id).count()) || (await db.notifications.where("contactId").equals(contact.id).filter((n) => !n.deletedAt).count()) || (await db.importOperations.where("tenantId").equals(tenantId).filter((other) => other.batchId !== batchId && other.contactId === contact.id && !["rolled_back", "error", "review", "skipped"].includes(other.status)).count()));
        if (later || (contact && contact.version !== op.afterVersions?.contact) || (qualification && qualification.version !== op.afterVersions?.qualification) || (member && member.version !== op.afterVersions?.membership) || (benchmark && benchmark.version !== op.afterVersions?.benchmark) || (member && (await db.hot40StageEvents.where("membershipId").equals(member.id).count()) > 1)) { outcome.push({ row: op.row, status: "conflict", message: "Edição ou vínculo posterior; dados preservados." }); return; }
        if (benchmark) { if (op.before?.benchmark) await db.commercialBenchmarks.put(op.before.benchmark); else await db.commercialBenchmarks.delete(benchmark.id); }
        if (member) { await db.hot40StageEvents.where("membershipId").equals(member.id).delete(); await db.hot40Memberships.delete(member.id); }
        if (qualification) { if (op.before?.qualification) await db.prospectQualifications.put(op.before.qualification); else await db.prospectQualifications.delete(qualification.id); }
        if (contact) { if (op.status === "created") await db.contacts.delete(contact.id); else if (op.before?.contact) await db.contacts.put(op.before.contact); }
        await db.importOperations.put(revised({ ...op, status: "rolled_back" as const })); outcome.push({ row: op.row, status: "rolled_back", message: "Revertido." });
      });
    }
    await db.importBatches.put(revised({ ...batch, status: "rolled_back_partially" as const })); return outcome;
  }
}
