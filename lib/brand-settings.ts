import type { BrandSettings } from "@/domains/core/entities";

/**
 * Shared whitelabel contract. It intentionally has no storage concern:
 * 7Protect persists this domain data through the configured repository.
 */
export type ClientBrandSettings = {
  clientName: string;
  logoUrl: string;
  primaryColor: string;
  highlightColor: string;
  phone: string;
  email: string;
  address: string;
};

export const DEFAULT_CLIENT_BRAND: ClientBrandSettings = {
  clientName: "",
  logoUrl: "",
  primaryColor: "#173f6b",
  highlightColor: "#4fc3a1",
  phone: "",
  email: "",
  address: "",
};

export function toClientBrandSettings(settings: BrandSettings | null | undefined): ClientBrandSettings {
  return {
    ...DEFAULT_CLIENT_BRAND,
    ...settings,
    logoUrl: settings?.logoUrl ?? "",
    address: settings?.address ?? "",
  };
}

export function applyClientBrandSettings(settings: ClientBrandSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement.style;
  root.setProperty("--accent", settings.primaryColor);
  root.setProperty("--accent-strong", settings.primaryColor);
  root.setProperty("--sidebar", settings.primaryColor);
  root.setProperty("--sidebar-deep", settings.primaryColor);
  root.setProperty("--brand-highlight", settings.highlightColor);
}
