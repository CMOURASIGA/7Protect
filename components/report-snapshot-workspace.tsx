"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { generateDiagnosticPdfFromSnapshot } from "@/application/diagnostic-pdf-service";
import { historicalReportById, type DiagnosticReportPayload } from "@/application/report-history-service";
import type { ReportSnapshot } from "@/domains/core/entities";

const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function ReportSnapshotWorkspace({ snapshotId }: { snapshotId: string }) {
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null | undefined>(undefined); const [error, setError] = useState(""); const [downloading, setDownloading] = useState(false);
  useEffect(() => { void historicalReportById(snapshotId).then(setSnapshot).catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível abrir este relatório.")); }, [snapshotId]);
  if (error) return <div className="page"><section className="card empty-state"><h3>Relatório indisponível</h3><p>{error}</p></section></div>;
  if (snapshot === undefined) return <div className="page"><section className="card empty-state"><h3>Carregando relatório...</h3></section></div>;
  if (!snapshot) return <div className="page"><section className="card empty-state"><h3>Relatório não encontrado</h3><Link className="button primary" href="/relatorios">Voltar aos relatórios</Link></section></div>;
  if (snapshot.type === "commercial_proposal" && snapshot.proposalVersionId) return <div className="page"><section className="card empty-state"><h3>Documento comercial</h3><p>A apresentação e o PDF comercial são reproduzidos pela fotografia correspondente da proposta.</p><Link className="button primary" href={`/apresentacao/${snapshot.proposalVersionId}`}>Abrir apresentação</Link></section></div>;
  const payload = snapshot.payload as unknown as DiagnosticReportPayload;
  return <div className="page snapshot-page"><section className="hero"><div><p className="eyebrow">SNAPSHOT HISTÓRICO</p><h2>{payload.mode === "internal" ? "Diagnóstico interno" : "Diagnóstico do cliente"}</h2><p>{payload.client.name} · {payload.planning.name} · gerado em {date(snapshot.generatedAt)}</p></div><div className="quick-actions"><Link className="button secondary" href="/relatorios">Voltar</Link><button className="button primary" disabled={downloading} onClick={() => { setDownloading(true); void generateDiagnosticPdfFromSnapshot(snapshot).finally(() => setDownloading(false)); }}>{downloading ? "Preparando..." : "Baixar PDF"}</button></div></section><section className="reporting-grid"><article className="card"><p className="eyebrow">DADOS DECLARADOS</p><h3>Fotografia do diagnóstico</h3><dl className="client-facts">{Object.entries(payload.diagnostic).filter(([, value]) => value !== "" && value !== undefined).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl></article>{payload.mode === "internal" ? <article className="card"><p className="eyebrow">USO INTERNO</p><h3>Análise profissional</h3><dl className="client-facts">{Object.entries(payload.analysis ?? {}).filter(([, value]) => value !== "" && value !== undefined).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl></article> : <article className="card"><p className="eyebrow">DOCUMENTO DO CLIENTE</p><h3>Conteúdo protegido</h3><p>Esta visualização não inclui análise profissional nem notas internas.</p></article>}</section></div>;
}
