import "fake-indexeddb/auto";
import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import Dexie from "dexie";
import { selectDatabase, getDatabase } from "@/repositories/local/database";
import { setupFoundation } from "@/application/foundation-service";
import { getRepositoryProvider } from "@/repositories/providers";
import { listCommercialParameters } from "@/application/commercial-parameters-service";
import { analyzeCommercialFile, commitCommercialImport, rollbackImport } from "@/application/commercial-import";
import { excelDate, parseCommercialWorkbook } from "@/domains/commercial/import-parser";
import { createCommercialActivity, createCommercialContact } from "@/application/commercial-service";
import { timestamps } from "@/domains/shared/entity";

const c = (col: string, row: number, v: string | number, t = "inlineStr") => t === "inlineStr" ? `<c r="${col}${row}" t="inlineStr"><is><t>${v}</t></is></c>` : `<c r="${col}${row}" t="${t}"><v>${v}</v></c>`;
const source = (name: string, phone: string, hot = "Sim", date = 45662) => `<row r="7">${c("B", 7, name)}${c("C", 7, phone, "n")}${c("D", 7, "Eventos")}${c("E", 7, "R$ 7 Mil a R$ 10 Mil")}${c("F", 7, "30 a 35")}${c("G", 7, "Gestora")}${c("H", 7, "Casado")}${c("I", 7, 0, "n")}${c("J", 7, "1 vez")}${c("K", 7, "Sim")}${c("L", 7, "Sim")}${c("M", 7, hot)}${c("N", 7, date, "n")}${c("O", 7, "=YEAR(N7)")}</row>`;
function fixture(person = source("Ana Importada", "21999991234"), unknown = false) {
  const root = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`;
  const workbook = `<workbook><workbookPr date1904="0"/><sheets>${["Mercado Base", "HOT40", "Indicadores", "Matriz"].map((s, i) => `<sheet name="${s}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
  const rels = `<Relationships>${[1, 2, 3, 4].map((i) => `<Relationship Id="rId${i}" Target="worksheets/sheet${i}.xml"/>`).join("")}</Relationships>`;
  const market = `<worksheet><sheetData><row r="6">${c("B", 6, "Nome")}${c("D", 6, "Fontes de Prospecção")}${c("M", 6, "Virou HOT40?")}${c("N", 6, "Data de origem")}</row>${unknown ? person.replace("Eventos", "Fonte impossível") : person}</sheetData></worksheet>`;
  const hot = `<worksheet><sheetData><row r="8"><c r="B8" t="e"><f>FILTER('Mercado Base'!B:O)</f><v>#VALUE!</v></c>${c("P", 8, 45662, "n")}</row></sheetData></worksheet>`;
  const indicator = `<worksheet><sheetData><row r="14">${c("B", 14, "ABPhone - Ligações")}${[20, 10, 20, 20, 10].map((x, i) => c("DEFGH"[i], 14, x, "n")).join("")}<c r="I14"><f>SUM(D14:H14)</f><v>80</v></c></row></sheetData></worksheet>`;
  return zipSync({ "[Content_Types].xml": strToU8(root), "xl/workbook.xml": strToU8(workbook), "xl/_rels/workbook.xml.rels": strToU8(rels), "xl/worksheets/sheet1.xml": strToU8(market), "xl/worksheets/sheet2.xml": strToU8(hot), "xl/worksheets/sheet3.xml": strToU8(indicator), "xl/worksheets/sheet4.xml": strToU8("<worksheet><sheetData/></worksheet>") });
}
const file = (bytes: Uint8Array) => ({ name: "OFICIAL - Contatos e HOT40_vFinal.xlsm", size: bytes.length, arrayBuffer: async () => Uint8Array.from(bytes).buffer });
beforeEach(async () => { selectDatabase(`test-import-${crypto.randomUUID()}`); await setupFoundation({ clientName: "Import test", primaryColor: "#123456", highlightColor: "#654321", phone: "", email: "test@example.test" }); await listCommercialParameters(); });
afterEach(async () => { await getDatabase().delete(); });

test("XLSM parser reads typed raw values, ignores formula cached facts and blocks HOT40 dates", () => {
  const parsed = parseCommercialWorkbook(fixture()); assert.equal(parsed.rows.length, 1); assert.equal(parsed.rows[0].cells.N.value, "45662");
  assert.equal(parsed.benchmark["ABPhone - Ligações"].reduce((a, b) => a + b, 0), 80);
  assert.match(parsed.warnings.join(" "), /#VALUE!/); assert.equal(excelDate(60), null); assert.equal(excelDate(45662), "2025-01-05");
  assert.throws(() => parseCommercialWorkbook(fixture().slice(0, 25)), /inválido/);
});

test("preview writes nothing; confirm creates a single qualified Contact, membership and benchmark opt-in; retry remains stable", async () => {
  const bytes = fixture(); const preview = await analyzeCommercialFile(file(bytes)); const p = getRepositoryProvider();
  assert.equal(preview.rows[0].status, "NEW_CONTACT"); assert.equal((await p.contacts.list(preview.tenantId)).length, 0); assert.equal((await p.imports.batches(preview.tenantId)).length, 0);
  const decision = [{ row: 7, action: "create" as const, hot40: true }];
  const result = await commitCommercialImport(preview, decision, { year: 2026, month: 10, replace: false });
  assert.equal(result.batch.totals.created, 1); assert.equal(result.batch.totals.hot40, 1);
  const contact = (await p.contacts.list(preview.tenantId))[0]; assert.equal(contact.commercialStage, "hot40");
  assert.equal((await p.hot40Memberships.list(preview.tenantId))[0].stage, "ab_phone"); assert.equal((await p.commercialActivities.list(preview.tenantId)).length, 0);
  assert.deepEqual((await p.commercialBenchmarks.list(preview.tenantId))[0].weeklyTargets, [20, 10, 20, 20, 10]);
  const again = await commitCommercialImport(await analyzeCommercialFile(file(bytes)), decision, { year: 2026, month: 10, replace: false });
  assert.equal(again.batch.id, result.batch.id); assert.equal((await p.contacts.list(preview.tenantId)).length, 1); assert.equal((await p.hot40Memberships.list(preview.tenantId)).length, 1);
  const results = await rollbackImport(result.batch.id); assert.ok(results.every((r) => r.status === "rolled_back")); assert.equal((await p.contacts.list(preview.tenantId)).length, 0);
});

test("unknown parameter requires mapping; row transaction fails without orphan and partial batch keeps errors", async () => {
  const preview = await analyzeCommercialFile(file(fixture(undefined, true))); assert.equal(preview.rows[0].status, "NEEDS_REVIEW");
  const outcome = await commitCommercialImport(preview, [{ row: 7, action: "create", hot40: true }]); assert.equal(outcome.batch.totals.errors, 1);
  assert.equal((await getRepositoryProvider().contacts.list(preview.tenantId)).length, 0);
  const source = (await listCommercialParameters()).find((p) => p.group === "source" && p.label === "Eventos")!;
  const retry = await commitCommercialImport(preview, [{ row: 7, action: "create", hot40: true, mappings: { sourceId: source.id } }]);
  assert.equal(retry.batch.totals.created, 1); assert.equal((await getRepositoryProvider().contacts.list(preview.tenantId)).length, 1);
});

test("matching remains tenant scoped, short phone is review, stale version blocks rollback after later activity", async () => {
  const existing = await createCommercialContact({ fullName: "Outra Ana", phone: "(21) 99999-1234" });
  const preview = await analyzeCommercialFile(file(fixture())); assert.equal(preview.rows[0].matchedId, existing.id);
  const result = await commitCommercialImport(preview, [{ row: 7, action: "associate", contactId: existing.id, applyContact: false, applyQualification: true, hot40: true }]);
  assert.equal(result.batch.totals.created, 0); assert.equal((await getRepositoryProvider().contacts.list(preview.tenantId)).length, 1);
  await createCommercialActivity({ contactId: existing.id, type: "ab_phone", status: "completed", completedAt: "2026-10-14T10:00" });
  assert.equal((await rollbackImport(result.batch.id))[0].status, "conflict");
  assert.equal((await getRepositoryProvider().contacts.findById(existing.id))?.commercialStage, "hot40");
  const short = await analyzeCommercialFile(file(fixture(source("João", "2222", "Não", 45662)))); assert.equal(short.rows[0].status, "NEEDS_REVIEW");
  const foreign = { ...timestamps(), tenantId: "foreign", fullName: "Pessoa externa", status: "active" as const, commercialStage: "market_base" as const };
  await getDatabase().contacts.add(foreign);
  const different = await analyzeCommercialFile(file(fixture(source("Terceira", "21999998888", "Não", 45662))));
  const denied = await commitCommercialImport(different, [{ row: 7, action: "associate", contactId: foreign.id, applyQualification: true }]);
  assert.equal(denied.batch.totals.errors, 1); assert.equal((await getRepositoryProvider().contacts.list(preview.tenantId)).length, 1);
});

test("simultaneous confirmation of one file remains one Contact and one membership", async () => {
  const preview = await analyzeCommercialFile(file(fixture())); const d = [{ row: 7, action: "create" as const, hot40: true }];
  const results = await Promise.all([commitCommercialImport(preview, d), commitCommercialImport(preview, d)]);
  assert.equal(results[0].batch.id, results[1].batch.id);
  assert.equal((await getRepositoryProvider().contacts.list(preview.tenantId)).length, 1);
  assert.equal((await getRepositoryProvider().hot40Memberships.list(preview.tenantId)).length, 1);
  assert.equal((await getRepositoryProvider().hot40StageEvents.list(preview.tenantId)).length, 1);
});

test("rollback preserves manually edited Contact and reports conflict", async () => {
  const preview = await analyzeCommercialFile(file(fixture())); const result = await commitCommercialImport(preview, [{ row: 7, action: "create", hot40: true }]);
  const p = getRepositoryProvider(); const person = (await p.contacts.list(preview.tenantId))[0];
  await p.contacts.update({ ...person, fullName: "Nome revisado" });
  const outcomes = await rollbackImport(result.batch.id); assert.equal(outcomes[0].status, "conflict");
  assert.equal((await p.contacts.findById(person.id))?.fullName, "Nome revisado");
});

test("numeric fractional phone never identifies existing Contact and missing origin date leaves pending HOT40", async () => {
  const fractional = await analyzeCommercialFile(file(fixture(source("Teste", "19902.4285714286", "Sim", 45662))));
  assert.equal(fractional.rows[0].phoneValid, false); assert.equal(fractional.rows[0].status, "NEEDS_REVIEW");
  const missing = await analyzeCommercialFile(file(fixture(source("Teste 2", "21987654321", "Sim", 0))));
  const result = await commitCommercialImport(missing, [{ row: 7, action: "create", hot40: true }]);
  assert.equal(result.batch.totals.created, 1); assert.equal(result.batch.totals.review, 1);
  assert.equal((await getRepositoryProvider().contacts.list(missing.tenantId)).length, 1);
  assert.equal((await getRepositoryProvider().prospectQualifications.list(missing.tenantId))[0].status, "pending");
  assert.equal((await getRepositoryProvider().hot40Memberships.list(missing.tenantId)).length, 0);
});

test("benchmark replacement requires explicit decision and preserves other period", async () => {
  const first = await analyzeCommercialFile(file(fixture()));
  await commitCommercialImport(first, [{ row: 7, action: "skip" }], { year: 2026, month: 10, replace: false });
  const second = await analyzeCommercialFile(file(fixture(source("Nova linha", "21912345678", "Não", 45662))));
  const blocked = await commitCommercialImport(second, [{ row: 7, action: "skip" }], { year: 2026, month: 10, replace: false });
  assert.equal(blocked.batch.totals.errors, 1);
  const replaced = await commitCommercialImport(second, [{ row: 7, action: "skip" }], { year: 2026, month: 10, replace: true });
  assert.equal(replaced.batch.totals.errors, 0);
  assert.equal((await getRepositoryProvider().commercialBenchmarks.list(first.tenantId)).length, 1);
});

test("rollback of original batch protects a Contact referenced by a later import", async () => {
  const first = await analyzeCommercialFile(file(fixture()));
  const a = await commitCommercialImport(first, [{ row: 7, action: "create", hot40: false }]);
  const person = (await getRepositoryProvider().contacts.list(first.tenantId))[0];
  const second = await analyzeCommercialFile(file(fixture(source("Outra linha", "21999991234", "Não", 45662))));
  await commitCommercialImport(second, [{ row: 7, action: "associate", contactId: person.id, applyContact: false, applyQualification: false }]);
  assert.equal((await rollbackImport(a.batch.id))[0].status, "conflict");
  assert.equal((await getRepositoryProvider().contacts.list(first.tenantId)).length, 1);
});

test("schema 12 keeps preexisting Contacts and import audit survives database reopening", async () => {
  const existing = await createCommercialContact({ fullName: "Anterior", phone: "21955554444" });
  const preview = await analyzeCommercialFile(file(fixture()));
  const committed = await commitCommercialImport(preview, [{ row: 7, action: "create", hot40: true }]);
  const dbName = getDatabase().name; selectDatabase(`temporary-${crypto.randomUUID()}`); selectDatabase(dbName);
  const p = getRepositoryProvider();
  assert.ok(await p.contacts.findById(existing.id));
  assert.equal((await p.imports.findBatch(preview.tenantId, preview.fingerprint))?.id, committed.batch.id);
  assert.equal((await p.imports.operations(preview.tenantId, committed.batch.id)).length, 1);
});

test("schema 11 upgrades to 12 without removing prior Contact", async () => {
  const name = `upgrade-import-${crypto.randomUUID()}`; selectDatabase(name);
  const old = new Dexie(name); old.version(11).stores({ contacts: "id, tenantId, phone", tenants: "id, tenantId", settings: "id, tenantId", commercialParameters: "id, tenantId" });
  await old.open(); const row = { ...timestamps(), tenantId: "tenant-upgrade", fullName: "Anterior", status: "active", commercialStage: "market_base" };
  await old.table("contacts").add(row); old.close();
  selectDatabase(`other-${crypto.randomUUID()}`); selectDatabase(name);
  assert.equal((await getDatabase().contacts.get(row.id))?.fullName, "Anterior");
  assert.equal((await getDatabase().importBatches.toArray()).length, 0);
});
