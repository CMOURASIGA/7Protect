"use client";
import type { CommercialActivityType, CommercialParameter, Contact, ImportBatch, ImportOperation, ProspectQualification } from "@/domains/core/entities";
import { QUALIFICATION_FIELDS, originMonth } from "@/domains/commercial/qualification";
import { excelDate, IMPORT_RULE_VERSION, parseCommercialWorkbook, type ParsedImport, type SourceRow } from "@/domains/commercial/import-parser";
import { timestamps } from "@/domains/shared/entity";
import { getFoundation } from "./foundation-service";
import { readCommercialParameters } from "./commercial-parameters-service";
import { getRepositoryProvider } from "@/repositories/providers";

export type ImportStatus = "NEW_CONTACT" | "MATCHED_EXISTING" | "POSSIBLE_DUPLICATE" | "INVALID" | "SKIPPED" | "NEEDS_REVIEW";
export type PreviewRow = { row: number; fingerprint: string; name: string; phone: string; phoneValid: boolean; status: ImportStatus; reasons: string[]; matchedId?: string; candidates: string[]; qualification: Partial<ProspectQualification>; unknown: Record<string, string>; hot40Intent: boolean; qualificationComplete: boolean; existing?: Contact; existingQualification?: ProspectQualification };
export type ImportDecision = { row: number; action: "create" | "associate" | "skip"; contactId?: string; applyContact?: boolean; applyQualification?: boolean; hot40?: boolean; mappings?: Record<string, string> };
export type ImportPreview = { fileName: string; fileSize: number; fingerprint: string; parsed: ParsedImport; rows: PreviewRow[]; benchmark: Array<{ type: CommercialActivityType; label: string; row: number; targets: [number, number, number, number, number] }>; existingBatch?: ImportBatch; tenantId: string };
const names: Record<string, CommercialActivityType> = { "ABPhone - Ligações": "ab_phone", "Abordagens Marcadas": "approach_scheduled", "Abordagens Realizadas": "approach_completed", "Fechamentos Marcados": "closing_scheduled", "Fechamentos Realizados": "closing_completed", "Propostas": "proposal", "Recomendações": "recommendation" };
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((v) => v.toString(16).padStart(2, "0")).join("");
const sha = async (value: Uint8Array | string) => hex(await crypto.subtle.digest("SHA-256", typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value).buffer));
export const validPhone = (value: string) => /^\d{10,13}$/.test(value.replace(/\D/g, "")) && !/^(\d)\1+$/.test(value.replace(/\D/g, ""));
const cell = (row: SourceRow, column: string) => row.cells[column] && !["formula", "error"].includes(row.cells[column].kind) ? row.cells[column].value.trim() : "";
const rawPhone = (row: SourceRow) => { const c = row.cells.C; if (!c || !c.value) return ""; if (c.kind === "formula" || c.kind === "error" || (c.kind === "number" && (!/^\d+$/.test(c.value) || !Number.isSafeInteger(Number(c.value))))) return ""; return c.value.replace(/\D/g, ""); };
const dateValue = (row: SourceRow, date1904: boolean) => { const c = row.cells.N; if (!c?.value) return ""; if (c.kind === "formula" || c.kind === "error") return ""; if (c.kind === "number") return excelDate(Number(c.value), date1904) || ""; const value = c.value.slice(0, 10); return originMonth(value) ? value : ""; };
async function tenantId() { const { tenant } = await getFoundation(); if (!tenant) throw new Error("Configure a corretora."); return tenant.id; }

export async function analyzeCommercialFile(file: File | { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }): Promise<ImportPreview> {
  if (!/\.xlsm$/i.test(file.name)) throw new Error("Selecione a planilha .xlsm original.");
  const bytes = new Uint8Array(await file.arrayBuffer()); const fingerprint = await sha(bytes); const parsed = parseCommercialWorkbook(bytes);
  const tenant = await tenantId(); const provider = getRepositoryProvider(); const [contacts, qualifications, parameters, existingBatch] = await Promise.all([provider.contacts.list(tenant), provider.prospectQualifications.list(tenant), readCommercialParameters(), provider.imports.findBatch(tenant, fingerprint)]);
  const sameFilePhones = new Map<string, number>();
  for (const r of parsed.rows) { const phone = rawPhone(r); if (validPhone(phone)) sameFilePhones.set(phone, (sameFilePhones.get(phone) || 0) + 1); }
  const rows: PreviewRow[] = [];
  for (const row of parsed.rows) {
    const name = cell(row, "B"); const phone = rawPhone(row); const phoneValid = validPhone(phone); const reasons: string[] = []; const unknown: Record<string, string> = {}; const qualification: Partial<ProspectQualification> = { profession: cell(row, "G") || undefined };
    if (!name) reasons.push("Mercado Base!B: nome vazio.");
    if (cell(row, "C") && !phoneValid) reasons.push(`C${row.row}: telefone curto, fracionário ou ambíguo; não será usado como chave.`);
    const originDate = dateValue(row, parsed.date1904); if (originDate) qualification.originDate = originDate;
    else reasons.push(`N${row.row}: data de origem ausente/inválida; qualificação ficará pendente.`);
    for (const [field, group] of QUALIFICATION_FIELDS) {
      const column = ({ sourceId: "D", incomeBandId: "E", ageRangeId: "F", maritalStatusId: "H", childrenId: "I", contactFrequencyId: "J", approachEaseId: "K", referralPotentialId: "L" } as const)[field];
      const source = cell(row, column); const target = source === "0" || source === "0.0" ? "0" : source.replace(/\.0$/, "");
      const option = parameters.find((p: CommercialParameter) => p.group === group && p.active && norm(p.label) === norm(target));
      if (option) qualification[field] = option.id; else if (source) { unknown[field] = source; reasons.push(`${column}${row.row}: parâmetro '${source}' requer mapeamento.`); }
    }
    const matches = phoneValid ? contacts.filter((c) => c.phone?.replace(/\D/g, "") === phone && !c.deletedAt) : [];
    const sameName = contacts.filter((c) => norm(c.fullName) === norm(name) && !matches.includes(c));
    const duplicates = phoneValid && sameFilePhones.get(phone)! > 1;
    const hot40Intent = norm(cell(row, "M")) === "sim";
    if (!["sim", "nao"].includes(norm(cell(row, "M")))) reasons.push(`M${row.row}: intenção HOT40 desconhecida.`);
    const complete = Boolean(qualification.profession && qualification.originDate && QUALIFICATION_FIELDS.every(([field]) => qualification[field]));
    if (hot40Intent && !complete) reasons.push("HOT40 pendente: qualificação incompleta.");
    const existing = matches.length === 1 ? matches[0] : undefined;
    const status: ImportStatus = !name ? "INVALID" : matches.length > 1 || duplicates || sameName.length ? "POSSIBLE_DUPLICATE" : existing ? "MATCHED_EXISTING" : !phoneValid || Object.keys(unknown).length || reasons.some((r) => r.startsWith("M")) ? "NEEDS_REVIEW" : "NEW_CONTACT";
    rows.push({ row: row.row, fingerprint: await sha(JSON.stringify([IMPORT_RULE_VERSION, row.sheet, row.row, Object.entries(row.cells).filter(([c]) => c !== "O").sort()])), name, phone, phoneValid, status, reasons, matchedId: existing?.id, candidates: [...matches, ...sameName].map((c) => c.id), qualification, unknown, hot40Intent, qualificationComplete: complete, existing, existingQualification: qualifications.find((q) => q.contactId === existing?.id) });
  }
  return { fileName: file.name, fileSize: file.size, fingerprint, parsed, rows, benchmark: Object.entries(parsed.benchmark).filter(([name]) => names[name]).map(([label, targets]) => ({ label, type: names[label], row: Object.keys(names).indexOf(label) + 14, targets })), existingBatch, tenantId: tenant };
}

export async function commitCommercialImport(preview: ImportPreview, decisions: ImportDecision[], benchmark?: { year: number; month: number; replace: boolean }) {
  if (preview.tenantId !== await tenantId()) throw new Error("Tenant alterado. Analise novamente.");
  const repo = getRepositoryProvider().imports; const prior = await repo.findBatch(preview.tenantId, preview.fingerprint);
  if (prior?.status === "rolled_back_partially" || (prior?.status === "completed" && !benchmark)) return { batch: prior, operations: await repo.operations(preview.tenantId, prior.id) };
  const batch = await repo.createBatch({ ...timestamps(), tenantId: preview.tenantId, fileName: preview.fileName, fileSize: preview.fileSize, fingerprint: preview.fingerprint, ruleVersion: IMPORT_RULE_VERSION, actor: "usuário local", status: "committing", totals: { analyzed: preview.rows.length, created: 0, matched: 0, qualified: 0, hot40: 0, skipped: 0, errors: 0, review: 0 } });
  const parameters = await readCommercialParameters();
  for (const row of preview.rows) {
    const key = `${preview.fingerprint}:Mercado Base:${row.row}`; const decision = decisions.find((d) => d.row === row.row);
    if (!decision || decision.action === "skip" || row.status === "INVALID") { await repo.recordIssue({ tenantId: preview.tenantId, batchId: batch.id, operationKey: key, rowFingerprint: row.fingerprint, sheet: "Mercado Base", row: row.row, kind: "contact", status: !decision || row.status === "INVALID" ? "review" : "skipped", message: !decision ? "Decisão pendente." : "Ignorado por decisão." }); continue; }
    try {
      if (decision.action === "associate" && !decision.contactId) throw new Error("Selecione um Contact.");
      const target = decision.contactId ? await getRepositoryProvider().contacts.findById(decision.contactId) : undefined;
      if (decision.action === "associate" && (!target || target.tenantId !== preview.tenantId || target.deletedAt)) throw new Error("Contact não pertence ao tenant.");
      if (decision.action === "create" && row.phoneValid && row.status === "MATCHED_EXISTING") throw new Error("Telefone existente: associe ao Contact.");
      const existingQualification = target ? (await getRepositoryProvider().prospectQualifications.list(preview.tenantId)).find((q) => q.contactId === target.id) : undefined;
      const mapped: Partial<ProspectQualification> = { ...row.qualification };
      for (const [field, group] of QUALIFICATION_FIELDS) if (row.unknown[field] && (decision.applyQualification || decision.action === "create")) {
        const option = parameters.find((p) => p.id === decision.mappings?.[field] && p.group === group && p.active && p.tenantId === preview.tenantId);
        if (!option) throw new Error(`Mapeie ${field} antes da confirmação.`); mapped[field] = option.id;
      }
      const full = Boolean(mapped.profession && mapped.originDate && QUALIFICATION_FIELDS.every(([field]) => mapped[field]));
      const qualification = decision.applyQualification || decision.action === "create" ? { ...mapped, status: full ? "qualified" as const : "pending" as const, qualifiedAt: full ? new Date().toISOString() : undefined } : undefined;
      await repo.commitRow({ tenantId: preview.tenantId, batchId: batch.id, operationKey: key, rowFingerprint: row.fingerprint, row: row.row, name: row.name, phone: row.phoneValid ? row.phone : undefined, contactId: decision.action === "associate" ? decision.contactId : undefined, expectedContactVersion: target?.version, qualification, expectedQualificationVersion: existingQualification?.version, hot40: Boolean(decision.hot40 && row.hot40Intent), applyContact: Boolean(decision.applyContact) });
    } catch (cause) { await repo.recordIssue({ tenantId: preview.tenantId, batchId: batch.id, operationKey: key, rowFingerprint: row.fingerprint, sheet: "Mercado Base", row: row.row, kind: "contact", status: "error", message: cause instanceof Error ? cause.message : "Falha na linha." }); }
  }
  if (benchmark) {
    if (!Number.isInteger(benchmark.year) || benchmark.year < 2000 || benchmark.year > 2100 || !Number.isInteger(benchmark.month) || benchmark.month < 1 || benchmark.month > 12) throw new Error("Selecione ano e mês válidos.");
    const current = await getRepositoryProvider().commercialBenchmarks.list(preview.tenantId);
    for (const b of preview.benchmark) {
      const key = `${preview.fingerprint}:Indicadores:${b.row}:${benchmark.year}-${benchmark.month}`;
      try { await repo.commitBenchmark({ tenantId: preview.tenantId, batchId: batch.id, operationKey: key, rowFingerprint: await sha(JSON.stringify([b.label, b.targets])), row: b.row, year: benchmark.year, month: benchmark.month, activityType: b.type, weeklyTargets: b.targets, replace: benchmark.replace, expectedVersion: current.find((x) => x.year === benchmark.year && x.month === benchmark.month && x.activityType === b.type)?.version }); }
      catch (cause) { await repo.recordIssue({ tenantId: preview.tenantId, batchId: batch.id, operationKey: key, rowFingerprint: await sha(JSON.stringify(b.targets)), sheet: "Indicadores", row: b.row, kind: "benchmark", status: "error", message: cause instanceof Error ? cause.message : "Falha no benchmark." }); }
    }
  }
  const operations = await repo.operations(preview.tenantId, batch.id);
  const totals: ImportBatch["totals"] = { analyzed: preview.rows.length, created: operations.filter((o) => o.kind === "contact" && o.status === "created").length, matched: operations.filter((o) => o.kind === "contact" && ["matched", "updated"].includes(o.status)).length, qualified: operations.filter((o) => o.kind === "contact" && o.qualificationId && ["created", "updated", "matched"].includes(o.status)).length, hot40: operations.filter((o) => o.kind === "contact" && o.membershipId).length, skipped: operations.filter((o) => o.status === "skipped").length, errors: operations.filter((o) => o.status === "error").length, review: operations.filter((o) => o.status === "review" || o.message?.startsWith("HOT40 pendente")).length };
  return { batch: await repo.finish(batch.id, preview.tenantId, totals), operations };
}
export async function listImportBatches() { return getRepositoryProvider().imports.batches(await tenantId()); }
export async function importReport(batchId: string) { const tenant = await tenantId(); const batch = (await getRepositoryProvider().imports.batches(tenant)).find((b) => b.id === batchId); if (!batch) throw new Error("Lote não encontrado."); return { batch, operations: await getRepositoryProvider().imports.operations(tenant, batchId) }; }
export async function rollbackImport(batchId: string) { return getRepositoryProvider().imports.rollback(await tenantId(), batchId); }
