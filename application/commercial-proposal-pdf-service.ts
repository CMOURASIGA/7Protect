"use client";

import { jsPDF } from "jspdf";
import type { CommercialReportPayload } from "@/application/reporting-service";

const money = (value?: number) => (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value?: string) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value)) : "Não informado";
const safe = (value?: string | number | null) => value === undefined || value === null || value === "" ? "Não informado" : String(value);

export function generateCommercialProposalPdf(report: CommercialReportPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); const brand = report.brand.value; const client = report.client.value; const planning = report.planning.value; const proposal = report.proposal.value; const analysis = report.analysis.value; let y = 20;
  const page = () => { doc.addPage(); y = 20; header(); };
  const header = () => { doc.setFillColor(brand.primaryColor); doc.rect(0, 0, 210, 13, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text(brand.clientName, 15, 8); doc.setTextColor(25, 50, 77); };
  const section = (title: string) => { if (y > 258) page(); doc.setFillColor(brand.highlightColor); doc.rect(15, y - 4, 3, 8, "F"); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(title, 22, y + 2); doc.setFont("helvetica", "normal"); y += 12; };
  const text = (label: string, value?: string | number | null) => { const lines = doc.splitTextToSize(`${label}: ${safe(value)}`, 178); if (y + lines.length * 6 > 277) page(); doc.setFontSize(10); doc.text(lines, 16, y); y += lines.length * 6 + 3; };
  header(); doc.setFontSize(26); doc.setFont("helvetica", "bold"); doc.text("7Protect", 15, 35); doc.setFontSize(18); doc.text("Proposta de Proteção Financeira", 15, 47); doc.setFont("helvetica", "normal"); doc.setFontSize(11); y = 66;
  text("Cliente", client.name); text("Planejamento", planning.name); text("Versão", `v${proposal.number}`); text("Data de geração", date(report.generated.value.generatedAt));
  section("Objetivos do planejamento"); text("Objetivos", String(report.diagnosis.value.goals ?? planning.observation)); text("Prioridades", analysis?.priorities); text("Planejamento da corretora", analysis?.recommendations ?? analysis?.summary);
  section("Proposta de proteção"); for (const coverage of report.coverages.value) { text(coverage.label, `${safe(coverage.objective)} · Capital segurado ${money(coverage.insuredCapital)} · Prêmio mensal ${money(coverage.monthlyPremium)} · ${safe(coverage.term)}`); }
  section("Resumo financeiro"); text("Prêmio mensal", money(proposal.totalMonthly)); text("Prêmio anual", money(proposal.totalAnnual)); text("Capital segurado total", money(proposal.totalProtectedCapital)); text("Percentual da renda comprometida", `${proposal.incomeCommitment}%`);
  section("Contato"); text("Corretora", brand.clientName); text("Telefone", brand.phone); text("E-mail", brand.email); text("Endereço", brand.address);
  const pageCount = doc.getNumberOfPages(); for (let index = 1; index <= pageCount; index++) { doc.setPage(index); doc.setFontSize(8); doc.setTextColor(90, 110, 130); doc.text(`Proposta v${proposal.number} · ${brand.clientName} · ${index}/${pageCount}`, 15, 289); }
  doc.save(`Proposta_${client.name.replaceAll(" ", "_")}_v${proposal.number}.pdf`);
}
