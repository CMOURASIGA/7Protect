import "fake-indexeddb/auto";
import { qualifyFully } from "./commercial-fixture";
import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { selectDatabase, getDatabase } from "@/repositories/local/database";
import { getRepositoryProvider } from "@/repositories/providers";
import { setupFoundation } from "@/application/foundation-service";
import { createCommercialContact, qualifyContact, addToHot40, promoteCommercialContact, createCommercialActivity, commercialOverview } from "@/application/commercial-service";
import { timestamps } from "@/domains/shared/entity";
import { activityDate, aggregateCommercialActivities } from "@/application/commercial-aggregations";
import type { Hot40Membership } from "@/domains/core/entities";

beforeEach(async () => {
  selectDatabase(`test-commercial-${crypto.randomUUID()}`);
  await setupFoundation({ clientName: "Test", primaryColor: "#123456", highlightColor: "#654321", email: "test@example.test", phone: "" });
});
afterEach(async () => { await getDatabase().delete(); });
const contact = () => createCommercialContact({ fullName: "Contato teste" });

test("service blocks pending and not qualified HOT40 entries without writing", async () => {
  const person = await contact();
  await assert.rejects(addToHot40(person.id), /Qualifique/);
  await assert.rejects(promoteCommercialContact(person.id, "hot40"), /Qualifique/);
  await qualifyContact(person.id, "not_qualified");
  await assert.rejects(addToHot40(person.id), /Qualifique/);
  assert.equal((await getRepositoryProvider().contacts.findById(person.id))?.commercialStage, "market_base");
  assert.equal((await getRepositoryProvider().hot40Memberships.list(person.tenantId)).length, 0);
});

test("repositories block direct HOT40 create, update and Contact stage bypass", async () => {
  const person = await contact(); const p = getRepositoryProvider();
  const member: Hot40Membership = { ...timestamps(), tenantId: person.tenantId, contactId: person.id, enteredAt: new Date().toISOString(), status: "active" };
  await assert.rejects(p.hot40Memberships.create(member), /Qualifique/);
  await assert.rejects(p.hot40Memberships.update(member), /Qualifique/);
  await assert.rejects(p.contacts.update({ ...person, commercialStage: "hot40" }), /Qualifique/);
  await assert.rejects(p.contacts.create({ ...person, id: crypto.randomUUID(), commercialStage: "hot40" }), /Qualifique/);
  assert.equal((await p.hot40Memberships.list(person.tenantId)).length, 0);
});

test("qualified contact enters once; concurrent repository entries cannot duplicate HOT40", async () => {
  const person = await contact(); await qualifyFully(person.id);
  const p = getRepositoryProvider();
  const make = (): Hot40Membership => ({ ...timestamps(), tenantId: person.tenantId, contactId: person.id, enteredAt: new Date().toISOString(), status: "active" });
  const result = await Promise.allSettled([p.hot40Memberships.create(make()), p.hot40Memberships.create(make())]);
  assert.equal(result.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal((await p.hot40Memberships.list(person.tenantId)).length, 1);
  assert.equal((await p.contacts.findById(person.id))?.commercialStage, "hot40");
  const again = await addToHot40(person.id);
  assert.equal(again.id, (await p.hot40Memberships.list(person.tenantId))[0].id);
});

test("requalification removes active HOT40 participation and returns person to Mercado Base atomically", async () => {
  const person = await contact(); await qualifyFully(person.id); await addToHot40(person.id);
  const p = getRepositoryProvider(); const qualification = (await p.prospectQualifications.list(person.tenantId))[0];
  await p.prospectQualifications.update({ ...qualification, status: "not_qualified" });
  assert.equal((await p.contacts.findById(person.id))?.commercialStage, "market_base");
  assert.equal((await p.hot40Memberships.list(person.tenantId))[0].status, "removed");
  await assert.rejects(addToHot40(person.id), /Qualifique/);
});

test("qualification from another tenant or deleted qualification cannot authorize HOT40", async () => {
  const person = await contact(); const p = getRepositoryProvider();
  await assert.rejects(p.prospectQualifications.create({ ...timestamps(), tenantId: "other", contactId: person.id, status: "qualified" }), /contexto/);
  const qualification = await qualifyFully(person.id); await p.prospectQualifications.delete(qualification.id);
  await assert.rejects(addToHot40(person.id), /Qualifique/);
});

test("service and repositories reject incoherent activity dates", async () => {
  const person = await contact(); const p = getRepositoryProvider();
  const input = { contactId: person.id, type: "ab_phone" as const, status: "planned" as const, completedAt: "2026-10-08T12:00:00Z" };
  await assert.rejects(createCommercialActivity(input), /Data agendada/);
  await assert.rejects(p.commercialActivities.create({ ...timestamps(), tenantId: person.tenantId, ...input }), /Data agendada/);
  await assert.rejects(createCommercialActivity({ ...input, status: "completed", completedAt: undefined, scheduledAt: "2026-10-08T12:00:00Z" }), /Data realizada/);
  await assert.rejects(p.commercialActivities.update({ ...timestamps(), tenantId: person.tenantId, ...input, status: "completed", completedAt: undefined, scheduledAt: "2026-10-08T12:00:00Z" }), /Data realizada/);
});

test("planned uses scheduledAt and completed uses completedAt even when scheduled history exists", async () => {
  const person = await contact();
  const planned = await createCommercialActivity({ contactId: person.id, type: "ab_phone", status: "planned", scheduledAt: "2026-09-30T12:00:00Z" });
  const completed = await createCommercialActivity({ contactId: person.id, type: "ab_phone", status: "completed", scheduledAt: "2026-09-30T12:00:00Z", completedAt: "2026-10-08T12:00:00Z" });
  assert.equal(planned.completedAt, undefined);
  assert.equal(activityDate(planned), planned.scheduledAt);
  assert.equal(activityDate(completed), completed.completedAt);
  const totals = aggregateCommercialActivities([planned, completed]);
  assert.equal(totals.byMonth["2026-09"].length, 1);
  assert.equal(totals.byMonth["2026-10"].length, 1);
  for (const item of [planned, completed]) for (const field of ["week", "month", "year"]) assert.equal(field in item, false);
});


test("previous inconsistent HOT40 records are repaired without deleting history", async () => {
  const person = await contact(); const db = getDatabase();
  // Simulates data written by the previous version, before the repository guard existed.
  const member: Hot40Membership = { ...timestamps(), tenantId: person.tenantId, contactId: person.id, enteredAt: new Date().toISOString(), status: "active" };
  await db.hot40Memberships.add(member);
  await db.contacts.put({ ...person, commercialStage: "hot40" });
  await commercialOverview();
  assert.equal((await db.contacts.get(person.id))?.commercialStage, "market_base");
  assert.equal((await db.hot40Memberships.get(member.id))?.status, "removed");
  const version = (await db.contacts.get(person.id))?.version;
  await commercialOverview();
  assert.equal((await db.contacts.get(person.id))?.version, version);
});

test("HOT40 movement preserves Contact and writes stage history atomically", async () => {
  const person = await contact(); await qualifyFully(person.id); const member = await addToHot40(person.id);
  const { moveHot40Stage } = await import("@/application/commercial-service");
  const p = getRepositoryProvider();
  await moveHot40Stage(person.id, "approach_scheduled", "Agendada com cliente");
  assert.equal((await p.hot40Memberships.findById(member.id))?.stage, "approach_scheduled");
  assert.equal((await p.contacts.list(person.tenantId)).length, 1);
  const events = await p.hot40StageEvents.list(person.tenantId);
  assert.equal(events.length, 2);
  assert.equal(events[1].fromStage, "ab_phone");
  assert.equal(events[1].toStage, "approach_scheduled");
  assert.equal(await moveHot40Stage(person.id, "approach_scheduled"), null);
  assert.equal((await p.hot40StageEvents.list(person.tenantId)).length, 2);
  await assert.rejects(moveHot40Stage(person.id, "invalid" as "proposal"), /inválida/);
});
