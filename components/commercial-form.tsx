"use client";
import { useState } from "react";
export function SafeForm({ action, children }: { action: (form: FormData) => Promise<void>; children: React.ReactNode }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return <form className="crud-form" onSubmit={async (event) => {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try { await action(form); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar. Tente novamente."); } finally { setSaving(false); }
  }}><fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "grid", gap: 18 }}>{children}</fieldset>{saving ? <p role="status">Salvando...</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}</form>;
}

