"use client";

import { useState } from "react";
import { seedDemoData, setupFoundation } from "@/application/foundation-service";
import { useFoundation } from "@/components/foundation-provider";

export function Onboarding() {
  const { ready, settings, refresh } = useFoundation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!ready || settings) return null;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(null); try { await setupFoundation({ clientName: name, primaryColor: "#173f6b", highlightColor: "#4fc3a1", phone: "", email }); await seedDemoData(); await refresh(); } catch (reason) { console.error("Não foi possível concluir o onboarding do 7Protect.", reason); setError("Não foi possível preparar os dados locais. Verifique o armazenamento do navegador e tente novamente."); } finally { setBusy(false); } };
  return <div className="onboarding-overlay"><form className="onboarding-card" onSubmit={submit}><p className="eyebrow">PRIMEIRO ACESSO</p><h2>Configure sua corretora</h2><p>O 7Protect funciona localmente neste dispositivo. Você poderá completar logo, cores e dados institucionais depois.</p><label>Nome da corretora<input value={name} onChange={(event) => { setName(event.target.value); setError(null); }} required autoFocus /></label><label>E-mail de contato<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(null); }} required /></label>{error ? <p className="onboarding-error" role="alert">{error}</p> : null}<button className="button primary" disabled={busy}>{busy ? "Preparando..." : "Começar com dados demo"}</button></form></div>;
}
