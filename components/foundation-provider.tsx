"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { BrandSettings } from "@/domains/core/entities";
import { getFoundation } from "@/application/foundation-service";
import { applyClientBrandSettings, toClientBrandSettings } from "@/lib/brand-settings";
type FoundationContextValue = { ready: boolean; settings: BrandSettings | null; refresh: () => Promise<void> };
const FoundationContext = createContext<FoundationContextValue | null>(null);
export function FoundationProvider({ children }: { children: React.ReactNode }) { const [ready, setReady] = useState(false); const [settings, setSettings] = useState<BrandSettings | null>(null); const refresh = async () => { const foundation = await getFoundation(); setSettings(foundation.settings); setReady(true); }; useEffect(() => { void Promise.resolve().then(refresh); }, []); useEffect(() => { if (!settings) return; applyClientBrandSettings(toClientBrandSettings(settings)); }, [settings]); return <FoundationContext.Provider value={{ ready, settings, refresh }}>{children}</FoundationContext.Provider>; }
export const useFoundation = () => { const value = useContext(FoundationContext); if (!value) throw new Error("FoundationProvider ausente"); return value; };
