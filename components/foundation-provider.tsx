"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { BrandSettings } from "@/domains/core/entities";
import { getFoundation } from "@/application/foundation-service";
type FoundationContextValue = { ready: boolean; settings: BrandSettings | null; refresh: () => Promise<void> };
const FoundationContext = createContext<FoundationContextValue | null>(null);
export function FoundationProvider({ children }: { children: React.ReactNode }) { const [ready, setReady] = useState(false); const [settings, setSettings] = useState<BrandSettings | null>(null); const refresh = async () => { const foundation = await getFoundation(); setSettings(foundation.settings); setReady(true); }; useEffect(() => { void Promise.resolve().then(refresh); }, []); useEffect(() => { if (!settings) return; const root = document.documentElement.style; root.setProperty("--accent", settings.primaryColor); root.setProperty("--accent-strong", settings.primaryColor); root.setProperty("--sidebar", settings.primaryColor); root.setProperty("--sidebar-deep", settings.primaryColor); root.setProperty("--brand-highlight", settings.highlightColor); }, [settings]); return <FoundationContext.Provider value={{ ready, settings, refresh }}>{children}</FoundationContext.Provider>; }
export const useFoundation = () => { const value = useContext(FoundationContext); if (!value) throw new Error("FoundationProvider ausente"); return value; };
