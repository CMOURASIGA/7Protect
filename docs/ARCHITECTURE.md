# 7Protect - Arquitetura

## 1. Objetivo arquitetural

Permitir que o MVP funcione totalmente em modo local, sem backend obrigatório, preservando uma fronteira clara para migração futura ao Supabase.

Princípio central:

`UI -> Application Services -> Repository Interfaces -> Data Provider`

A UI nunca deve chamar IndexedDB, Supabase ou APIs de persistência diretamente.

## 2. Stack inicial

- Next.js com App Router
- TypeScript
- Tailwind CSS v4
- IndexedDB como persistência local
- biblioteca de acesso ao IndexedDB pode ser Dexie ou wrapper equivalente, desde que escondida atrás dos repositories
- geração de XLSX via biblioteca dedicada
- geração de PDF a partir do template de relatório
- OpenAI API para Aegis

## 3. Camadas

### UI

Responsável por telas, componentes, formulários, tabelas, Kanban, dashboards e apresentação.

Não contém regras de persistência.

### Application Services

Responsável por regras de negócio e orquestração.

Exemplos:

- `CreateLeadService`
- `PromoteLeadToClientService`
- `CompleteDiagnosticService`
- `MovePipelineCardService`
- `CreateProposalVersionService`
- `GenerateClientReportService`
- `AnalyzeClientWithAegisService`

### Repository Interfaces

Contratos estáveis de acesso aos dados.

Exemplo conceitual:

```ts
interface ClientRepository {
  create(input: Client): Promise<Client>
  update(input: Client): Promise<Client>
  findById(id: string): Promise<Client | null>
  list(filters?: ClientFilters): Promise<Client[]>
  delete(id: string): Promise<void>
}
```

### Local Repositories

Implementações usando IndexedDB.

Exemplo:

`IndexedDbClientRepository implements ClientRepository`

### Cloud Repositories

Implementações futuras usando Supabase.

Exemplo:

`SupabaseClientRepository implements ClientRepository`

## 4. Provider de dados

O provider deve ser selecionável por configuração, sem alterar a UI.

Conceito:

```env
NEXT_PUBLIC_DATA_PROVIDER=local
```

Futuro:

```env
NEXT_PUBLIC_DATA_PROVIDER=supabase
```

Também pode existir `mock` para testes e demonstrações.

## 5. Modelo de dados canônico

As entidades devem ter formato canônico independente do provider.

Campos técnicos mínimos para entidades persistidas:

- `id: string` em UUID
- `tenantId: string`
- `createdAt: string`
- `updatedAt: string`
- `deletedAt?: string | null`
- `version: number`

Mesmo no MVP local, `tenantId` deve existir. Ele prepara o modelo para whitelabel multiempresa e migração futura.

## 6. Entidades iniciais

- `tenants`
- `settings`
- `leads`
- `clients`
- `householdMembers`
- `diagnostics`
- `financialProfiles`
- `healthProfiles`
- `assets`
- `liabilities`
- `existingInsurances`
- `pensions`
- `lifeGoals`
- `plans`
- `proposalVersions`
- `coverages`
- `tasks`
- `pipelineHistory`
- `followUps`
- `aiAnalyses`
- `reportSnapshots`

## 7. Relacionamentos principais

```text
Tenant
  -> Leads
  -> Clients
      -> Household Members
      -> Planning Cycles
          -> Diagnostic
          -> Financial Profile
          -> Health Profile
          -> Goals
          -> Proposal Versions
              -> Coverages
          -> AI Analyses
          -> Report Snapshots
      -> Tasks
      -> Pipeline History
```

## 8. Ciclo de planejamento

Cadastro de cliente e diagnóstico não são a mesma coisa.

O cadastro é permanente.

O diagnóstico representa uma fotografia do período.

Exemplo:

```text
Client 123
  Planning Cycle 2026
  Planning Cycle 2027
  Planning Cycle 2028
```

Isso evita sobrescrever histórico financeiro e patrimonial.

## 9. IndexedDB

IndexedDB será a fonte operacional do MVP.

Requisitos:

- migrations versionadas do schema;
- transações para operações compostas;
- índices para campos de busca;
- nunca armazenar toda a aplicação como um único JSON;
- tratamento explícito de falhas de quota;
- tela de backup e restauração.

## 10. Backup e exportação

### Backup técnico

JSON completo e versionado:

```json
{
  "schemaVersion": 1,
  "exportedAt": "ISO_DATE",
  "tenant": {},
  "data": {}
}
```

Deve permitir restauração integral.

### XLSX

Exportação legível por humanos, com abas por entidade ou visão de negócio.

XLSX não é banco operacional e não deve ser usado como fonte primária.

## 11. Migração futura para Supabase

Fluxo previsto:

1. validar a base local;
2. gerar backup JSON;
3. criar schema equivalente no Supabase;
4. preservar os mesmos UUIDs;
5. importar entidades na ordem de dependência;
6. validar quantidade de registros e relacionamentos;
7. ativar provider `supabase` somente após a conferência;
8. preservar o backup local durante período de segurança.

## 12. Segurança e dados sensíveis

O 7Protect manipulará informações pessoais, financeiras e de saúde.

Requisitos desde o MVP:

- evitar logs com CPF, telefone, e-mail, dados de saúde e renda detalhada;
- não enviar dados identificáveis à IA quando não forem necessários;
- anonimizar/minimizar payloads enviados à OpenAI;
- não incluir chaves de API no bundle público;
- operações de IA devem passar por endpoint server-side quando houver deploy web;
- preparar futura implementação de Auth, RLS e auditoria no Supabase.

## 13. Aegis

Aegis é uma capacidade separada da persistência.

Fluxo:

`Dados estruturados -> Sanitização/Minimização -> AI Service -> OpenAI -> Saída estruturada -> aiAnalyses`

A saída deve ser JSON estruturado e validado por schema.

A IA não altera proposta, cobertura ou cadastro automaticamente. Qualquer aplicação de sugestão exige ação explícita do corretor.

Na implementação inicial, `AegisApplicationService` obtém os dados pelo provider, passa somente o contexto minimizado para `PayloadSanitizer` e seleciona um `AiProvider`. O provider `fake` atende desenvolvimento e homologação. O provider OpenAI chama `app/api/aegis/route.ts`, em runtime Node.js, e a chave `OPENAI_API_KEY` existe somente no servidor. A resposta é validada antes da criação de `aiAnalyses`; falhas são registradas sem payload bruto e sem alterar dados de domínio.

## 14. Regras de evolução

- não acoplar UI ao provider;
- não hardcodar seguradora;
- não hardcodar identidade do cliente;
- não tratar proposta como registro único mutável;
- não apagar histórico de pipeline;
- não misturar dado declarado pelo cliente com análise do corretor;
- não representar capital segurado como rentabilidade financeira.
