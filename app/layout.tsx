import type { Metadata } from "next"; import "./globals.css"; import { FoundationProvider } from "@/components/foundation-provider"; import { AppShell } from "@/components/layout/app-shell";
export const metadata: Metadata = { title: "7Protect", description: "Gestão de proteção financeira" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body><FoundationProvider><AppShell>{children}</AppShell></FoundationProvider></body></html>; }
