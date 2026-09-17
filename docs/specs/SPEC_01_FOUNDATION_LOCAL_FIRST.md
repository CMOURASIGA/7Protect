# SPEC 01 - Foundation Local-First

## Objetivo

Criar a base técnica e visual do 7Protect, pronta para evoluir por módulos sem acoplamento ao provider de dados.

## Escopo

- Next.js App Router + TypeScript + Tailwind CSS v4.
- Estrutura de pastas por domínio e camada.
- Shell responsivo baseado no padrão do 7Commander.
- Whitelabel configurável.
- IndexedDB com schema versionado.
- Repository Pattern.
- dados demo.
- página de configurações.
- backup técnico inicial.

## Referência obrigatória

Estudar no `CMOURASIGA/7Commander`:

- `components/layout/app-shell.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/header.tsx`
- `components/brand/brand-lockup.tsx`
- `lib/brand.ts`
- `lib/brand-settings.ts`
- `app/globals.css`
- `styles/tokens.css`

Replicar linguagem visual, comportamento responsivo e conceito de whitelabel, não o conteúdo funcional.

## Estrutura sugerida

```text
app/
components/
domains/
  crm/
  clients/
  diagnostics/
  pipeline/
  planning/
  proposals/
  reports/
  aegis/
application/
repositories/
  contracts/
  local/
  providers/
lib/
styles/
```

Pode ser ajustada desde que a separação de responsabilidades seja preservada.

## Persistência

Implementar IndexedDB com stores iniciais:

- tenants
- settings
- leads
- clients
- householdMembers
- diagnostics
- tasks
- pipelineHistory
- plans
- proposalVersions
- coverages
- aiAnalyses
- reportSnapshots

Outras stores podem ser adicionadas nas etapas seguintes.

## IDs e metadados

Usar UUID em todos os registros.

Campos comuns:

- id
- tenantId
- createdAt
- updatedAt
- version
- deletedAt opcional

## Repository Pattern

Criar contratos mínimos para `Tenant`, `Settings`, `Lead`, `Client`, `Task` e `Diagnostic`.

Nenhuma page/component pode importar diretamente a implementação IndexedDB.

Criar `RepositoryProvider` ou composição equivalente para injetar o provider ativo.

Provider padrão do MVP:

`local`

## Whitelabel

Configurações mínimas:

- clientName
- logoUrl ou logo local persistido
- primaryColor
- highlightColor
- phone
- email
- address opcional

Aplicar via CSS variables.

No canto superior esquerdo da sidebar deve aparecer a marca do cliente/corretora. O nome 7Protect permanece como identidade do produto abaixo ou na área reservada ao produto, seguindo o padrão do 7Commander.

## Navegação inicial

- Dashboard
- Kanban
- Leads
- Clientes
- Diagnósticos
- Planejamentos
- Propostas
- Carteira
- Aegis
- Relatórios
- Configurações
- Backup e Dados

Itens ainda não implementados podem aparecer desabilitados ou apontar para estado `Em breve`, sem quebrar navegação.

## Configuração inicial

Na primeira utilização, mostrar onboarding curto para configurar:

- nome da corretora;
- logo;
- cores;
- telefone;
- e-mail.

Não exigir backend/login real nesta etapa.

## Backup inicial

Criar exportação JSON de todas as stores disponíveis com `schemaVersion`.

Criar importação/restauração com validação antes de sobrescrever dados locais.

A restauração deve exigir confirmação explícita.

## Critérios de aceite

- aplicação abre sem Supabase;
- shell funciona em desktop, tablet e mobile;
- whitelabel altera logo e cores sem rebuild;
- dados sobrevivem ao refresh e reinício do navegador;
- repositories escondem IndexedDB da UI;
- backup JSON exporta e restaura dados demo;
- build, lint e typecheck passam;
- nenhuma chave externa obrigatória para uso básico.

## Fora do escopo

- autenticação real;
- Supabase;
- IA real;
- CRM completo;
- geração final de PDF;
- portal do cliente.

## Checkpoint humano

Validar visualmente:

1. identidade 7Protect;
2. posição do logo whitelabel;
3. sidebar e header;
4. responsividade;
5. tela de configurações;
6. persistência local e backup.
