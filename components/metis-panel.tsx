"use client";
import { useEffect, useState } from "react";
import { analyzeWithMetis, isMetisEnabled, listMetisAnalyses, metisTechnicalEvidence } from "@/application/metis-service";
import { analysisLabel, failingMetisProvider } from "@/application/metis-providers";
import type { MetisAnalysisType, AiAnalysis, ProposalVersion } from "@/domains/core/entities";

const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const actionLabel: Record<MetisAnalysisType, string> = { diagnostic: "Analisar diagnóstico", proposal_review: "Revisar proposta", meeting_questions: "Preparar próxima reunião" };

export function MetisPanel({ clientId, proposal, proposals = [] }: { clientId: string; proposal?: ProposalVersion; proposals?: ProposalVersion[] }) {
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]);
  const [busy, setBusy] = useState<MetisAnalysisType | null>(null);
  const [error, setError] = useState("");
  const [technicalEvidence, setTechnicalEvidence] = useState("");
  const [selectedProposalId, setSelectedProposalId] = useState(proposal?.id ?? "");
  const enabled = isMetisEnabled();
  const selectedProposal = proposals.find((item) => item.id === selectedProposalId) ?? proposal;
  const refresh = async () => setAnalyses(await listMetisAnalyses(clientId));
  useEffect(() => { let active = true; void listMetisAnalyses(clientId).then((items) => { if (active) setAnalyses(items); }); return () => { active = false; }; }, [clientId]);
  const run = async (analysisType: MetisAnalysisType) => {
    setBusy(analysisType); setError("");
    try { await analyzeWithMetis(clientId, analysisType, analysisType === "proposal_review" ? selectedProposal?.id : undefined); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "A Metis não conseguiu concluir esta ação."); await refresh(); }
    finally { setBusy(null); }
  };
  const simulateFailure = async () => {
    setBusy("diagnostic"); setError("");
    try { await analyzeWithMetis(clientId, "diagnostic", undefined, failingMetisProvider); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Falha simulada."); await refresh(); }
    finally { setBusy(null); }
  };
  const inspectEvidence = async () => {
    setError("");
    try { setTechnicalEvidence(JSON.stringify(await metisTechnicalEvidence(clientId, "diagnostic"), null, 2)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível verificar a sanitização."); }
  };
  const last = analyses.find((item) => item.status === "complete");
  return <section className="card metis-panel">
    <div className="metis-head"><div><p className="eyebrow">METIS</p><h3>Assistente de Planejamento</h3><p>Analisa diagnósticos, revisa propostas e sugere perguntas para apoiar o planejamento de proteção financeira.</p><p>Usa IA com dados minimizados e exige revisão profissional da corretora.</p></div><span className="metis-badge">Apoio ao corretor</span></div>
    {enabled ? <><div className="metis-actions">{(["diagnostic", "proposal_review", "meeting_questions"] as MetisAnalysisType[]).map((type) => <button key={type} className="button secondary" disabled={Boolean(busy) || (type === "proposal_review" && !selectedProposal)} onClick={() => run(type)}>{busy === type ? "Processando..." : actionLabel[type]}</button>)}</div>{proposals.length > 1 ? <label className="field metis-proposal-select">Versão para revisar<select value={selectedProposal?.id ?? ""} onChange={(event) => setSelectedProposalId(event.target.value)} disabled={Boolean(busy)}>{proposals.map((item) => <option key={item.id} value={item.id}>Proposta v{item.number} · {item.status}</option>)}</select></label> : null}</> : <p className="metis-empty">A Metis está desabilitada neste ambiente. O histórico permanece disponível e o restante do sistema continua funcionando.</p>}
    <details className="metis-validation"><summary>Validação técnica</summary><div><button className="button secondary" disabled={Boolean(busy)} onClick={inspectEvidence}>Verificar dados minimizados</button>{enabled ? <button className="button secondary" disabled={Boolean(busy)} onClick={simulateFailure}>Simular falha da Metis</button> : null}</div>{technicalEvidence ? <pre>{technicalEvidence}</pre> : <p>A evidência exibe somente a política aplicada e o fingerprint, nunca o conteúdo do cliente.</p>}</details>
    {error ? <p className="form-error" role="alert">{error} {enabled ? "Você pode tentar novamente." : "Ative a Metis quando for apropriado."} O CRM, diagnóstico e proposta não foram alterados.</p> : null}
    {last?.structuredResult ? <MetisResult analysis={last} /> : <p className="metis-empty">Ainda não há análise salva para este cliente.</p>}
    <MetisHistory analyses={analyses} />
  </section>;
}

function MetisHistory({ analyses }: { analyses: AiAnalysis[] }) {
  if (!analyses.length) return null;
  return <details className="metis-validation"><summary>Histórico das análises ({analyses.length})</summary><div className="metis-history">{analyses.map((analysis) => <article key={analysis.id}><strong>{analysisLabel[analysis.analysisType]}</strong><span>{date(analysis.createdAt)} · {analysis.status === "complete" ? "Concluída" : "Falhou"}</span><span>{analysis.provider}/{analysis.model}{analysis.proposalVersionId ? " · versão vinculada" : ""}</span><span>Fingerprint: {analysis.inputFingerprint}</span>{analysis.usage?.totalTokens ? <span>Uso: {analysis.usage.totalTokens} tokens</span> : null}{analysis.durationMs !== undefined ? <span>Tempo: {analysis.durationMs} ms</span> : null}{analysis.status === "failed" ? <span>{analysis.errorMessage}{analysis.retryable ? " · nova tentativa disponível" : ""}</span> : null}</article>)}</div></details>;
}

function MetisResult({ analysis }: { analysis: AiAnalysis }) { const result = analysis.structuredResult!; return <div className="metis-result"><div className="metis-result-title"><strong>{analysisLabel[analysis.analysisType]}</strong><span>{date(analysis.createdAt)} · {analysis.provider}/{analysis.model}</span></div><article><h4>Resumo</h4><p>{result.summary}</p></article><MetisList title="Pontos de atenção" items={result.attentionPoints} /><MetisList title="Temas de proteção a avaliar" items={result.protectionTopics} /><MetisList title="Perguntas recomendadas" items={result.questions} /><MetisList title="Informações faltantes" items={result.missingInformation} empty="Nenhuma lacuna identificada nesta análise." />{result.proposalReview ? <><MetisList title="Itens aderentes da proposta" items={result.proposalReview.alignedItems} /><MetisList title="Pontos para revisão da proposta" items={result.proposalReview.reviewItems} /></> : null}<p className="metis-disclaimer">{result.disclaimer}</p></div>; }
function MetisList({ title, items, empty }: { title: string; items: string[]; empty?: string }) { return <article><h4>{title}</h4>{items.length ? <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul> : <p>{empty ?? "A Metis não adicionou itens nesta seção."}</p>}</article>; }
