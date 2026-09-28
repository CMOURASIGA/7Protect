"use client";

import { useState, type FormEvent } from "react";
import { CrudDrawer } from "@/components/crud-drawer";
import type { Coverage, ProposalVersion } from "@/domains/core/entities";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));

export function ProposalDrawer({ proposal, planningReferenceDate, coverages, insurerName, productName, onClose, onSave, onManageCoverage, onDuplicate, onPresent }: { proposal: ProposalVersion; planningReferenceDate: string; coverages: Coverage[]; insurerName?: string; productName?: string; onClose: () => void; onSave: (input: { revisionReason: string; generalNote: string }) => Promise<void>; onManageCoverage: () => void; onDuplicate: () => Promise<void>; onPresent: () => Promise<void> }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingPresentation, setConfirmingPresentation] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSaving(true);
    const form = new FormData(event.currentTarget);
    try { await onSave({ revisionReason: String(form.get("revisionReason") ?? ""), generalNote: String(form.get("generalNote") ?? "") }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a versão."); }
    finally { setSaving(false); }
  };

  const confirmPresentation = async () => {
    setError(""); setPresenting(true);
    try { await onPresent(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível apresentar a versão."); setPresenting(false); }
  };

  return <CrudDrawer title={`Editar proposta v${proposal.number}`} description="A manutenção ocorre apenas enquanto a versão está em rascunho. Apresentar a versão preserva seus dados e coberturas." onClose={onClose} size="wide">
    <form className="crud-form" onSubmit={submit}>
      <section className="crud-form-section"><h3>Identificação da versão</h3><div className="crud-form-grid">
        <label className="crud-field">Versão<input value={`v${proposal.number}`} readOnly /></label>
        <label className="crud-field">Status<input value="Rascunho" readOnly /></label>
        <label className="crud-field">Data de referência<input value={date(planningReferenceDate)} readOnly /></label>
        <label className="crud-field">Data de apresentação<input value="Ainda não apresentada" readOnly /></label>
        <label className="crud-field full">Identificação ou motivo da versão<input name="revisionReason" defaultValue={proposal.revisionReason} /></label>
      </div></section>
      <section className="crud-form-section"><h3>Resumo financeiro</h3><div className="crud-form-grid">
        <label className="crud-field">Prêmio mensal<input value={money(proposal.totalMonthly)} readOnly /></label>
        <label className="crud-field">Capital protegido<input value={money(proposal.totalProtectedCapital)} readOnly /></label>
        <label className="crud-field">Seguradora predominante<input value={insurerName ?? "Definida nas coberturas"} readOnly /></label>
        <label className="crud-field">Produto predominante<input value={productName ?? "Definido nas coberturas"} readOnly /></label>
      </div></section>
      <section className="crud-form-section"><h3>Observações</h3><label className="crud-field">Observações gerais da proposta<textarea name="generalNote" defaultValue={proposal.generalNote} /></label></section>
      <section className="crud-form-section"><div className="section-heading"><div><h3>Coberturas</h3><p>{coverages.length ? `${coverages.length} registro(s) nesta versão.` : "Nenhuma cobertura cadastrada."}</p></div><button type="button" className="button secondary" onClick={onManageCoverage}>Gerenciar coberturas</button></div>{coverages.length ? <div className="proposal-coverage-summary">{coverages.map((coverage) => <p key={coverage.id}>{coverage.label} · {money(coverage.monthlyPremium ?? 0)}/mês · {money(coverage.insuredCapital ?? 0)}</p>)}</div> : null}</section>
      {error ? <p className="notice" role="alert">{error}</p> : null}
      <section className="crud-form-section"><h3>Ações da versão</h3><p>Duplicar cria uma nova versão em rascunho. Apresentar bloqueia esta versão para alterações futuras.</p><div className="planning-actions"><button type="button" className="button secondary" disabled={presenting} onClick={() => void onDuplicate()}>Duplicar versão</button><button type="button" className="button primary" disabled={presenting} onClick={() => setConfirmingPresentation(true)}>Marcar apresentada</button></div></section>
      {confirmingPresentation ? <section className="notice" role="alert"><strong>Marcar versão como apresentada?</strong><p>A versão e as coberturas ficarão protegidas contra alterações. Para modificar a proposta depois, crie uma nova versão.</p><div className="crud-actions"><button type="button" className="button secondary" disabled={presenting} onClick={() => setConfirmingPresentation(false)}>Continuar editando</button><button type="button" className="button primary" disabled={presenting} onClick={() => void confirmPresentation()}>{presenting ? "Apresentando..." : "Confirmar apresentação"}</button></div></section> : null}
      <footer className="crud-actions"><button type="button" className="button secondary" onClick={onClose} disabled={presenting}>Cancelar</button><button className="button primary" disabled={saving || presenting}>{saving ? "Salvando..." : "Salvar versão"}</button></footer>
    </form>
  </CrudDrawer>;
}
