# SPEC 09 - Portabilidade de Dados e Migração Cloud

## Status

**Planejamento desbloqueado — implementação bloqueada até confirmação final de escopo.**

Esta SPEC só pode avançar para desenvolvimento após revisão explícita da abrangência da entrega Cloud. Até lá, este documento é a base de planejamento e não autoriza alteração de código, migração de dados ou ativação de provider Cloud.

## Objetivo

Preparar o 7Protect para operar por tempo indeterminado em modo local e, quando contratado, migrar a base para Supabase sem reconstrução do produto.

## 1. Modo Local

O modo local permanece uma opção válida de uso.

Características:

- dados restritos ao navegador/equipamento;
- sem sincronização entre máquinas;
- backup sob responsabilidade do usuário;
- exportação e restauração disponíveis;
- CRM, Kanban, diagnóstico, proposta e relatórios continuam funcionando.

A UI deve explicar claramente essa limitação sem bloquear o uso.

## 2. Central de Dados

Criar tela `Backup e Dados` com:

- status do provider atual;
- quantidade de registros por entidade;
- data do último backup;
- exportar backup JSON;
- restaurar backup JSON;
- exportar XLSX;
- validar integridade;
- área futura `Migrar para Cloud`.

## 3. Backup JSON

Formato versionado:

```json
{
  "product": "7Protect",
  "schemaVersion": 1,
  "exportedAt": "2026-09-17T00:00:00.000Z",
  "tenantId": "uuid",
  "counts": {},
  "data": {}
}
```

Requisitos:

- incluir todas as stores do tenant;
- preservar UUIDs;
- validar schema na importação;
- impedir restauração silenciosa;
- permitir dry-run de validação antes de gravar;
- gerar relatório de sucesso/erro.

## 4. XLSX

Gerar planilha com abas legíveis, por exemplo:

- Leads
- Clientes
- Dependentes
- Diagnósticos
- Patrimônio
- Dívidas
- Seguros
- Objetivos
- Propostas
- Coberturas
- Tarefas
- Histórico

Requisitos:

- XLSX é exportação, não fonte primária;
- valores que possam ser corrompidos pelo Excel devem ser formatados adequadamente como texto quando necessário;
- IDs técnicos podem ficar em abas técnicas ou ocultados da visão padrão quando não agregarem valor humano;
- exportação deve informar data/hora e versão do schema.

## 5. Integridade local

Criar serviço de validação com verificações mínimas:

- foreign keys lógicas apontam para registros existentes;
- propostas apontam para ciclo existente;
- coberturas apontam para proposta existente;
- tarefas apontam para lead/cliente válido;
- histórico aponta para entidade válida;
- UUIDs não duplicados;
- tenantId consistente.

## 6. Contrato Cloud

Preparar `SupabaseRepository` sem ativá-lo até existir ambiente configurado.

O schema futuro deve espelhar o modelo canônico.

Tabelas previstas:

- tenants
- profiles/users
- leads
- clients
- household_members
- planning_cycles
- diagnostics
- financial_profiles
- health_profiles
- assets
- liabilities
- existing_insurances
- pensions
- life_goals
- plans
- proposal_versions
- coverages
- tasks
- pipeline_history
- follow_ups
- ai_analyses
- report_snapshots
- audit_logs

## 7. Segurança Cloud

Quando Supabase for implementado:

- Supabase Auth;
- `tenant_id` obrigatório;
- RLS em todas as tabelas de negócio;
- nenhuma service role key no client;
- auditoria de ações sensíveis;
- policies testadas;
- separação entre tenants;
- estratégia de backup definida.

## 8. Migração Local -> Cloud

Fluxo funcional:

1. usuário solicita migração;
2. sistema executa validação local;
3. sistema exige geração de backup;
4. autentica tenant no ambiente cloud;
5. envia registros preservando UUIDs;
6. respeita ordem de dependência;
7. compara contagens;
8. valida relacionamentos;
9. gera relatório de migração;
10. somente após sucesso permite ativar provider cloud.

Não apagar IndexedDB automaticamente após migração.

## 9. Ordem de carga

Sugestão:

```text
tenant/settings
clients/leads
householdMembers
planningCycles
diagnostics/profiles
assets/liabilities/insurance/pensions/goals
plans
proposalVersions
coverages
tasks
pipelineHistory/followUps
aiAnalyses
reportSnapshots
```

## 10. Idempotência

A migração deve ser reexecutável com segurança.

Usar UUIDs estáveis e estratégia de upsert controlada.

Não duplicar registros se uma tentativa parcial precisar ser retomada.

## 11. Rollback

Se a validação cloud falhar:

- manter provider local ativo;
- não marcar migração como concluída;
- preservar backup;
- exibir entidades que falharam;
- permitir nova tentativa após correção.

## 12. Planos comerciais

O código deve permitir feature flags por tenant para diferenciar futuramente:

### Local

- persistência local;
- backup/exportação;
- um equipamento por base local.

### Cloud

- acesso multi-dispositivo;
- sincronização;
- autenticação;
- backup centralizado;
- recursos cloud futuros.

### Cloud Pro

Possível evolução:

- multiusuário;
- RBAC;
- portal do cliente;
- automações;
- relatórios avançados.

Não implementar cobrança nesta SPEC, apenas preparar capabilities/flags.

## 13. Critérios de aceite

- backup completo exportável e restaurável;
- validação detecta referências quebradas;
- XLSX legível é gerado;
- UUIDs permanecem estáveis após restore;
- provider local segue funcionando sem Supabase;
- código possui fronteira clara para provider Supabase;
- processo de migração está documentado e testável em ambiente de desenvolvimento;
- falha de migração não apaga nem corrompe base local;
- build, lint e typecheck passam.

## Checkpoint humano

Executar cenário:

1. criar base local com dados demo;
2. gerar JSON;
3. limpar/restaurar localmente;
4. conferir contagens;
5. gerar XLSX;
6. simular migração cloud em ambiente de teste;
7. validar rollback de falha parcial.
