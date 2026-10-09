import "fake-indexeddb/auto";
import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Dexie from "dexie";
import { timestamps } from "@/domains/shared/entity";
import { selectDatabase, getDatabase } from "@/repositories/local/database";
import { getRepositoryProvider } from "@/repositories/providers";
import { commercialWeekInterval, expectedWeeklyProduction, operationalAttention, DEFAULT_ATTENTION_POLICY } from "@/application/commercial-attention";
import { commercialLocalDateTimeToIso } from "@/application/commercial-aggregations";
import type { CommercialActivity, Contact, Hot40Membership, Notification } from "@/domains/core/entities";

const tenantId = "tenant";
const contact = (): Contact => ({ ...timestamps(), tenantId, fullName: "Ana", status: "active", commercialStage: "hot40" });
const member = (contactId: string, enteredAt = "2026-10-01T12:00:00Z"): Hot40Membership => ({ ...timestamps(), tenantId, contactId, enteredAt, status: "active", stage: "ab_phone" });
const activity = (contactId: string, scheduledAt: string): CommercialActivity => ({ ...timestamps(), tenantId, contactId, type: "ab_phone", status: "planned", scheduledAt });
const base = (now: string, contacts: Contact[], memberships: Hot40Membership[], activities: CommercialActivity[] = []) => ({ tenantId, now, contacts, memberships, activities, benchmarks: [] });
beforeEach(() => selectDatabase(`operations-${crypto.randomUUID()}`));
afterEach(async () => getDatabase().delete());

test("same command is idempotent; stale and concurrent commands cannot produce a second event", async () => {
  const db = getDatabase(); const c = contact(); const a = activity(c.id, "2026-10-08T14:00:00Z");
  await db.contacts.add(c); await db.commercialActivities.add(a);
  const repo = getRepositoryProvider().commercialActivities;
  await assert.rejects(repo.update({ ...a, status: "completed", completedAt: "2026-10-09T14:00:00Z" }), /comando de ciclo/);
  const input = { tenantId, activityId: a.id, expectedVersion: 1, commandKey: "one-command", action: "complete" as const, at: "2026-10-09T14:00:00Z" };
  const [first, retry] = await Promise.all([repo.transition(input), repo.transition(input)]);
  assert.equal(first.activity.id, a.id);
  assert.equal(first.activity.scheduledAt, a.scheduledAt);
  assert.equal(first.activity.completedAt, new Date(input.at).toISOString());
  assert.equal(first.event.id, retry.event.id);
  assert.equal((await db.commercialActivities.get(a.id))?.version, 2);
  assert.equal(await db.activityCycleEvents.count(), 1);
  await assert.rejects(repo.transition({ ...input, commandKey: "different", action: "cancel", reason: "Outro comando" }), /outra sessão/);
  await assert.rejects(repo.transition({ ...input, action: "reschedule", reason: "Outro uso" }), /já utilizada/);
});

test("reschedule preserves previous date in one event and cancellation preserves scheduledAt", async () => {
  const db = getDatabase(); const c = contact(); const a = activity(c.id, "2026-10-07T14:00:00Z");
  await db.contacts.add(c); await db.commercialActivities.add(a);
  const repo = getRepositoryProvider().commercialActivities;
  const moved = await repo.transition({ tenantId, activityId: a.id, expectedVersion: 1, commandKey: "move", action: "reschedule", at: "2026-10-12T14:00:00Z", reason: "Cliente pediu" });
  assert.equal(moved.event.previousScheduledAt, a.scheduledAt);
  assert.equal(moved.activity.scheduledAt, "2026-10-12T14:00:00.000Z");
  const cancelled = await repo.transition({ tenantId, activityId: a.id, expectedVersion: 2, commandKey: "cancel", action: "cancel", reason: "Sem disponibilidade" });
  assert.equal(cancelled.activity.id, a.id);
  assert.equal(cancelled.activity.scheduledAt, moved.activity.scheduledAt);
  assert.equal(cancelled.activity.completedAt, undefined);
  assert.equal(await db.activityCycleEvents.count(), 2);
  const replay = await repo.transition({ tenantId, activityId: a.id, expectedVersion: 1, commandKey: "move", action: "reschedule", at: "2026-10-12T14:00:00Z", reason: "Cliente pediu" });
  assert.equal(replay.activity.status, "planned");
  assert.equal(replay.activity.version, 2);
  assert.equal((await db.commercialActivities.get(a.id))?.status, "cancelled");
});

test("two different commands racing on one version produce only one transition", async () => {
  const db = getDatabase(); const c = contact(); const a = activity(c.id, "2026-10-08T14:00:00Z");
  await db.contacts.add(c); await db.commercialActivities.add(a);
  const repo = getRepositoryProvider().commercialActivities;
  const outcomes = await Promise.allSettled([
    repo.transition({ tenantId, activityId: a.id, expectedVersion: 1, commandKey: "race-a", action: "complete", at: "2026-10-09T14:00:00Z" }),
    repo.transition({ tenantId, activityId: a.id, expectedVersion: 1, commandKey: "race-b", action: "cancel", reason: "Cancelado" }),
  ]);
  assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(await db.activityCycleEvents.count(), 1);
  assert.equal((await db.commercialActivities.get(a.id))?.version, 2);
});

test("agenda and causes resolve overdue and reveal HOT40 without next action", () => {
  const c = contact(); const m = member(c.id); const a = activity(c.id, "2026-10-07T12:00:00Z"); const now = "2026-10-09T12:00:00Z";
  const before = operationalAttention(base(now, [c], [m], [a]));
  assert.equal(before.agenda.overdue.length, 1);
  assert.equal(before.causes.filter((cause) => cause.type === "overdue").length, 1);
  const after = operationalAttention(base(now, [c], [m], [{ ...a, status: "completed", completedAt: now }]));
  assert.equal(after.agenda.overdue.length, 0);
  assert.equal(after.causes.filter((cause) => cause.type === "overdue").length, 0);
  assert.equal(after.causes.filter((cause) => cause.type === "no_next_action").length, 1);
});

test("week boundaries, proportional gap and zero/legacy benchmarks", () => {
  const c = contact(); const m = member(c.id); const now = "2026-10-08T03:00:00Z";
  assert.equal(commercialWeekInterval(2026, 10, 7).week, 1);
  const interval = commercialWeekInterval(2026, 10, 8);
  assert.equal(interval.week, 2); assert.equal(interval.start, Date.parse(now));
  assert.equal(commercialWeekInterval(2026, 10, 14).week, 2);
  assert.equal(commercialWeekInterval(2026, 10, 15).week, 3);
  assert.equal(commercialWeekInterval(2026, 10, 21).week, 3);
  assert.equal(commercialWeekInterval(2026, 10, 22).week, 4);
  assert.equal(commercialWeekInterval(2026, 10, 28).week, 4);
  assert.equal(commercialWeekInterval(2026, 10, 29).week, 5);
  assert.equal(expectedWeeklyProduction(10, interval.start, interval.start, interval.end), 0);
  assert.equal(expectedWeeklyProduction(10, interval.start + (interval.end - interval.start) / 2, interval.start, interval.end), 5);
  assert.equal(expectedWeeklyProduction(0, interval.end, interval.start, interval.end), 0);
  const targets = { ...timestamps(), tenantId, year: 2026, month: 10, activityType: "ab_phone" as const, weeklyTargets: [20, 10, 20, 20, 10] as [number, number, number, number, number] };
  const middle = new Date(interval.start + (interval.end - interval.start) / 2).toISOString();
  assert.equal(operationalAttention({ ...base(middle, [c], [m]), benchmarks: [targets] }).causes.some((cause) => cause.type === "weekly_gap"), true);
  assert.equal(operationalAttention({ ...base(middle, [c], [m]), benchmarks: [{ ...targets, weeklyTargets: [20, 0, 20, 20, 10] }] }).causes.some((cause) => cause.type === "weekly_gap"), false);
  assert.equal(operationalAttention({ ...base(middle, [c], [m]), benchmarks: [{ ...targets, weeklyTargets: undefined, legacyWeeklyTarget: 10 }] }).causes.some((cause) => cause.type === "weekly_gap"), false);
  assert.deepEqual(DEFAULT_ATTENTION_POLICY.stalledDays, 7);
  assert.equal(commercialLocalDateTimeToIso("2026-10-08T09:30"), "2026-10-08T12:30:00.000Z");
});

test("tenant boundary excludes foreign activities and contacts", () => {
  const c = contact(); const m = member(c.id); const foreign = { ...activity(c.id, "2026-10-07T12:00:00Z"), tenantId: "other" };
  const result = operationalAttention(base("2026-10-09T12:00:00Z", [c], [m], [foreign]));
  assert.equal(result.agenda.overdue.length, 0);
  assert.equal(result.causes.some((cause) => cause.type === "overdue"), false);
});

test("notification reconciliation is stable across refreshes, reading and resolution", async () => {
  const repo = getRepositoryProvider().notifications;
  const candidate: Notification = { ...timestamps(), tenantId, type: "overdue", severity: "attention", title: "Ana", message: "Vencida", status: "unread", sourceType: "activity", sourceId: "activity-1", occurrenceKey: "2026-10-07", causeKey: "tenant:overdue:activity:activity-1:2026-10-07" };
  for (let i = 0; i < 10; i++) await repo.reconcile(tenantId, [{ ...candidate, id: crypto.randomUUID() }]);
  await Promise.all([repo.reconcile(tenantId, [{ ...candidate, id: crypto.randomUUID() }]), repo.reconcile(tenantId, [{ ...candidate, id: crypto.randomUUID() }])]);
  assert.equal((await repo.list(tenantId)).length, 1);
  const saved = (await repo.list(tenantId))[0];
  await repo.markRead(tenantId, saved.id);
  await repo.reconcile(tenantId, [candidate]);
  assert.equal((await repo.findById(saved.id))?.status, "read");
  await repo.reconcile(tenantId, []);
  assert.equal((await repo.findById(saved.id))?.status, "resolved");
  await repo.reconcile(tenantId, [candidate]);
  assert.equal((await repo.findById(saved.id))?.status, "unread");
  assert.equal((await repo.list(tenantId)).length, 1);
});

test("v10 notification migration preserves legacy row without inventing source", async () => {
  const name = `legacy-notification-${crypto.randomUUID()}`; const old = new Dexie(name);
  old.version(10).stores({ notifications: "id, tenantId, contactId, status" }); await old.open();
  const row = { ...timestamps(), tenantId, type: "warning", title: "Legado", message: "Mensagem", status: "read" };
  await old.table("notifications").add(row); old.close();
  selectDatabase(name);
  const migrated = await getDatabase().notifications.get(row.id);
  assert.equal(migrated?.severity, "info");
  assert.equal(migrated?.status, "read");
  assert.equal(migrated?.causeKey, undefined);
  await getRepositoryProvider().notifications.reconcile(tenantId, []);
  assert.equal((await getDatabase().notifications.get(row.id))?.status, "read");
});
