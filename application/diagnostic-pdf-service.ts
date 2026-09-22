"use client";
import { jsPDF } from "jspdf";
import { ensureDiagnosticReportSnapshot, type DiagnosticReportPayload } from "@/application/report-history-service";
import type { BrokerAnalysis, Client, Diagnostic, PlanningCycle, ReportSnapshot } from "@/domains/core/entities";
import { getClientLogoUrl } from "@/lib/brand-settings";

export type DiagnosticPdfMode = "client" | "internal";
type DiagnosticPdfInput = { client: Client | null; planning: PlanningCycle; diagnostic: Diagnostic; analysis: BrokerAnalysis | null; mode: DiagnosticPdfMode };
const sections = [["Identificação", "identification"], ["Família e dependentes", "family"], ["Trabalho e renda", "workIncome"], ["Despesas", "expenses"], ["Patrimônio", "assets"], ["Reservas e investimentos", "reserves"], ["Previdência", "pensions"], ["Dívidas e compromissos", "debts"], ["Seguros existentes", "existingInsurance"], ["Saúde", "health"], ["Objetivos e prioridades", "goals"], ["Observações", "review"]] as const;
const money = (value: unknown) => typeof value === "number" && value > 0 ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado";
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
const sanitizeFileName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");

async function logoData(url: string) {
  if (url.startsWith("data:")) return url;
  try { const response = await fetch(url, { mode: "cors" }); const blob = await response.blob(); return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); }); } catch { return null; }
}

export async function generateDiagnosticPdf({ client, planning, diagnostic, analysis, mode }: DiagnosticPdfInput) {
  const snapshot = await ensureDiagnosticReportSnapshot({ client, planning, diagnostic, analysis, mode });
  return generateDiagnosticPdfFromSnapshot(snapshot);
}

export async function generateDiagnosticPdfFromSnapshot(snapshot: ReportSnapshot) {
  if (snapshot.type !== "diagnostic_client" && snapshot.type !== "diagnostic_internal") throw new Error("Este snapshot não corresponde a um diagnóstico.");
  const payload = snapshot.payload as unknown as DiagnosticReportPayload; const doc = new jsPDF({ format: "a4", unit: "mm" }); const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); const margin = 17; let y = 18;
  const primary = payload.brand.primaryColor || "#003B73"; const highlight = payload.brand.highlightColor || "#00AEEF"; const addPage = () => { doc.addPage(); y = 18; };
  const ensure = (height: number) => { if (y + height > pageHeight - 18) addPage(); };
  const text = (value: string, size = 10, color = "#203449", weight: "normal" | "bold" = "normal") => { doc.setFont("helvetica", weight); doc.setFontSize(size); doc.setTextColor(color); const lines = doc.splitTextToSize(value, pageWidth - margin * 2); ensure(lines.length * (size * 0.48) + 3); doc.text(lines, margin, y); y += lines.length * (size * 0.48) + 3; };
  const logo = await logoData(getClientLogoUrl(payload.brand));
  doc.setFillColor(primary); doc.rect(0, 0, pageWidth, 8, "F");
  if (logo) { try { doc.addImage(logo, "PNG", margin, 13, 35, 18, undefined, "FAST"); } catch { /* nome da corretora permanece no cabeçalho */ } }
  doc.setTextColor(primary); doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("7Protect", logo ? 57 : margin, 19); doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text("Diagnóstico de Proteção Financeira", logo ? 57 : margin, 25); y = 38;
  text(payload.brand.clientName || "Corretora", 11, primary, "bold"); const contacts = [payload.brand.phone, payload.brand.email, payload.brand.address].filter(Boolean).join(" · "); if (contacts) text(contacts, 8, "#526476");
  y += 3; doc.setDrawColor(highlight); doc.setLineWidth(0.8); doc.line(margin, y, pageWidth - margin, y); y += 7;
  text(`Cliente: ${payload.client.name || "Não informado"}`, 10, "#203449", "bold"); text(`Planejamento: ${payload.planning.name}`, 10); text(`Data de referência: ${date(payload.planning.referenceDate)}`, 10); text(`Documento: ${payload.mode === "client" ? "PDF para o cliente" : "PDF completo interno"}`, 9, payload.mode === "client" ? "#167349" : "#8a4c00", "bold"); y += 4;
  for (const [title, key] of sections) { ensure(18); doc.setFillColor("#f2f7fb"); doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 1.5, 1.5, "F"); doc.setTextColor(primary); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(title, margin + 3, y + 5.2); y += 12; const value = String(payload.diagnostic[key] || "Não informado"); text(value, 9); if (key === "workIncome") text(`Renda familiar mensal: ${money(payload.diagnostic.familyIncome)}`, 9, "#526476"); if (key === "expenses") text(`Despesa familiar mensal: ${money(payload.diagnostic.monthlyExpense)}`, 9, "#526476"); y += 2; }
  if (payload.mode === "internal" && payload.analysis) { ensure(20); doc.setFillColor("#eef7f5"); doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 1.5, 1.5, "F"); doc.setTextColor(primary); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Análise profissional da corretora", margin + 3, y + 5.2); y += 12; for (const [label, value] of [["Resumo", payload.analysis.summary], ["Prioridades", payload.analysis.priorities], ["Hipóteses", payload.analysis.hypotheses], ["Necessidade estimada", money(payload.analysis.estimatedNeed)], ["Prazo considerado", payload.analysis.timeframe], ["Observações de cálculo", payload.analysis.calculationNotes], ["Recomendações", payload.analysis.recommendations], ["Perguntas pendentes", payload.analysis.pendingQuestions], ["Notas internas", payload.analysis.internalNotes]]) { text(`${label}: ${value || "Não informado"}`, 9); } }
  const pages = doc.getNumberOfPages(); const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()); for (let page = 1; page <= pages; page += 1) { doc.setPage(page); doc.setDrawColor("#dbe6ef"); doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor("#637587"); doc.text(`Gerado em ${generatedAt} · Dados mantidos localmente neste dispositivo`, margin, pageHeight - 8); doc.text(`Página ${page} de ${pages}`, pageWidth - margin, pageHeight - 8, { align: "right" }); }
  doc.save(`Diagnostico_${sanitizeFileName(payload.client.name || "Cliente")}_${payload.planning.referenceDate}.pdf`);
}
