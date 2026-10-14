import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { selectDatabase, getDatabase } from "@/repositories/local/database";
import { setupFoundation, getFoundation } from "@/application/foundation-service";
import { listCommercialParameters } from "@/application/commercial-parameters-service";
import { ensureCommercialV2DemoData, createCommercialContact } from "@/application/commercial-service";
import { prepareOperationalDemo } from "@/application/operational-service";
import { resetCommercialDemoScenario } from "@/application/commercial-demo-service";
import { analyzeCommercialFile, commitCommercialImport, rollbackImport } from "@/application/commercial-import";
import { timestamps } from "@/domains/shared/entity";

const cell = (col: string, value: string | number, type = "inlineStr") => type === "inlineStr" ? `<c r="${col}7" t="inlineStr"><is><t>${value}</t></is></c>` : `<c r="${col}7" t="${type}"><v>${value}</v></c>`;
function workbook(name = "Contato de importação") {
  const names = ["Mercado Base", "HOT40", "Indicadores", "Matriz"];
  const book = `<workbook><workbookPr date1904="0"/><sheets>${names.map((name, index) => `<sheet name="${name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`;
  const rels = `<Relationships>${names.map((_, index) => `<Relationship Id="rId${index + 1}" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}</Relationships>`;
  const market = `<worksheet><sheetData><row r="6"><c r="B6" t="inlineStr"><is><t>Nome</t></is></c><c r="D6" t="inlineStr"><is><t>Fontes de Prospecção</t></is></c><c r="M6" t="inlineStr"><is><t>Virou HOT40?</t></is></c><c r="N6" t="inlineStr"><is><t>Data de origem</t></is></c></row><row r="7">${cell("B", name)}${cell("C", "21999991234", "n")}${cell("D", "Eventos")}${cell("M", "Não")}${cell("N", 45662, "n")}</row></sheetData></worksheet>`;
  const indicators = `<worksheet><sheetData><row r="14"><c r="B14" t="inlineStr"><is><t>ABPhone - Ligações</t></is></c>${[20, 10, 20, 20, 10].map((value, index) => `<c r="${"DEFGH"[index]}14" t="n"><v>${value}</v></c>`).join("")}</row></sheetData></worksheet>`;
  return zipSync({ "[Content_Types].xml": strToU8("<Types/>"), "xl/workbook.xml": strToU8(book), "xl/_rels/workbook.xml.rels": strToU8(rels), "xl/worksheets/sheet1.xml": strToU8(market), "xl/worksheets/sheet2.xml": strToU8("<worksheet><sheetData/></worksheet>"), "xl/worksheets/sheet3.xml": strToU8(indicators), "xl/worksheets/sheet4.xml": strToU8("<worksheet><sheetData/></worksheet>") });
}

test("commercial reset preserves partial rollback, imported Contact, audit, benchmark and other tenant", async () => {
  process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  selectDatabase(`demo-reset-${crypto.randomUUID()}`);
  try {
    const db = getDatabase();
    await setupFoundation({ clientName: "Demo", primaryColor: "#123456", highlightColor: "#654321", phone: "", email: "test@example.test" });
    const tenantId = (await getFoundation()).tenant!.id;
    await listCommercialParameters();
    await ensureCommercialV2DemoData();
    await prepareOperationalDemo("2026-10-18T15:00:00Z");
    const ownedBefore = (await db.contacts.where("tenantId").equals(tenantId).toArray()).filter((row) => row.demoScenarioKey);
    assert.ok(ownedBefore.length >= 3);
    const bytes = workbook();
    const preview = await analyzeCommercialFile({ name: "oficial.xlsm", size: bytes.length, arrayBuffer: async () => Uint8Array.from(bytes).buffer });
    const imported = await commitCommercialImport(preview, [{ row: 7, action: "create", hot40: false }]);
    const benchmarkBytes = workbook("Lote separado");
    const benchmarkPreview = await analyzeCommercialFile({ name: "benchmark.xlsm", size: benchmarkBytes.length, arrayBuffer: async () => Uint8Array.from(benchmarkBytes).buffer });
    const benchmarkBatch = await commitCommercialImport(benchmarkPreview, [{ row: 7, action: "skip" }], { year: 2027, month: 1, replace: false });
    assert.equal(benchmarkBatch.batch.totals.errors, 0);
    assert.equal(imported.batch.totals.errors, 0, JSON.stringify(await db.importOperations.where("batchId").equals(imported.batch.id).toArray()));
    assert.ok((await db.commercialBenchmarks.where("tenantId").equals(tenantId).toArray()).some((row) => row.year === 2027 && row.month === 1));
    const operation = (await db.importOperations.where("batchId").equals(imported.batch.id).toArray()).find((row) => row.contactId)!;
    const person = (await db.contacts.get(operation.contactId!))!;
    assert.equal(person.demoScenarioKey, undefined);
    await db.contacts.put({ ...person, fullName: "Contato revisado", version: person.version + 1 });
    const outcome = await rollbackImport(imported.batch.id);
    assert.ok(outcome.some((row) => row.status === "conflict"));
    const foreign = { ...timestamps(), tenantId: "foreign", fullName: "Outro tenant", status: "active" as const, commercialStage: "market_base" as const };
    await db.contacts.add(foreign);
    const manual = await createCommercialContact({ fullName: "Manual", phone: "21999998888" });
    const initialAudit = await db.importOperations.where("batchId").equals(imported.batch.id).toArray();
    const first = await resetCommercialDemoScenario();
    assert.ok(first.removed > 0);
    assert.equal((await db.contacts.get(operation.contactId!))?.fullName, "Contato revisado");
    assert.ok(await db.contacts.get(manual.id));
    assert.ok(await db.contacts.get(foreign.id));
    assert.ok(await db.importBatches.get(imported.batch.id));
    assert.ok(await db.importBatches.get(benchmarkBatch.batch.id));
    assert.deepEqual(await db.importOperations.where("batchId").equals(imported.batch.id).toArray(), initialAudit);
    assert.equal((await db.commercialBenchmarks.where("tenantId").equals(tenantId).toArray()).find((row) => row.year === 2027 && row.month === 1)?.weeklyTargets?.reduce((sum, value) => sum + value, 0), 80);
    const after = await db.contacts.where("tenantId").equals(tenantId).toArray();
    assert.ok(ownedBefore.every((row) => !after.some((current) => current.id === row.id)), JSON.stringify({ preserved: first.preserved, contacts: ownedBefore.map((row) => ({ id: row.id, name: row.fullName, version: row.version, demoVersion: row.demoScenarioVersion })) }));
    const count = after.length;
    await resetCommercialDemoScenario();
    await prepareOperationalDemo("2026-10-18T15:00:00Z");
    assert.equal((await db.contacts.where("tenantId").equals(tenantId).count()), count);
    assert.ok(await db.importBatches.get(imported.batch.id));
  } finally { await getDatabase().delete(); delete process.env.NEXT_PUBLIC_DEMO_MODE; }
});

test("reset preserves demo Contact after manual edit or import association and never adopts unmarked names", async () => {
  process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  selectDatabase(`demo-reset-protection-${crypto.randomUUID()}`);
  try {
    const db = getDatabase();
    await setupFoundation({ clientName: "Demo", primaryColor: "#123456", highlightColor: "#654321", phone: "", email: "test@example.test" });
    const tenantId = (await getFoundation()).tenant!.id;
    await listCommercialParameters(); await ensureCommercialV2DemoData();
    const original = await db.contacts.where("tenantId").equals(tenantId).toArray();
    const ana = original.find((row) => row.fullName === "Ana Martins")!;
    const carla = original.find((row) => row.fullName === "Carla Souza")!;
    await db.contacts.put({ ...carla, fullName: "Carla editada", version: carla.version + 1 });
    const bytes = workbook("Ana na planilha");
    const preview = await analyzeCommercialFile({ name: "assoc.xlsm", size: bytes.length, arrayBuffer: async () => Uint8Array.from(bytes).buffer });
    const batch = await commitCommercialImport(preview, [{ row: 7, action: "associate", contactId: ana.id, applyContact: false, applyQualification: false }]);
    assert.equal(batch.batch.totals.errors, 0);
    const result = await resetCommercialDemoScenario();
    assert.ok(result.preserved.some((row) => row.id === ana.id));
    assert.ok(result.preserved.some((row) => row.id === carla.id));
    assert.ok(await db.contacts.get(ana.id));
    assert.equal((await db.contacts.get(carla.id))?.fullName, "Carla editada");
    assert.ok(await db.importBatches.get(batch.batch.id));
    assert.ok((await db.importOperations.where("batchId").equals(batch.batch.id).toArray()).some((row) => row.contactId === ana.id));
    const idList = (await db.contacts.where("tenantId").equals(tenantId).toArray()).map((row) => row.id);
    await resetCommercialDemoScenario();
    assert.ok(idList.includes(ana.id)); assert.ok(await db.contacts.get(ana.id));
  } finally { await getDatabase().delete(); delete process.env.NEXT_PUBLIC_DEMO_MODE; }
});
