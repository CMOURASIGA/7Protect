import "fake-indexeddb/auto";
import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { commercialDashboard } from "@/application/commercial-dashboard";
import { timestamps } from "@/domains/shared/entity";
import { selectDatabase, getDatabase } from "@/repositories/local/database";
import { getRepositoryProvider } from "@/repositories/providers";
import type { CommercialActivity, CommercialBenchmark, Contact } from "@/domains/core/entities";

const tenantId = "tenant";
const contact: Contact = { ...timestamps(), tenantId, fullName: "Teste", status: "active", commercialStage: "hot40", consultant: "A", origin: "Indicação" };
const activity = (type: CommercialActivity["type"], status: CommercialActivity["status"], date: string): CommercialActivity => ({ ...timestamps(), tenantId, contactId: contact.id, type, status, ...(status === "planned" ? { scheduledAt: date } : { completedAt: date }) });
const benchmark = (type: CommercialBenchmark["activityType"], weeklyTarget: number, monthlyTarget: number): CommercialBenchmark => ({ ...timestamps(), tenantId, year: 2026, month: 10, activityType: type, weeklyTarget, monthlyTarget });
const filters = { year: 2026, month: 10 };

beforeEach(() => selectDatabase(`dashboard-${crypto.randomUUID()}`));
afterEach(async () => getDatabase().delete());

test("results derive from scheduled and completed dates, never planned calls or manual numbers", () => {
  const rows = [activity("ab_phone", "planned", "2026-10-08T13:00:00Z"), activity("ab_phone", "completed", "2026-10-08T14:00:00Z"), activity("approach_scheduled", "planned", "2026-10-15T13:00:00Z"), activity("recommendation", "completed", "2026-11-01T01:00:00Z")];
  const result = commercialDashboard(rows, [contact], [benchmark("ab_phone", 2, 4)], filters);
  assert.equal(result.monthly.find((item) => item.type === "ab_phone")?.actual, 1);
  assert.equal(result.monthly.find((item) => item.type === "ab_phone")?.gap, -3);
  assert.equal(result.monthly.find((item) => item.type === "ab_phone")?.attainment, 25);
  assert.equal(result.monthly.find((item) => item.type === "approach_scheduled")?.actual, 1);
  assert.equal(result.monthly.find((item) => item.type === "recommendation")?.actual, 1); // 31/10 in São Paulo
  assert.equal(result.weekly.reduce((sum, week) => sum + week.indicators.find((item) => item.type === "ab_phone")!.actual, 0), 1);
  assert.equal(result.monthly.find((item) => item.type === "ab_phone")?.activityIds[0], rows[1].id);
});

test("zero benchmark and empty funnel denominators do not divide by zero", () => {
  const result = commercialDashboard([activity("proposal", "completed", "2026-10-08T14:00:00Z")], [contact], [benchmark("proposal", 0, 0)], filters);
  assert.equal(result.monthly.find((item) => item.type === "proposal")?.attainment, null);
  assert.equal(result.funnel.find((item) => item.type === "proposal")?.conversion, null);
  assert.equal(result.bottleneck?.type, "recommendation");
});

test("benchmarks validate and persist once per tenant, period and activity", async () => {
  const p = getRepositoryProvider(); const input = benchmark("ab_phone", 10, 40);
  await p.commercialBenchmarks.create(input);
  await assert.rejects(p.commercialBenchmarks.create(benchmark("ab_phone", 11, 44)), /Já existe/);
  await assert.rejects(p.commercialBenchmarks.create({ ...benchmark("proposal", 2, 8), weeklyTarget: -1 }), /inteiros/);
  await p.commercialBenchmarks.update({ ...input, weeklyTarget: 12 });
  assert.equal((await p.commercialBenchmarks.list(tenantId)).length, 1);
  assert.equal((await p.commercialBenchmarks.findById(input.id))?.weeklyTarget, 12);
  assert.equal((await p.commercialBenchmarks.findById(input.id))?.version, 2);
});

test("consultant and origin filters change results without comparing tenant benchmark", () => {
  const rows = [activity("ab_phone", "completed", "2026-10-08T14:00:00Z")];
  const result = commercialDashboard(rows, [contact], [benchmark("ab_phone", 2, 4)], { ...filters, consultant: "B" });
  assert.equal(result.monthly[0].actual, 0);
  assert.equal(result.monthly[0].target, null);
});
