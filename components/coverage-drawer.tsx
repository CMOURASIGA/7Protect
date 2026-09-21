"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CrudDrawer } from "@/components/crud-drawer";
import type { Coverage, InsuranceProduct, ProposalVersion } from "@/domains/core/entities";

type CatalogItem = { id: string; name: string; active: boolean };
type Catalog = { insurers: CatalogItem[]; products: InsuranceProduct[]; coverageTypes: CatalogItem[] };
type CoverageInput = Omit<Partial<Coverage>, "id"> & { id?: string; label: string };

export function CoverageDrawer({ proposal, coverage, catalog, onClose, onSave, onRemove, onMove }: { proposal: ProposalVersion; coverage?: Coverage; catalog: Catalog; onClose: () => void; onSave: (input: CoverageInput) => Promise<void>; onRemove?: () => Promise<void>; onMove?: (direction: "up" | "down") => Promise<void> }) {
  const [insurerId, setInsurerId] = useState(coverage?.insurerId ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const availableProducts = useMemo(() => catalog.products.filter((product) => product.insurerId === insurerId && (product.active || product.id === coverage?.productId)), [catalog.products, coverage?.productId, insurerId]);
  const insurers = catalog.insurers.filter((insurer) => insurer.active || insurer.id === coverage?.insurerId);
  const coverageTypes = catalog.coverageTypes.filter((type) => type.active || type.name === coverage?.coverageType);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await onSave({ id: coverage?.id, label: String(form.get("label") ?? ""), insurerId: String(form.get("insurerId") || "") || undefined, productId: String(form.get("productId") || "") || undefined, coverageType: String(form.get("coverageType") || "") || undefined, objective: String(form.get("objective") || "") || undefined, insuredCapital: Number(form.get("insuredCapital")) || 0, monthlyPremium: Number(form.get("monthlyPremium")) || 0, term: String(form.get("term") || "") || undefined, description: String(form.get("description") || "") || undefined, brokerNote: String(form.get("brokerNote") || "") || undefined, displayOrder: coverage?.displayOrder });
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a cobertura."); }
    finally { setSaving(false); }
  };

  return <CrudDrawer title={coverage ? "Editar cobertura" : "Adicionar cobertura"} description="A cobertura pertence apenas a esta versão em rascunho. Versões apresentadas e aceitas permanecem preservadas." onClose={onClose} size="wide">
    <form className="crud-form" onSubmit={submit}>
      <section className="crud-form-section"><h3>Vínculo com o Catálogo</h3><div className="crud-form-grid">
        <label className="crud-field">Seguradora<select name="insurerId" value={insurerId} onChange={(event) => setInsurerId(event.target.value)}><option value="">Selecione</option>{insurers.map((insurer) => <option key={insurer.id} value={insurer.id}>{insurer.name}</option>)}</select></label>
        <label className="crud-field">Produto<select name="productId" defaultValue={coverage?.productId} disabled={!insurerId}><option value="">{insurerId ? "Selecione" : "Selecione primeiro a seguradora"}</option>{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <label className="crud-field">Tipo de cobertura<select name="coverageType" defaultValue={coverage?.coverageType}><option value="">Selecione</option>{coverageTypes.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}</select></label>
        <label className="crud-field">Nome da cobertura<input name="label" required defaultValue={coverage?.label} /></label>
      </div></section>
      <section className="crud-form-section"><h3>Proteção e vigência</h3><div className="crud-form-grid">
        <label className="crud-field">Objetivo associado<input name="objective" defaultValue={coverage?.objective} /></label>
        <label className="crud-field">Prazo ou vigência<input name="term" defaultValue={coverage?.term} /></label>
        <label className="crud-field">Capital segurado<input name="insuredCapital" type="number" min="0" step="0.01" defaultValue={coverage?.insuredCapital} /></label>
        <label className="crud-field">Prêmio mensal<input name="monthlyPremium" type="number" min="0" step="0.01" defaultValue={coverage?.monthlyPremium} /></label>
      </div></section>
      <section className="crud-form-section"><h3>Detalhamento</h3><div className="crud-form-grid">
        <label className="crud-field full">Descrição<textarea name="description" defaultValue={coverage?.description} /></label>
        <label className="crud-field full">Observação interna<textarea name="brokerNote" defaultValue={coverage?.brokerNote} /></label>
      </div></section>
      {error ? <p className="notice" role="alert">{error}</p> : null}
      <footer className="crud-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button>{coverage && onRemove ? <button type="button" className="text-button" onClick={() => void onRemove()}>Remover</button> : null}{coverage && onMove ? <><button type="button" className="button secondary" onClick={() => void onMove("up")}>Subir</button><button type="button" className="button secondary" onClick={() => void onMove("down")}>Descer</button></> : null}<button className="button primary" disabled={saving}>{saving ? "Salvando..." : "Salvar cobertura"}</button></footer>
    </form>
  </CrudDrawer>;
}
