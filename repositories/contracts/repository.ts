import type { EntityMetadata } from "@/domains/shared/entity";

export interface Repository<T extends EntityMetadata> { create(input: T): Promise<T>; update(input: T): Promise<T>; findById(id: string): Promise<T | null>; list(tenantId: string): Promise<T[]>; delete(id: string): Promise<void>; }
