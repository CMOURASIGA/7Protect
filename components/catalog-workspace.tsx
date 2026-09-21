"use client";

import { useCallback, useEffect, useState } from "react";
import { catalogWorkspace } from "@/application/planning-service";
import { CatalogMaintenance } from "@/components/catalog-maintenance";

type Catalog = Awaited<ReturnType<typeof catalogWorkspace>>;

export function CatalogWorkspace() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try { setError(""); setCatalog(await catalogWorkspace()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar o Catálogo."); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  return <div className="page planning-page">
    <section className="hero"><div><p className="eyebrow">CATÁLOGO</p><h2>Dados mestres de seguros</h2><p>Gerencie seguradoras, produtos e tipos de cobertura em um único local. Propostas apenas consultam estes dados.</p></div></section>
    {error ? <section className="card empty-state"><h3>Catálogo indisponível</h3><p>{error}</p></section> : null}
    {catalog ? <CatalogMaintenance catalog={catalog} onUpdated={refresh} /> : !error ? <section className="card empty-state"><h3>Carregando catálogo</h3><p>Buscando os dados cadastrados pela corretora.</p></section> : null}
  </div>;
}
