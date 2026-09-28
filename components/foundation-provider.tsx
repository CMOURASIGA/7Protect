"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { BrandSettings } from "@/domains/core/entities";
import { getFoundation } from "@/application/foundation-service";
import { initializeDemo, resetDemo } from "@/application/demo-service";
import { applyClientBrandSettings, toClientBrandSettings } from "@/lib/brand-settings";
import { isDemoMode } from "@/lib/demo-mode";
type FoundationContextValue = { ready: boolean; settings: BrandSettings | null; demo: boolean; refresh: () => Promise<void>; resetDemo: () => Promise<void> };
const FoundationContext = createContext<FoundationContextValue | null>(null);
export function FoundationProvider({ children }: { children: React.ReactNode }) { const [ready, setReady] = useState(false); const [settings, setSettings] = useState<BrandSettings | null>(null); const demo = isDemoMode(); const refresh = async () => { const foundation = await getFoundation(); setSettings(foundation.settings); setReady(true); }; const restartDemo = async () => { await resetDemo(); await refresh(); }; useEffect(() => { void (async () => { await initializeDemo(); await refresh(); })(); }, []); useEffect(() => { if (!settings) return; applyClientBrandSettings(toClientBrandSettings(settings)); }, [settings]); return <FoundationContext.Provider value={{ ready, settings, demo, refresh, resetDemo: restartDemo }}>{children}</FoundationContext.Provider>; }
export const useFoundation = () => { const value = useContext(FoundationContext); if (!value) throw new Error("FoundationProvider ausente"); return value; };
