import "fake-indexeddb/auto";
import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Dexie from "dexie";
import { ProtectDatabase, selectDatabase, getDatabase } from "@/repositories/local/database";
import { setupFoundation } from "@/application/foundation-service";
import { getRepositoryProvider } from "@/repositories/providers";
import { createCommercialContact, commercialOverview, addToHot40 } from "@/application/commercial-service";
import { saveProspectQualification, updateMarketContact } from "@/application/market-base-service";
import { listCommercialParameters, saveCommercialParameter } from "@/application/commercial-parameters-service";
import { QUALIFICATION_FIELDS, isValidQualification, originMonth } from "@/domains/commercial/qualification";
import { filterMarketContacts, type MarketFilters } from "@/domains/commercial/market-selectors";
import { timestamps } from "@/domains/shared/entity";
import { completeQualificationInput } from "./commercial-fixture";
const filters: MarketFilters = { search: "", qualification: "", stage: "", sourceId: "", originMonth: "" };
beforeEach(async () => { selectDatabase(`test-market-${crypto.randomUUID()}`); await setupFoundation({ clientName: "Matriz", primaryColor: "#123456", highlightColor: "#654321", phone: "", email: "test@example.test" }); });
afterEach(async () => { await getDatabase().delete(); });

test("Matriz options seed once, support edits and do not reappear after deactivation", async () => {
  const [first, parallel] = await Promise.all([listCommercialParameters(), listCommercialParameters()]);
  assert.equal(first.length, 35); assert.equal(parallel.length, first.length);
  assert.deepEqual(first.filter((item) => item.group === "source").map((item) => item.label), ["Família / amigos", "Recomendação", "Eventos", "Redes Sociais", "Grupo/Meio Social", "Parceria"]);
  await saveCommercialParameter({ ...first[0], active: false, label: "Fonte personalizada" });
  const changed = await listCommercialParameters(); assert.equal(changed.length, first.length); assert.equal(changed.find((item) => item.id === first[0].id)?.active, false);
  const custom = await saveCommercialParameter({ group: "source", label: "Campanha", order: 10, active: true });
  assert.equal((await listCommercialParameters()).find((item) => item.id === custom.id)?.label, "Campanha");
  await assert.rejects(saveCommercialParameter({ group: "source", label: " campanha ", order: 11, active: true }), /Já existe/);
});

test("draft qualification can be partial but completed qualification requires all fields", async () => {
  const person = await createCommercialContact({ fullName: "Rascunho" });
  const draft = await saveProspectQualification(person.id, { status: "pending", profession: "Analista" });
  assert.equal(draft.status, "pending"); assert.equal(isValidQualification(draft), false);
  await assert.rejects(saveProspectQualification(person.id, { status: "qualified", profession: "Analista" }), /Complete/);
  const p = getRepositoryProvider(); await assert.rejects(p.prospectQualifications.update({ ...draft, status: "qualified" }), /Complete/);
  await assert.rejects(addToHot40(person.id), /Qualifique/);
});

test("all structured fields persist; editing, requalification and HOT40 keep one Contact and one qualification", async () => {
  const person = await createCommercialContact({ fullName: "Ana", email: "ana@example.test" });
  const input = await completeQualificationInput(); const first = await saveProspectQualification(person.id, input);
  await updateMarketContact(person.id, { fullName: "Ana Maria", email: "ana@example.test", phone: "(21) 99999-1234" });
  const edited = await saveProspectQualification(person.id, { ...input, profession: "Gestora", originDate: "2026-09-30" });
  assert.equal(first.id, edited.id); assert.equal(edited.version, first.version + 1);
  await addToHot40(person.id); const overview = await commercialOverview();
  assert.equal(overview.contacts.length, 1); assert.equal(overview.qualifications.length, 1); assert.equal(overview.memberships.length, 1); assert.equal(overview.contacts[0].id, person.id); assert.equal(overview.contacts[0].fullName, "Ana Maria");
  assert.equal(originMonth(edited.originDate), "2026-09"); assert.equal("originMonth" in edited, false);
  for (const [field] of QUALIFICATION_FIELDS) assert.equal(edited[field], input[field]);
});

test("inactive parameters preserve previous selections but cannot be chosen for a new qualification", async () => {
  const person = await createCommercialContact({ fullName: "Anterior" }); const input = await completeQualificationInput();
  await saveProspectQualification(person.id, input);
  const source = (await listCommercialParameters()).find((item) => item.id === input.sourceId)!;
  await saveCommercialParameter({ ...source, active: false });
  const retained = await saveProspectQualification(person.id, { ...input, notes: "Atualizado" }); assert.equal(retained.sourceId, source.id);
  const other = await createCommercialContact({ fullName: "Novo" }); await assert.rejects(saveProspectQualification(other.id, input), /parâmetro ativo/);
});

test("parameters from wrong group or tenant and invalid date or income are blocked", async () => {
  const person = await createCommercialContact({ fullName: "Validação" }); const input = await completeQualificationInput();
  await assert.rejects(saveProspectQualification(person.id, { ...input, sourceId: input.ageRangeId }), /parâmetro ativo/);
  await assert.rejects(saveProspectQualification(person.id, { ...input, sourceId: crypto.randomUUID() }), /parâmetro ativo/);
  await assert.rejects(saveProspectQualification(person.id, { ...input, originDate: "2026-02-30" }), /Complete|inválida/);
  await assert.rejects(saveProspectQualification(person.id, { ...input, estimatedMonthlyIncome: -1 }), /Renda/);
  assert.equal(originMonth("2024-02-29"), "2024-02"); assert.equal(originMonth("2026-02-29"), null);
});

test("duplicate creation and edit are blocked by repository, including concurrent normalized identifiers", async () => {
  const first = await createCommercialContact({ fullName: "Primeiro", email: "one@example.test", phone: "(21) 99999-0001" });
  const second = await createCommercialContact({ fullName: "Segundo", email: "two@example.test" });
  await assert.rejects(updateMarketContact(second.id, { fullName: "Segundo", email: " ONE@example.test " }), /Já existe/);
  await assert.rejects(getRepositoryProvider().contacts.create({ ...first, id: crypto.randomUUID(), phone: "21999990001", email: undefined }), /Já existe/);
  const result = await Promise.allSettled([createCommercialContact({ fullName: "A", email: "parallel@example.test" }), createCommercialContact({ fullName: "B", email: "PARALLEL@example.test" })]);
  assert.equal(result.filter((item) => item.status === "fulfilled").length, 1);
});

test("search and combined filters use structured source, qualification, stage and derived origin month", async () => {
  const person = await createCommercialContact({ fullName: "José Ávila", email: "jose@example.test", phone: "(21) 99999-2222" });
  const other = await createCommercialContact({ fullName: "Maria" }); const input = await completeQualificationInput(); await saveProspectQualification(person.id, input); await addToHot40(person.id);
  const data = await commercialOverview(); const match = (extra: Partial<MarketFilters>) => filterMarketContacts(data.contacts, data.qualifications, data.parameters, { ...filters, ...extra });
  assert.equal(match({ search: "jose avila", qualification: "qualified", stage: "hot40", sourceId: input.sourceId, originMonth: "2026-10" })[0].id, person.id);
  assert.equal(match({ search: "999992222" }).length, 1); assert.equal(match({ search: "engenheiro" }).length, 1);
  assert.equal(match({ qualification: "pending" })[0].id, other.id); assert.equal(match({ originMonth: "2026-09" }).length, 0);
});

test("contacts, qualification and edited Matriz values survive closing and reopening IndexedDB", async () => {
  const person = await createCommercialContact({ fullName: "Persistente" }); const input = await completeQualificationInput(); const q = await saveProspectQualification(person.id, input);
  const option = (await listCommercialParameters())[0]; await saveCommercialParameter({ ...option, label: "Nome persistido" });
  const name = getDatabase().name; getDatabase().close(); selectDatabase(`unused-${crypto.randomUUID()}`); selectDatabase(name);
  const overview = await commercialOverview(); assert.equal(overview.contacts[0].id, person.id); assert.equal(overview.qualifications[0].id, q.id); assert.equal(overview.parameters.find((item) => item.id === option.id)?.label, "Nome persistido");
});

test("schema 7 adds parameters while preserving existing V2 and legacy records", async () => {
  const name = `test-upgrade-${crypto.randomUUID()}`; const old = new Dexie(name); old.version(6).stores({ contacts: "id, tenantId, email, phone, commercialStage, status", clients: "id, tenantId, status" });
  const person = { ...timestamps(), tenantId: "tenant", fullName: "Anterior", status: "active", commercialStage: "market_base" };
  const client = { ...timestamps(), tenantId: "tenant", name: "Legado", status: "active" };
  await old.table("contacts").add(person); await old.table("clients").add(client); old.close();
  const upgraded = new ProtectDatabase(name); await upgraded.open(); assert.equal((await upgraded.contacts.get(person.id))?.fullName, "Anterior"); assert.equal((await upgraded.clients.get(client.id))?.name, "Legado"); assert.equal(await upgraded.commercialParameters.count(), 0); await upgraded.delete();
});
