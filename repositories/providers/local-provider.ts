"use client";
import { db } from "@/repositories/local/database";
import { IndexedDbRepository } from "@/repositories/local/indexeddb-repository";
export const localProvider = { kind: "local" as const, tenants: new IndexedDbRepository(db.tenants), settings: new IndexedDbRepository(db.settings), leads: new IndexedDbRepository(db.leads), clients: new IndexedDbRepository(db.clients), tasks: new IndexedDbRepository(db.tasks), diagnostics: new IndexedDbRepository(db.diagnostics), pipelineHistory: new IndexedDbRepository(db.pipelineHistory) };
export type RepositoryProvider = typeof localProvider;

