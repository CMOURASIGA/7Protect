"use client";
import type { Table } from "dexie";
import type { EntityMetadata } from "@/domains/shared/entity";
import type { Repository } from "@/repositories/contracts/repository";
export class IndexedDbRepository<T extends EntityMetadata> implements Repository<T> {
  constructor(private readonly table: Table<T, string>) {}
  async create(input: T) { await this.table.add(input); return input; }
  async update(input: T) { const next = { ...input, updatedAt: new Date().toISOString(), version: input.version + 1 }; await this.table.put(next); return next; }
  findById(id: string) { return this.table.get(id).then((row) => row ?? null); }
  list(tenantId: string) { return this.table.where("tenantId").equals(tenantId).filter((row) => !row.deletedAt).toArray(); }
  async delete(id: string) { const row = await this.table.get(id); if (row) await this.table.put({ ...row, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: row.version + 1 }); }
}
