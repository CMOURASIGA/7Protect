"use client";

import { useState } from "react";
import { setupFoundation } from "@/application/foundation-service";
import { useFoundation } from "@/components/foundation-provider";
import { toClientBrandSettings, type ClientBrandSettings } from "@/lib/brand-settings";

export function SettingsForm() {
  const { settings, refresh } = useFoundation();
  const key = settings ? `${settings.id}:${settings.updatedAt}` : "loading";
  return <SettingsFormFields key={key} initialForm={toClientBrandSettings(settings)} refresh={refresh} />;
}

function SettingsFormFields({ initialForm, refresh }: { initialForm: ClientBrandSettings; refresh: () => Promise<void> }) {
  const [form, setForm] = useState<ClientBrandSettings>(initialForm);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof ClientBrandSettings, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      await setupFoundation(form);
      await refresh();
      setSaved(true);
    } catch {
      setError("Não foi possível salvar a marca da corretora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page settings-page">
      <section className="hero settings-hero">
        <div>
          <p className="eyebrow">WHITELABEL</p>
          <h2>Marca da corretora</h2>
          <p>As alterações são aplicadas imediatamente no dispositivo e não exigem rebuild.</p>
        </div>
      </section>

      <form className="form card settings-form" onSubmit={submit}>
        <label>
          Nome da corretora
          <input value={form.clientName} onChange={(event) => update("clientName", event.target.value)} required />
        </label>
        <label>
          URL da logo
          <input value={form.logoUrl} onChange={(event) => update("logoUrl", event.target.value)} placeholder="https://..." type="url" />
        </label>
        <div className="two">
          <label>
            Cor principal
            <input aria-label="Cor principal" type="color" value={form.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} />
          </label>
          <label>
            Cor de destaque
            <input aria-label="Cor de destaque" type="color" value={form.highlightColor} onChange={(event) => update("highlightColor", event.target.value)} />
          </label>
        </div>
        <div className="two">
          <label>
            Telefone
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} inputMode="tel" />
          </label>
          <label>
            E-mail
            <input value={form.email} onChange={(event) => update("email", event.target.value)} type="email" required />
          </label>
        </div>
        <label>
          Endereço opcional
          <input value={form.address} onChange={(event) => update("address", event.target.value)} />
        </label>
        <div className="settings-actions">
          <button className="button primary" disabled={busy}>{busy ? "Salvando..." : "Salvar configurações"}</button>
          {saved ? <span className="saved" role="status">Configurações salvas no IndexedDB.</span> : null}
          {error ? <span className="form-error" role="alert">{error}</span> : null}
        </div>
      </form>
    </div>
  );
}
