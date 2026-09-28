export type EntityMetadata = { id: string; tenantId: string; createdAt: string; updatedAt: string; version: number; deletedAt?: string | null };
export const newId = () => crypto.randomUUID();
export const timestamps = () => { const now = new Date().toISOString(); return { id: newId(), createdAt: now, updatedAt: now, version: 1, deletedAt: null }; };
