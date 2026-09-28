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
  clientName: "Consult Services Tecnologia",
  logoUrl: "https://i.imgur.com/gxXnYsA.png",
  primaryColor: "#003B73",
  highlightColor: "#00AEEF",
  phone: "",
  email: "",
  address: "",
};

const EMPTY_CLIENT_BRAND: ClientBrandSettings = {
  ...DEFAULT_CLIENT_BRAND,
  clientName: "",
  logoUrl: "",
};

export function toClientBrandSettings(settings: BrandSettings | null | undefined): ClientBrandSettings {
  return {
    ...EMPTY_CLIENT_BRAND,
    ...settings,
    logoUrl: settings?.logoUrl ?? "",
    address: settings?.address ?? "",
  };
}

export function getClientLogoUrl(settings: { logoUrl?: string } | null | undefined) {
  return settings?.logoUrl || DEFAULT_CLIENT_BRAND.logoUrl;
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
