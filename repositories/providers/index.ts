"use client";
import { getLocalProvider, type RepositoryProvider } from "./local-provider";
export const getRepositoryProvider = (): RepositoryProvider => { const provider = process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "local"; if (provider !== "local") console.warn("Provider indisponível no MVP. Usando persistência local."); return getLocalProvider(); };
