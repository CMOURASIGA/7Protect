"use client";

export const DEMO_SESSION_KEY = "7protect-demo-session";
export const DEMO_DATABASE_PREFIX = "7protect-demo-";

export const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function demoSessionId() {
  if (!isDemoMode() || typeof window === "undefined") return null;
  let value = window.sessionStorage.getItem(DEMO_SESSION_KEY);
  if (!value) {
    value = crypto.randomUUID();
    window.sessionStorage.setItem(DEMO_SESSION_KEY, value);
  }
  return value;
}

export function demoDatabaseName() {
  const sessionId = demoSessionId();
  return sessionId ? `${DEMO_DATABASE_PREFIX}${sessionId}` : null;
}
