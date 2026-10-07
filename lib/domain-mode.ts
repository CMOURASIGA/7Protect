export type DomainMode = "legacy" | "commercial-v2";

export function getDomainMode(): DomainMode {
  return process.env.NEXT_PUBLIC_DOMAIN_MODE === "commercial-v2" ? "commercial-v2" : "legacy";
}

export const isCommercialV2Mode = () => getDomainMode() === "commercial-v2";
