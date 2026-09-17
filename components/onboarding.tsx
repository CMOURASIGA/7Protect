"use client";

import { useState } from "react";
import { seedDemoData, setupFoundation } from "@/application/foundation-service";
import { useFoundation } from "@/components/foundation-provider";

export function Onboarding() {
  const { ready, settings, refresh } = useFoundation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  if (!ready || settings) return null;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); await setupFoundation({ clientName: name, primaryColor: "#173f6b", highlightColor: "#4fc3a1", phone: "", email }); await seedDemoData(); await refresh(); };
  return <div className="onboarding-overlay"><form className="onboarding-card" onSubmit={submit}><p className="eyebrow">PRIMEIRO ACESSO</p><h2>Configure sua corretora</h2><p>O 7Protect funciona localmente neste dispositivo. Você poderá completar logo, cores e dados institucionais depois.</p><label>Nome da corretora<input value={name} onChange={(event) => setName(event.target.value)} required autoFocus /></label><label>E-mail de contato<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><button className="button primary" disabled={busy}>{busy ? "Preparando..." : "Começar com dados demo"}</button></form></div>;
}
