"use client";
import Link from "next/link";
import { useState } from "react";
import { answerCommercialQuestion, COMMERCIAL_QUESTIONS, matchCommercialQuestion, readCommercialMetisInput, type CommercialAnswer, type CommercialQuestion } from "@/application/metis-commercial";

export function MetisCommercial({ contactId }: { contactId?: string }) {
  const [answer, setAnswer] = useState<CommercialAnswer | null>(null);
  const [question, setQuestion] = useState<CommercialQuestion>(contactId ? "contact_attention" : "today");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const ask = async (selected = question) => {
    try {
      setBusy(true); setError("");
      const input = await readCommercialMetisInput();
      setAnswer(answerCommercialQuestion(input, selected, contactId));
      setQuestion(selected);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível responder agora."); }
    finally { setBusy(false); }
  };
  return <section className="card metis-commercial" aria-labelledby="metis-commercial-title">
    <div className="metis-commercial-heading"><div><p className="eyebrow">METIS COMERCIAL</p><h3 id="metis-commercial-title">Pergunte sobre sua operação</h3><p>Respostas baseadas na Agenda, Central, HOT40 e Dashboard. Os fatos comerciais não são alterados.</p></div><span className="metis-badge">Leitura explicável</span></div>
    <div className="metis-commercial-questions" role="group" aria-label="Perguntas para Metis Comercial">{COMMERCIAL_QUESTIONS.filter(([key]) => key !== "contact_attention" || contactId).map(([key, label]) => <button key={key} type="button" className={`button secondary ${question === key && answer ? "active" : ""}`} disabled={busy} onClick={() => void ask(key)}>{label}</button>)}</div>
    <form className="metis-commercial-input" onSubmit={(event) => { event.preventDefault(); const matched = matchCommercialQuestion(draft, Boolean(contactId)); if (!matched) { setError("Ainda não respondo a essa pergunta. Escolha um dos temas disponíveis."); return; } void ask(matched); }}><label htmlFor={`metis-commercial-question-${contactId || "general"}`}>Sua pergunta</label><div><input id={`metis-commercial-question-${contactId || "general"}`} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ex.: O que preciso fazer hoje?" maxLength={180} /><button className="button primary" disabled={busy || !draft.trim()}>Perguntar</button></div></form>
    {busy ? <p role="status">Conferindo os fatos comerciais...</p> : null}
    {error ? <p role="alert" className="form-error">{error} A Agenda e o Dashboard continuam disponíveis.</p> : null}
    {answer ? <div className="metis-commercial-answer" aria-live="polite"><div className="metis-commercial-heading"><div><h4>{answer.summary}</h4><small>Atualizado em {new Date(answer.asOf).toLocaleString("pt-BR", { timeZone: answer.scope.timezone })} · Semana {answer.scope.week} de {String(answer.scope.month).padStart(2, "0")}/{answer.scope.year} · São Paulo · Todos os consultores e origens</small></div><button type="button" className="button secondary" disabled={busy} onClick={() => void ask()}>Atualizar leitura</button></div>
      {answer.items.length ? <ol className="metis-commercial-items">{answer.items.map((item) => <li key={item.factRefs.join("|")}><p>{item.explanation}</p><small>Fonte: {item.factRefs.map((ref) => answer.evidence.find((fact) => fact.ref === ref)?.source).join(", ")}</small>{item.action ? <Link className="button secondary" href={item.action.href}>{item.action.label}</Link> : null}</li>)}</ol> : <p>Não há registros deste tipo no período da leitura.</p>}
      {answer.limitations.map((note) => <p className="metis-commercial-note" key={note}>{note}</p>)}
      <p className="metis-commercial-note">Metis recomenda. Somente você pode registrar ou alterar uma ação comercial.</p>
    </div> : <p>Escolha uma pergunta para consultar os dados atuais.</p>}
  </section>;
}
