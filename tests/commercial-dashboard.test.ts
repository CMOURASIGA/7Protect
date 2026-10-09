import "fake-indexeddb/auto";
import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Dexie from "dexie";
import { commercialDashboard, monthlyBenchmark } from "@/application/commercial-dashboard";
import { commercialActivityMonthWeek, commercialMonthWeek } from "@/application/commercial-aggregations";
import { timestamps } from "@/domains/shared/entity";
import { selectDatabase, getDatabase } from "@/repositories/local/database";
import { getRepositoryProvider } from "@/repositories/providers";
import type { CommercialActivity, CommercialBenchmark, Contact } from "@/domains/core/entities";

const tenantId = "tenant";
const contact: Contact = { ...timestamps(), tenantId, fullName: "Teste", status: "active", commercialStage: "hot40", consultant: "A", origin: "Indicação" };
const activity = (type: CommercialActivity["type"], status: CommercialActivity["status"], date: string): CommercialActivity => ({ ...timestamps(), tenantId, contactId: contact.id, type, status, ...(status === "planned" ? { scheduledAt: date } : { completedAt: date }) });
const benchmark = (type: CommercialBenchmark["activityType"], weeklyTargets: [number, number, number, number, number]): CommercialBenchmark => ({ ...timestamps(), tenantId, year: 2026, month: 10, activityType: type, weeklyTargets });
const filters = { year: 2026, month: 10 };

beforeEach(() => selectDatabase(`dashboard-${crypto.randomUUID()}`));
afterEach(async () => getDatabase().delete());

test("results derive from scheduled and completed dates, never planned calls or manual numbers", () => {
  const rows = [activity("ab_phone", "planned", "2026-10-08T13:00:00Z"), activity("ab_phone", "completed", "2026-10-08T14:00:00Z"), activity("approach_scheduled", "planned", "2026-10-15T13:00:00Z"), activity("recommendation", "completed", "2026-11-01T01:00:00Z")];
  const result = commercialDashboard(rows, [contact], [benchmark("ab_phone", [0, 2, 2, 0, 0])], filters);
  assert.equal(result.monthly.find((item) => item.type === "ab_phone")?.actual, 1);
  assert.equal(result.monthly.find((item) => item.type === "ab_phone")?.gap, -3);
  assert.equal(result.monthly.find((item) => item.type === "ab_phone")?.attainment, 25);
  assert.equal(result.monthly.find((item) => item.type === "approach_scheduled")?.actual, 1);
  assert.equal(result.monthly.find((item) => item.type === "recommendation")?.actual, 1); // 31/10 in São Paulo
  assert.equal(result.weekly.reduce((sum, week) => sum + week.indicators.find((item) => item.type === "ab_phone")!.actual, 0), 1);
  assert.equal(result.monthly.find((item) => item.type === "ab_phone")?.activityIds[0], rows[1].id);
});

test("zero benchmark and empty funnel denominators do not divide by zero", () => {
  const result = commercialDashboard([activity("proposal", "completed", "2026-10-08T14:00:00Z")], [contact], [benchmark("proposal", [0, 0, 0, 0, 0])], filters);
  assert.equal(result.monthly.find((item) => item.type === "proposal")?.attainment, null);
  assert.equal(result.weekly[1].indicators.find((item) => item.type === "proposal")?.attainment, null);
  assert.equal(result.funnel.find((item) => item.type === "proposal")?.conversion, null);
  assert.equal(result.bottleneck?.type, "recommendation");
});

test("benchmarks validate and persist once per tenant, period and activity", async () => {
  const p = getRepositoryProvider(); const input = benchmark("ab_phone", [10, 10, 10, 10, 0]);
  await p.commercialBenchmarks.create(input);
  await assert.rejects(p.commercialBenchmarks.create(benchmark("ab_phone", [11, 11, 11, 11, 0])), /Já existe/);
  await assert.rejects(p.commercialBenchmarks.create({ ...benchmark("proposal", [2, 2, 2, 2, 0]), weeklyTargets: [2, -1, 2, 2, 0] }), /inteiros/);
  await p.commercialBenchmarks.update({ ...input, weeklyTargets: [12, 10, 10, 10, 0] });
  assert.equal((await p.commercialBenchmarks.list(tenantId)).length, 1);
  assert.equal((await p.commercialBenchmarks.findById(input.id))?.weeklyTargets?.[0], 12);
  assert.equal((await p.commercialBenchmarks.findById(input.id))?.version, 2);
});

test("consultant and origin filters change results without comparing tenant benchmark", () => {
  const rows = [activity("ab_phone", "completed", "2026-10-08T14:00:00Z")];
  const result = commercialDashboard(rows, [contact], [benchmark("ab_phone", [0, 2, 2, 0, 0])], { ...filters, consultant: "B" });
  assert.equal(result.monthly[0].actual, 0);
  assert.equal(result.monthly[0].target, null);
  const byOrigin = commercialDashboard(rows, [contact], [benchmark("ab_phone", [0, 2, 2, 0, 0])], { ...filters, origin: "Indicação" });
  assert.equal(byOrigin.monthly[0].actual, 1);
  assert.equal(byOrigin.monthly[0].target, null);
  assert.equal(byOrigin.weekly[1].indicators[0].target, null);
});

test("five distinct weekly targets sum to monthly and each gap uses its own week", () => {
  const dates = ["2026-10-01T14:00:00Z", "2026-10-08T14:00:00Z", "2026-10-15T14:00:00Z", "2026-10-22T14:00:00Z", "2026-10-29T14:00:00Z"];
  const rows = dates.map((date) => activity("ab_phone", "completed", date));
  const result = commercialDashboard(rows, [contact], [benchmark("ab_phone", [20, 10, 20, 20, 10])], filters);
  assert.deepEqual(result.weekly.map((week) => week.key), [1, 2, 3, 4, 5]);
  assert.deepEqual(result.weekly.map((week) => week.indicators[0].target), [20, 10, 20, 20, 10]);
  assert.deepEqual(result.weekly.map((week) => week.indicators[0].gap), [-19, -9, -19, -19, -9]);
  assert.deepEqual(result.weekly.map((week) => week.indicators[0].attainment), [5, 10, 5, 5, 10]);
  assert.equal(result.monthly[0].target, 80);
  assert.equal(result.monthly[0].actual, 5);
  assert.equal(result.monthly[0].gap, -75);
  assert.equal(result.weekly[4].indicators[0].activityIds[0], rows[4].id);
});

test("commercial month mapping honors São Paulo and last days of month", () => {
  assert.deepEqual([1, 7, 8, 14, 15, 21, 22, 28, 29, 31].map(commercialMonthWeek), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.equal(commercialActivityMonthWeek("2026-11-01T01:00:00Z"), 5);
  assert.equal(commercialActivityMonthWeek("2026-10-08T02:00:00Z"), 1);
  assert.equal(commercialActivityMonthWeek("2026-10-08T03:00:00Z"), 2);
  assert.throws(() => commercialMonthWeek(0));
});

test("Dexie v9 upgrade preserves legacy values without inventing five weekly targets", async () => {
  const name = `legacy-benchmark-${crypto.randomUUID()}`;
  const old = new Dexie(name);
  old.version(9).stores({ commercialBenchmarks: "id, tenantId, year, month, activityType, [tenantId+year+month+activityType]" });
  await old.open();
  const original = { ...timestamps(), tenantId, year: 2026, month: 10, activityType: "ab_phone", weeklyTarget: 20, monthlyTarget: 80 };
  await old.table("commercialBenchmarks").add(original);
  old.close();
  selectDatabase(name);
  const migrated = await getDatabase().commercialBenchmarks.get(original.id);
  assert.equal(migrated?.legacyWeeklyTarget, 20);
  assert.equal(migrated?.legacyMonthlyTarget, 80);
  assert.equal(migrated?.weeklyTargets, undefined);
  assert.equal(monthlyBenchmark(migrated), null);
  const report = commercialDashboard([], [contact], migrated ? [migrated] : [], filters);
  assert.equal(report.monthly[0].target, null);
  assert.equal(report.weekly[0].indicators[0].target, null);
  await getRepositoryProvider().commercialBenchmarks.update({ ...migrated!, weeklyTargets: [20, 10, 20, 20, 10], legacyWeeklyTarget: undefined, legacyMonthlyTarget: undefined });
  assert.equal(monthlyBenchmark(await getDatabase().commercialBenchmarks.get(original.id)), 80);
});
