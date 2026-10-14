"use client";
import type { ProtectDatabase } from "./database";
import { DEMO_SCENARIO_KEY, type DemoOwned } from "@/application/commercial-demo-provenance";

type ResetResult = { removed: number; preserved: Array<{ id: string; reason: string }> };
const owned = (row: DemoOwned) => row.demoScenarioKey === DEMO_SCENARIO_KEY;
const pristine = (row: DemoOwned) => owned(row) && row.version === row.demoScenarioVersion;

export class CommercialDemoRepository {
  constructor(private db: ProtectDatabase) {}

  reset(tenantId: string): Promise<ResetResult> {
    const db = this.db;
    return db.transaction("rw", [db.contacts, db.prospectQualifications, db.hot40Memberships, db.hot40StageEvents, db.commercialActivities, db.activityCycleEvents, db.commercialGoals, db.commercialBenchmarks, db.commercialOpportunities, db.referrals, db.notifications, db.importOperations], async () => {
      const [contacts, qualifications, memberships, stages, activities, cycles, goals, benchmarks, opportunities, referrals, notifications, imports] = await Promise.all([
        db.contacts.where("tenantId").equals(tenantId).toArray(), db.prospectQualifications.where("tenantId").equals(tenantId).toArray(),
        db.hot40Memberships.where("tenantId").equals(tenantId).toArray(), db.hot40StageEvents.where("tenantId").equals(tenantId).toArray(),
        db.commercialActivities.where("tenantId").equals(tenantId).toArray(), db.activityCycleEvents.where("tenantId").equals(tenantId).toArray(),
        db.commercialGoals.where("tenantId").equals(tenantId).toArray(), db.commercialBenchmarks.where("tenantId").equals(tenantId).toArray(),
        db.commercialOpportunities.where("tenantId").equals(tenantId).toArray(), db.referrals.where("tenantId").equals(tenantId).toArray(),
        db.notifications.where("tenantId").equals(tenantId).toArray(), db.importOperations.where("tenantId").equals(tenantId).toArray(),
      ]);
      const result: ResetResult = { removed: 0, preserved: [] };
      const removal = new Set<string>();
      for (const contact of contacts.filter(owned)) {
        const q = qualifications.filter((row) => row.contactId === contact.id);
        const m = memberships.filter((row) => row.contactId === contact.id);
        const a = activities.filter((row) => row.contactId === contact.id);
        const s = stages.filter((row) => row.contactId === contact.id);
        const cycle = cycles.filter((row) => row.contactId === contact.id);
        const externalNotification = notifications.some((row) => row.contactId === contact.id && !((row.sourceType === "activity" && a.some((activity) => activity.id === row.sourceId && pristine(activity))) || (row.sourceType === "membership" && m.some((member) => member.id === row.sourceId && pristine(member)))));
        const linked = opportunities.some((row) => row.contactId === contact.id) || referrals.some((row) => row.contactId === contact.id || row.referredContactId === contact.id) || imports.some((row) => row.contactId === contact.id) || externalNotification;
        const unowned = [...q, ...m, ...a, ...s].some((row) => !pristine(row));
        const unexpectedCycle = cycle.some((row) => !a.some((activity) => activity.id === row.activityId && pristine(activity)));
        if (!pristine(contact) || linked || unowned || unexpectedCycle) {
          result.preserved.push({ id: contact.id, reason: "Edição ou vínculo externo posterior; Contact e dependências preservados." });
        } else removal.add(contact.id);
      }
      const memberIds = new Set(memberships.filter((row) => removal.has(row.contactId)).map((row) => row.id));
      const activityIds = new Set(activities.filter((row) => removal.has(row.contactId)).map((row) => row.id));
      for (const row of notifications) {
        if (row.contactId && removal.has(row.contactId) && ((row.sourceType === "activity" && activityIds.has(row.sourceId || "")) || (row.sourceType === "membership" && memberIds.has(row.sourceId || "")))) { await db.notifications.delete(row.id); result.removed++; }
      }
      for (const row of cycles.filter((item) => activityIds.has(item.activityId))) { await db.activityCycleEvents.delete(row.id); result.removed++; }
      for (const row of stages.filter((item) => removal.has(item.contactId))) { await db.hot40StageEvents.delete(row.id); result.removed++; }
      for (const row of activities.filter((item) => removal.has(item.contactId))) { await db.commercialActivities.delete(row.id); result.removed++; }
      for (const row of memberships.filter((item) => removal.has(item.contactId))) { await db.hot40Memberships.delete(row.id); result.removed++; }
      for (const row of qualifications.filter((item) => removal.has(item.contactId))) { await db.prospectQualifications.delete(row.id); result.removed++; }
      for (const id of removal) { await db.contacts.delete(id); result.removed++; }
      for (const row of goals.filter(owned)) { if (pristine(row)) { await db.commercialGoals.delete(row.id); result.removed++; } else result.preserved.push({ id: row.id, reason: "Meta demonstrativa alterada posteriormente." }); }
      for (const row of benchmarks.filter(owned)) {
        if (pristine(row) && !imports.some((op) => op.benchmarkId === row.id)) { await db.commercialBenchmarks.delete(row.id); result.removed++; }
        else result.preserved.push({ id: row.id, reason: "Benchmark alterado ou vinculado à importação." });
      }
      return result;
    });
  }
}
