"use client";
import type { Contact, Hot40Membership, ProspectQualification, CommercialActivity, CommercialParameter, Hot40Stage, Hot40StageEvent, CommercialBenchmark, ActivityCycleEvent, Notification } from "@/domains/core/entities";
import { COMMERCIAL_PARAMETER_GROUPS, COMMERCIAL_ACTIVITY_TYPES } from "@/domains/core/entities";
import { validateQualification, isValidQualification } from "@/domains/commercial/qualification";
import matrixDefaults from "@/domains/commercial/matrix-defaults.json";
import { timestamps } from "@/domains/shared/entity";
import { assertHot40Qualified, assertActivityDate } from "@/domains/commercial/rules";
import type { ProtectDatabase } from "./database";
import { IndexedDbRepository } from "./indexeddb-repository";

const live = (item: Hot40Membership) => !item.deletedAt && (item.status === "active" || item.status === "paused");
const revised = <T extends { version: number }>(item: T) => ({ ...item, updatedAt: new Date().toISOString(), version: item.version + 1 });

export class ContactRepository extends IndexedDbRepository<Contact> {
  constructor(private db: ProtectDatabase) { super(db.contacts); }
  private async validate(input: Contact) {
    if (!input.fullName.trim()) throw new Error("Informe o nome do contato.");
    const contacts = await this.db.contacts.where("tenantId").equals(input.tenantId).toArray();
    const email = input.email?.trim().toLowerCase(); const phone = input.phone?.replace(/\D/g, "");
    if (contacts.some((item) => item.id !== input.id && !item.deletedAt && ((email && item.email?.trim().toLowerCase() === email) || (phone && item.phone?.replace(/\D/g, "") === phone)))) throw new Error("Já existe um contato com este e-mail ou telefone. Edite o cadastro existente.");
    if (input.commercialStage !== "hot40" || input.deletedAt) return;
    assertHot40Qualified(input, await this.db.prospectQualifications.where("contactId").equals(input.id).toArray(), input.tenantId);
    if (!(await this.db.hot40Memberships.where("contactId").equals(input.id).toArray()).some((item) => item.tenantId === input.tenantId && live(item))) throw new Error("Inclua o contato qualificado no HOT40 antes de alterar a etapa.");
  }
  override create(input: Contact) { return this.db.transaction("rw", [this.db.contacts, this.db.prospectQualifications, this.db.hot40Memberships], async () => { await this.validate(input); return super.create(input); }); }
  override update(input: Contact) { return this.db.transaction("rw", [this.db.contacts, this.db.prospectQualifications, this.db.hot40Memberships], async () => { await this.validate(input); return super.update(input); }); }
}

export class Hot40Repository extends IndexedDbRepository<Hot40Membership> {
  constructor(private db: ProtectDatabase) { super(db.hot40Memberships); }
  // Non-destructive repair of inconsistent links created before the qualification guard.
  reconcileQualification(tenantId: string) {
    return this.db.transaction("rw", [this.db.contacts, this.db.prospectQualifications, this.db.hot40Memberships, this.db.hot40StageEvents], async () => {
      const contacts = await this.db.contacts.where("tenantId").equals(tenantId).toArray();
      const qualifications = await this.db.prospectQualifications.where("tenantId").equals(tenantId).toArray();
      const memberships = await this.db.hot40Memberships.where("tenantId").equals(tenantId).toArray();
      for (const contact of contacts.filter((item) => !item.deletedAt)) {
        if (qualifications.some((item) => item.contactId === contact.id && isValidQualification(item))) continue;
        for (const membership of memberships.filter((item) => item.contactId === contact.id && !item.deletedAt && item.status !== "removed")) {
          await this.db.hot40Memberships.put(revised({ ...membership, status: "removed" as const }));
        }
        if (contact.commercialStage === "hot40") await this.db.contacts.put(revised({ ...contact, commercialStage: "market_base" as const }));
      }
    });
  }
  private write(input: Hot40Membership, update: boolean) {
    return this.db.transaction("rw", [this.db.contacts, this.db.prospectQualifications, this.db.hot40Memberships, this.db.hot40StageEvents], async () => {
      const contact = await this.db.contacts.get(input.contactId);
      if (!contact || contact.deletedAt || contact.tenantId !== input.tenantId) throw new Error("Contato não encontrado no contexto atual.");
      if (!input.deletedAt && input.status !== "removed") {
        assertHot40Qualified(contact, await this.db.prospectQualifications.where("contactId").equals(input.contactId).toArray(), input.tenantId);
        if (contact.commercialStage === "client") throw new Error("Este contato já é cliente.");
        const memberships = await this.db.hot40Memberships.where("contactId").equals(input.contactId).toArray();
        if (memberships.some((item) => item.id !== input.id && item.tenantId === input.tenantId && live(item))) throw new Error("O contato já participa do HOT40.");
      }
      const result = update ? await super.update(input) : await super.create(input);
      if (!update && live(input)) await this.db.hot40StageEvents.add({ ...timestamps(), tenantId: input.tenantId, contactId: input.contactId, membershipId: input.id, toStage: input.stage || "ab_phone", occurredAt: input.enteredAt, notes: "Entrada no HOT40" });
      if (live(input)) await this.db.contacts.put(revised({ ...contact, commercialStage: "hot40" as const }));
      return result;
    });
  }
  override create(input: Hot40Membership) { return this.write(input, false); }
  override update(input: Hot40Membership) { return this.write(input, true); }
}

export class QualificationRepository extends IndexedDbRepository<ProspectQualification> {
  constructor(private db: ProtectDatabase) { super(db.prospectQualifications); }
  private write(input: ProspectQualification, update: boolean) {
    return this.db.transaction("rw", [this.db.contacts, this.db.prospectQualifications, this.db.hot40Memberships, this.db.commercialParameters], async () => {
      const contact = await this.db.contacts.get(input.contactId);
      if (!contact || contact.deletedAt || contact.tenantId !== input.tenantId) throw new Error("Contato não encontrado no contexto atual.");
      if (!["pending", "qualified", "not_qualified"].includes(input.status)) throw new Error("Qualificação inválida.");
      const existing = await this.db.prospectQualifications.where("contactId").equals(input.contactId).toArray();
      if (existing.some((item) => item.id !== input.id && item.tenantId === input.tenantId && !item.deletedAt)) throw new Error("Atualize a qualificação existente deste contato.");
      validateQualification(input, await this.db.commercialParameters.where("tenantId").equals(input.tenantId).toArray(), existing.find((item) => item.id === input.id));
      if (input.status !== "qualified" || input.deletedAt) {
        for (const membership of await this.db.hot40Memberships.where("contactId").equals(input.contactId).toArray()) {
          if (membership.tenantId === input.tenantId && !membership.deletedAt && membership.status !== "removed") await this.db.hot40Memberships.put(revised({ ...membership, status: "removed" as const }));
        }
        if (contact.commercialStage === "hot40") await this.db.contacts.put(revised({ ...contact, commercialStage: "market_base" as const }));
      }
      return update ? super.update(input) : super.create(input);
    });
  }
  override create(input: ProspectQualification) { return this.write(input, false); }
  override update(input: ProspectQualification) { return this.write(input, true); }
  override async delete(id: string) { const input = await this.findById(id); if (input) await this.update({ ...input, deletedAt: new Date().toISOString() }); }
}

export class ActivityRepository extends IndexedDbRepository<CommercialActivity> {
  constructor(private db: ProtectDatabase) { super(db.commercialActivities); }
  private write(input: CommercialActivity, update: boolean) {
    return this.db.transaction("rw", [this.db.contacts, this.db.commercialActivities], async () => {
      const contact = await this.db.contacts.get(input.contactId);
      if (!contact || contact.deletedAt || contact.tenantId !== input.tenantId) throw new Error("Contato não encontrado no contexto atual.");
      assertActivityDate(input);
      if (!update && input.status === "cancelled") throw new Error("Cancele uma atividade planejada existente.");
      if (update) {
        const current = await this.db.commercialActivities.get(input.id);
        if (!current || current.tenantId !== input.tenantId) throw new Error("Atividade não encontrada.");
        if (current.status !== input.status || current.scheduledAt !== input.scheduledAt || current.completedAt !== input.completedAt) throw new Error("Use um comando de ciclo para concluir, cancelar ou reagendar.");
      }
      return update ? super.update(input) : super.create(input);
    });
  }
  override create(input: CommercialActivity) { return this.write(input, false); }
  override update(input: CommercialActivity) { return this.write(input, true); }
  transition(input: { tenantId: string; activityId: string; expectedVersion: number; commandKey: string; action: ActivityCycleEvent["action"]; at?: string; reason?: string }) {
    return this.db.transaction("rw", [this.db.commercialActivities, this.db.activityCycleEvents], async () => {
      if (!input.commandKey.trim()) throw new Error("Identificador do comando obrigatório.");
      const prior = await this.db.activityCycleEvents.where("[tenantId+commandKey]").equals([input.tenantId, input.commandKey]).first();
      if (prior) {
        if (prior.activityId !== input.activityId || prior.action !== input.action) throw new Error("Chave de comando já utilizada em outra ação.");
        const latest = (await this.db.commercialActivities.get(input.activityId))!;
        return { activity: { ...latest, status: prior.action === "complete" ? "completed" as const : prior.action === "cancel" ? "cancelled" as const : "planned" as const, scheduledAt: prior.scheduledAt, completedAt: prior.completedAt, version: prior.resultVersion }, event: prior };
      }
      const current = await this.db.commercialActivities.get(input.activityId);
      if (!current || current.deletedAt || current.tenantId !== input.tenantId) throw new Error("Atividade não encontrada.");
      if (current.version !== input.expectedVersion) throw new Error("Atividade alterada em outra sessão. Atualize os dados.");
      if (current.status !== "planned" || !current.scheduledAt) throw new Error("Somente atividade planejada pode ser alterada.");
      const at = input.at ? new Date(input.at).toISOString() : undefined;
      if (input.action === "complete" && !at) throw new Error("Informe a data realizada.");
      if (input.action === "reschedule" && (!at || at === current.scheduledAt || !input.reason?.trim())) throw new Error("Informe nova data e motivo do reagendamento.");
      if (input.action === "cancel" && !input.reason?.trim()) throw new Error("Informe o motivo do cancelamento.");
      const occurredAt = new Date().toISOString();
      const next: CommercialActivity = { ...current, status: input.action === "complete" ? "completed" : input.action === "cancel" ? "cancelled" : "planned", scheduledAt: input.action === "reschedule" ? at : current.scheduledAt, completedAt: input.action === "complete" ? at : undefined, updatedAt: occurredAt, version: current.version + 1 };
      assertActivityDate(next);
      const event: ActivityCycleEvent = { ...timestamps(), tenantId: input.tenantId, activityId: current.id, contactId: current.contactId, commandKey: input.commandKey, action: input.action, occurredAt, previousScheduledAt: current.scheduledAt, scheduledAt: next.scheduledAt!, completedAt: next.completedAt, resultVersion: next.version, reason: input.reason?.trim() };
      await this.db.commercialActivities.put(next);
      await this.db.activityCycleEvents.add(event);
      return { activity: next, event };
    });
  }
}

export class AttentionNotificationRepository extends IndexedDbRepository<Notification> {
  constructor(private db: ProtectDatabase) { super(db.notifications); }
  async reconcile(tenantId: string, desired: Notification[]) {
    return this.db.transaction("rw", this.db.notifications, async () => {
      const existing = await this.db.notifications.where("tenantId").equals(tenantId).toArray();
      const active = new Map(desired.map((item) => [item.causeKey!, item]));
      for (const item of existing.filter((row) => row.causeKey && !row.deletedAt)) {
        const candidate = active.get(item.causeKey!);
        if (!candidate) {
          if (item.status !== "resolved") await this.db.notifications.put({ ...item, status: "resolved", resolvedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: item.version + 1 });
        } else {
          active.delete(item.causeKey!);
          if (item.status === "resolved" || item.title !== candidate.title || item.message !== candidate.message || item.severity !== candidate.severity) await this.db.notifications.put({ ...item, title: candidate.title, message: candidate.message, severity: candidate.severity, status: item.status === "resolved" ? "unread" : item.status, readAt: item.status === "resolved" ? undefined : item.readAt, resolvedAt: undefined, updatedAt: new Date().toISOString(), version: item.version + 1 });
        }
      }
      for (const candidate of active.values()) await this.db.notifications.add(candidate);
      return this.list(tenantId);
    });
  }
  async markRead(tenantId: string, id: string) {
    return this.db.transaction("rw", this.db.notifications, async () => {
      const row = await this.db.notifications.get(id);
      if (!row || row.tenantId !== tenantId || row.deletedAt) throw new Error("Notificação não encontrada.");
      if (row.status !== "unread") return row;
      const next: Notification = { ...row, status: "read", readAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: row.version + 1 };
      await this.db.notifications.put(next); return next;
    });
  }
}


export class ParameterRepository extends IndexedDbRepository<CommercialParameter> {
  constructor(private db: ProtectDatabase) { super(db.commercialParameters); }
  initializeMatrix(tenantId: string) {
    return this.db.transaction("rw", this.db.commercialParameters, async () => {
      if (await this.db.commercialParameters.where("tenantId").equals(tenantId).count()) return;
      for (const option of matrixDefaults.options) {
        await this.db.commercialParameters.add({ ...timestamps(), tenantId, group: option.group as CommercialParameter["group"], label: option.label, order: option.order, active: true });
      }
    });
  }
  private write(input: CommercialParameter, update: boolean) {
    return this.db.transaction("rw", this.db.commercialParameters, async () => {
      if (!COMMERCIAL_PARAMETER_GROUPS.includes(input.group) || !input.label.trim() || !Number.isFinite(input.order) || input.order < 0) throw new Error("Informe grupo, nome e ordem válidos para o parâmetro.");
      const existing = await this.findById(input.id);
      if (update && (!existing || existing.tenantId !== input.tenantId || existing.group !== input.group)) throw new Error("Parâmetro não encontrado no grupo atual.");
      const rows = await this.list(input.tenantId);
      if (rows.some((item) => item.id !== input.id && item.group === input.group && item.label.trim().toLocaleLowerCase() === input.label.trim().toLocaleLowerCase())) throw new Error("Já existe um parâmetro com este nome neste grupo.");
      const normalized = { ...input, label: input.label.trim() };
      return update ? super.update(normalized) : super.create(normalized);
    });
  }
  override create(input: CommercialParameter) { return this.write(input, false); }
  override update(input: CommercialParameter) { return this.write(input, true); }
  override async delete(id: string) { const input = await this.findById(id); if (input) await this.update({ ...input, active: false }); }
}

export class Hot40StageRepository extends IndexedDbRepository<Hot40StageEvent> {
  constructor(private db: ProtectDatabase) { super(db.hot40StageEvents); }
  async move(contactId: string, tenantId: string, toStage: Hot40Stage, notes?: string) {
    return this.db.transaction("rw", [this.db.contacts, this.db.hot40Memberships, this.db.hot40StageEvents], async () => {
      const contact = await this.db.contacts.get(contactId);
      const memberships = await this.db.hot40Memberships.where("contactId").equals(contactId).toArray();
      const member = memberships.find((row) => row.tenantId === tenantId && row.status === "active" && !row.deletedAt);
      if (!contact || contact.tenantId !== tenantId || contact.deletedAt || contact.commercialStage !== "hot40" || !member) throw new Error("Contato não está ativo no HOT40.");
      const fromStage = member.stage || "ab_phone";
      if (fromStage === toStage) return null;
      const occurredAt = new Date().toISOString();
      const event: Hot40StageEvent = { ...timestamps(), tenantId, contactId, membershipId: member.id, fromStage, toStage, occurredAt, notes: notes?.trim() || undefined };
      await this.db.hot40Memberships.put(revised({ ...member, stage: toStage, stageChangedAt: occurredAt }));
      await this.db.hot40StageEvents.add(event);
      return event;
    });
  }
}

export class BenchmarkRepository extends IndexedDbRepository<CommercialBenchmark> {
  constructor(private db: ProtectDatabase) { super(db.commercialBenchmarks); }
  private write(input: CommercialBenchmark, update: boolean) {
    return this.db.transaction("rw", this.db.commercialBenchmarks, async () => {
      if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100 || !Number.isInteger(input.month) || input.month < 1 || input.month > 12 ||
        !COMMERCIAL_ACTIVITY_TYPES.includes(input.activityType) || !Array.isArray(input.weeklyTargets) || input.weeklyTargets.length !== 5 ||
        !input.weeklyTargets.every((value) => Number.isSafeInteger(value) && value >= 0) ||
        !Number.isSafeInteger(input.weeklyTargets.reduce((sum, value) => sum + value, 0))) throw new Error("Informe cinco benchmarks semanais inteiros não negativos.");
      const existing = await this.db.commercialBenchmarks.where("[tenantId+year+month+activityType]").equals([input.tenantId, input.year, input.month, input.activityType]).toArray();
      if (existing.some((item) => item.id !== input.id && !item.deletedAt)) throw new Error("Já existe benchmark para esta atividade e período.");
      if (update) { const current = await this.findById(input.id); if (!current || current.tenantId !== input.tenantId) throw new Error("Benchmark não encontrado."); }
      return update ? super.update(input) : super.create(input);
    });
  }
  override create(input: CommercialBenchmark) { return this.write(input, false); }
  override update(input: CommercialBenchmark) { return this.write(input, true); }
}
