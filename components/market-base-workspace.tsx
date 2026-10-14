"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommercialParameter, Contact, ProspectQualification } from "@/domains/core/entities";
import { commercialOverview, createCommercialContact, addToHot40 } from "@/application/commercial-service";
import { updateMarketContact, saveProspectQualification, type QualificationInput } from "@/application/market-base-service";
import { filterMarketContacts, qualificationState, type MarketFilters } from "@/domains/commercial/market-selectors";
import { PARAMETER_LABELS, QUALIFICATION_FIELDS, isValidQualification, originMonth, qualificationMissing } from "@/domains/commercial/qualification";
import { useFoundation } from "./foundation-provider";
import { CrudDrawer } from "./crud-drawer";
import { SafeForm } from "./commercial-form";

type Overview = Awaited<ReturnType<typeof commercialOverview>>;
const emptyFilters: MarketFilters = { search: "", qualification: "", stage: "", sourceId: "", originMonth: "" };
const stageLabels: Record<Contact["commercialStage"], string> = { market_base: "Mercado Base", hot40: "HOT40", opportunity: "Oportunidade", client: "Cliente" };
const statusLabels = { pending: "Pendente", qualified: "Qualificado", not_qualified: "Não qualificado" };
const monthLabel = (value?: string) => { const month = originMonth(value); return month ? `${month.slice(5)}/${month.slice(0, 4)}` : "Não informado"; };

function ContactDrawer({ contact, onClose, onSaved }: { contact?: Contact; onClose: () => void; onSaved: () => Promise<void> }) {
  return <CrudDrawer title={contact ? "Editar contato" : "Novo contato"} description="Comece pelo nome. Telefone e e-mail são opcionais. A qualificação vem depois, no mesmo cadastro." onClose={onClose}>
    <SafeForm action={async (form) => {
      const input = { fullName: String(form.get("fullName") || ""), phone: String(form.get("phone") || ""), email: String(form.get("email") || ""), notes: String(form.get("notes") || "") };
      if (contact) await updateMarketContact(contact.id, input); else await createCommercialContact(input);
      await onSaved(); onClose();
    }}>
      <section className="crud-form-section"><h3>Identificação e contato</h3><div className="crud-form-grid">
        <label className="crud-field full">Nome completo<input name="fullName" defaultValue={contact?.fullName} required autoFocus maxLength={180} /></label>
        <label className="crud-field">Telefone<input name="phone" defaultValue={contact?.phone} inputMode="tel" maxLength={30} /></label>
        <label className="crud-field">E-mail<input name="email" defaultValue={contact?.email} type="email" maxLength={180} /></label>
        <label className="crud-field full">Observações do contato<textarea name="notes" defaultValue={contact?.notes} maxLength={2000} /></label>
      </div></section>
      <footer className="crud-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary">{contact ? "Salvar contato" : "Criar contato"}</button></footer>
    </SafeForm>
  </CrudDrawer>;
}

function QualificationDrawer({ contact, qualification, parameters, onClose, onSaved }: { contact: Contact; qualification?: ProspectQualification; parameters: CommercialParameter[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<ProspectQualification["status"]>(qualificationState(qualification));
  return <CrudDrawer title={qualification ? "Editar qualificação" : "Qualificar contato"} description={`Complete o perfil de ${contact.fullName}. A decisão de qualificar é sua; não há pontuação automática.`} onClose={onClose} size="wide">
    <SafeForm action={async (form) => {
      const input: QualificationInput = { status, profession: String(form.get("profession") || ""), originDate: String(form.get("originDate") || ""), notes: String(form.get("notes") || ""), estimatedMonthlyIncome: form.get("estimatedMonthlyIncome") ? Number(form.get("estimatedMonthlyIncome")) : undefined };
      for (const [field] of QUALIFICATION_FIELDS) input[field] = String(form.get(field) || "") || undefined;
      await saveProspectQualification(contact.id, input); await onSaved(); onClose();
    }}>
      <section className="crud-form-section"><h3>Perfil comercial</h3><p className="market-hint">Para concluir como Qualificado, preencha todos os campos de seleção, profissão e data de origem. Você pode salvar parcialmente como Pendente.</p>
        <div className="crud-form-grid">{QUALIFICATION_FIELDS.map(([field, group]) => {
          const previous = qualification?.[field]; const options = parameters.filter((item) => item.group === group && (item.active || item.id === previous));
          return <label className="crud-field" key={field}>{PARAMETER_LABELS[group]}<select name={field} defaultValue={previous || ""} required={status === "qualified"}><option value="">Selecione</option>{options.map((item) => <option key={item.id} value={item.id}>{item.label}{item.active ? "" : " (inativo, valor anterior)"}</option>)}</select>{!options.length ? <span className="market-hint">Cadastre opções em Configurações.</span> : null}</label>;
        })}
          <label className="crud-field">Renda mensal estimada, valor opcional (R$)<input name="estimatedMonthlyIncome" type="number" step="0.01" min="0" defaultValue={qualification?.estimatedMonthlyIncome} /></label>
          <label className="crud-field">Profissão<input name="profession" defaultValue={qualification?.profession} required={status === "qualified"} maxLength={180} /></label>
          <label className="crud-field">Data de origem<input name="originDate" type="date" defaultValue={qualification?.originDate || contact.createdAt.slice(0, 10)} required={status === "qualified"} /><span className="market-hint">O mês de origem é calculado a partir desta data.</span></label>
        </div>
      </section>
      <section className="crud-form-section"><h3>Decisão da qualificação</h3><label className="crud-field">Resultado<select name="status" value={status} onChange={(event) => setStatus(event.target.value as ProspectQualification["status"])}><option value="pending">Pendente</option><option value="qualified">Qualificado</option><option value="not_qualified">Não qualificado</option></select></label><label className="crud-field">Observações da qualificação<textarea name="notes" defaultValue={qualification?.notes} maxLength={2000} /></label>{contact.commercialStage === "hot40" ? <p className="market-hint">Alterar para Pendente ou Não qualificado encerra a participação atual no HOT40 e preserva seu histórico.</p> : null}</section>
      <footer className="crud-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary">Salvar qualificação</button></footer>
    </SafeForm>
  </CrudDrawer>;
}

export function MarketBaseWorkspace() {
  const { ready, settings } = useFoundation(); const [data, setData] = useState<Overview | null>(null); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busyId, setBusyId] = useState<string | null>(null);
  const [filters, setFilters] = useState<MarketFilters>(emptyFilters); const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<{ kind: "contact" | "qualification"; contact?: Contact } | null>(null);
  const reload = useCallback(async () => { setData(await commercialOverview()); }, []);
  useEffect(() => { if (!ready || !settings) return; let cancelled = false; commercialOverview().then((result) => { if (!cancelled) setData(result); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os contatos."); }); return () => { cancelled = true; }; }, [ready, settings]);
  const byContact = useMemo(() => new Map(data?.qualifications.map((item) => [item.contactId, item]) || []), [data]);
  const labels = useMemo(() => new Map(data?.parameters.map((item) => [item.id, item.label]) || []), [data]);
  const filtered = useMemo(() => data ? filterMarketContacts(data.contacts, data.qualifications, data.parameters, filters) : [], [data, filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20)); const currentPage = Math.min(page, totalPages); const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const updateFilter = (key: keyof MarketFilters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const saved = async () => { await reload(); setError(""); setNotice("Dados salvos neste dispositivo."); };
  const addHot = async (person: Contact) => { if (busyId) return; setBusyId(person.id); setError(""); setNotice(""); try { await addToHot40(person.id); await reload(); setNotice(`${person.fullName} foi adicionado ao HOT40.`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível incluir no HOT40."); } finally { setBusyId(null); } };
  return <div className="page commercial-page market-page">
    <section className="hero"><div><p className="eyebrow">MERCADO BASE</p><h2>Conheça sua base. Escolha quem abordar.</h2><p>Cadastre o contato, complete o perfil e decida quando levá-lo ao HOT40.</p></div><button className="button primary" disabled={!data} onClick={() => setDrawer({ kind: "contact" })}>Novo contato</button></section>
    {notice ? <p className="market-feedback" role="status">{notice}</p> : null}{error ? <div className="market-error" role="alert">{error}{!data ? <button className="button secondary" onClick={() => { void reload().then(() => setError("")).catch(() => setError("Não foi possível carregar os contatos. Tente novamente.")); }}>Tentar novamente</button> : null}</div> : null}
    {data ? <>
      <div className="market-overview" aria-label="Resumo da base">{(["pending", "qualified", "not_qualified"] as const).map((status) => <button key={status} className={filters.qualification === status ? "active" : ""} onClick={() => updateFilter("qualification", filters.qualification === status ? "" : status)}><span>{statusLabels[status]}</span><b>{data.contacts.filter((item) => qualificationState(byContact.get(item.id)) === status).length}</b></button>)}</div>
      <section className="card market-filters" aria-label="Busca e filtros"><label className="market-search">Buscar contato<input type="search" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Nome, telefone, e-mail ou profissão" /></label>
        <label>Qualificação<select value={filters.qualification} onChange={(event) => updateFilter("qualification", event.target.value)}><option value="">Todas</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Etapa<select value={filters.stage} onChange={(event) => updateFilter("stage", event.target.value)}><option value="">Todas</option>{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Fonte de prospecção<select value={filters.sourceId} onChange={(event) => updateFilter("sourceId", event.target.value)}><option value="">Todas</option>{data.parameters.filter((item) => item.group === "source").map((item) => <option key={item.id} value={item.id}>{item.label}{item.active ? "" : " (inativo)"}</option>)}</select></label>
        <label>Mês de origem<input type="month" value={filters.originMonth} onChange={(event) => updateFilter("originMonth", event.target.value)} /></label>
        <button className="button secondary" onClick={() => { setFilters(emptyFilters); setPage(1); }}>Limpar filtros</button>
      </section>
      <section className="commercial-list card"><div className="commercial-list-head"><h3>Seus contatos</h3><span>{filtered.length} de {data.contacts.length}</span></div>
        {visible.map((person) => { const qualification = byContact.get(person.id); const state = qualificationState(qualification); return <article className="commercial-row market-row" key={person.id}><div className="market-person"><b>{person.fullName}</b><p>{person.phone || "Telefone não informado"}{person.email ? ` · ${person.email}` : ""}</p><div className="commercial-pills"><span className={`qualification-${state}`}>{statusLabels[state]}</span><span>{stageLabels[person.commercialStage]}</span></div><div className="market-details"><span>{labels.get(qualification?.sourceId || "") || person.origin || "Fonte a informar"}</span><span>{qualification?.profession || "Profissão a informar"}</span><span>Origem: {monthLabel(qualification?.originDate)}</span></div>{state === "pending" ? <p className="market-hint">{qualificationMissing(qualification).length ? "Complete o perfil para concluir a qualificação." : "Perfil preenchido. Revise e decida a qualificação."}</p> : null}</div><div className="commercial-actions"><button className="button secondary" onClick={() => setDrawer({ kind: "contact", contact: person })}>Editar contato</button><button className="button secondary" onClick={() => setDrawer({ kind: "qualification", contact: person })}>{qualification ? "Editar qualificação" : "Qualificar"}</button>{isValidQualification(qualification) && !["hot40", "client"].includes(person.commercialStage) ? <button className="button primary" disabled={Boolean(busyId)} onClick={() => { void addHot(person); }}>{busyId === person.id ? "Adicionando..." : "Adicionar ao HOT40"}</button> : null}{person.commercialStage === "hot40" ? <Link className="button secondary" href="/hot40">Abrir HOT40</Link> : null}</div></article>; })}
        {!visible.length ? <div className="empty"><h3>{data.contacts.length ? "Nenhum contato encontrado" : "Sua base começa com uma pessoa"}</h3><p>{data.contacts.length ? "Ajuste a busca ou limpe os filtros." : "Cadastre o primeiro contato e complete a qualificação quando tiver as informações."}</p></div> : null}
      </section>
      {totalPages > 1 ? <nav className="market-pagination" aria-label="Páginas de contatos"><button className="button secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>Página {currentPage} de {totalPages}</span><button className="button secondary" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Próxima</button></nav> : null}
    </> : !error ? <div className="card empty" role="status">Carregando Mercado Base...</div> : null}
    {drawer?.kind === "contact" ? <ContactDrawer contact={drawer.contact} onClose={() => setDrawer(null)} onSaved={saved} /> : null}
    {drawer?.kind === "qualification" && drawer.contact && data ? <QualificationDrawer contact={drawer.contact} qualification={byContact.get(drawer.contact.id)} parameters={data.parameters} onClose={() => setDrawer(null)} onSaved={saved} /> : null}
  </div>;
}
