"use client";

import { useEffect, useState } from "react";
import { analyzeWithAegis, listAegisAnalyses, sanitizedAegisContext } from "@/application/aegis-service";
import { analysisLabel, failingAegisProvider } from "@/application/aegis-providers";
import type { AegisAnalysisType, AiAnalysis, ProposalVersion } from "@/domains/core/entities";

const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export function AegisPanel({ clientId, proposal }: { clientId: string; proposal?: ProposalVersion }) {
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]); const [busy, setBusy] = useState<AegisAnalysisType | null>(null); const [error, setError] = useState(""); const [payloadPreview, setPayloadPreview] = useState("");
  const refresh = async () => setAnalyses(await listAegisAnalyses(clientId));
  useEffect(() => { let active = true; void listAegisAnalyses(clientId).then((items) => { if (active) setAnalyses(items); }); return () => { active = false; }; }, [clientId]);
  const run = async (analysisType: AegisAnalysisType) => {
    setBusy(analysisType); setError("");
    try { await analyzeWithAegis(clientId, analysisType, analysisType === "proposal_review" ? proposal?.id : undefined); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "A Aegis não conseguiu concluir esta ação."); await refresh(); }
    finally { setBusy(null); }
  };
  const simulateFailure = async () => { setBusy("diagnostic"); setError(""); try { await analyzeWithAegis(clientId, "diagnostic", undefined, failingAegisProvider); } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha simulada."); await refresh(); } finally { setBusy(null); } };
  const inspectPayload = async () => { setError(""); try { setPayloadPreview(JSON.stringify(await sanitizedAegisContext(clientId, "diagnostic"), null, 2)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível preparar o contexto sanitizado."); } };
  const last = analyses.find((item) => item.status === "complete");
  return <section className="card aegis-panel"><div className="aegis-head"><div><p className="eyebrow">AEGIS</p><h3>Assistente de análise</h3><p>Usa IA com dados minimizados. Toda conclusão exige revisão profissional da corretora.</p></div><span className="aegis-badge">Apoio ao corretor</span></div><div className="aegis-actions"><button className="button secondary" disabled={Boolean(busy)} onClick={() => run("diagnostic")}>{busy === "diagnostic" ? "Analisando..." : "Analisar diagnóstico"}</button><button className="button secondary" disabled={Boolean(busy) || !proposal} onClick={() => run("proposal_review")}>{busy === "proposal_review" ? "Revisando..." : "Revisar proposta"}</button><button className="button secondary" disabled={Boolean(busy)} onClick={() => run("meeting_questions")}>{busy === "meeting_questions" ? "Preparando..." : "Gerar perguntas"}</button></div><details className="aegis-validation"><summary>Validação técnica</summary><div><button className="button secondary" disabled={Boolean(busy)} onClick={inspectPayload}>Inspecionar payload minimizado</button><button className="button secondary" disabled={Boolean(busy)} onClick={simulateFailure}>Simular falha da Aegis</button></div>{payloadPreview ? <pre>{payloadPreview}</pre> : null}</details>{error ? <p className="form-error" role="alert">{error} Você pode tentar novamente. O CRM, diagnóstico e proposta não foram alterados.</p> : null}{last?.structuredResult ? <AegisResult analysis={last} /> : <p className="aegis-empty">Ainda não há análise salva para este cliente.</p>}{analyses.some((item) => item.status === "failed") ? <p className="aegis-failure">Há uma tentativa com falha registrada sem alteração dos dados do cliente.</p> : null}</section>;
}

function AegisResult({ analysis }: { analysis: AiAnalysis }) {
  const result = analysis.structuredResult!;
  return <div className="aegis-result"><div className="aegis-result-title"><strong>{analysisLabel[analysis.analysisType]}</strong><span>{date(analysis.createdAt)} · {analysis.provider}/{analysis.model}</span></div><article><h4>Resumo</h4><p>{result.summary}</p></article><AegisList title="Pontos de atenção" items={result.attentionPoints} /><AegisList title="Temas de proteção a avaliar" items={result.protectionTopics} /><AegisList title="Perguntas recomendadas" items={result.questions} /><AegisList title="Informações faltantes" items={result.missingInformation} empty="Nenhuma lacuna identificada nesta análise." />{result.proposalReview ? <><AegisList title="Itens aderentes da proposta" items={result.proposalReview.alignedItems} /><AegisList title="Pontos para revisão da proposta" items={result.proposalReview.reviewItems} /></> : null}<p className="aegis-disclaimer">{result.disclaimer}</p></div>;
}

function AegisList({ title, items, empty }: { title: string; items: string[]; empty?: string }) { return <article><h4>{title}</h4>{items.length ? <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul> : <p>{empty ?? "A Aegis não adicionou itens nesta seção."}</p>}</article>; }
