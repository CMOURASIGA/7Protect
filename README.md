# 7Protect

**CRM e Planejamento de Proteção Financeira**

O 7Protect é uma plataforma CRM para corretores de seguros, voltada ao diagnóstico, planejamento e gestão da proteção financeira dos clientes.

## Propósito

O 7Protect digitaliza o fluxo hoje executado manualmente pelo corretor: captação de lead, cadastro do cliente, preenchimento do diagnóstico, análise profissional, cálculo de proteção, montagem da proposta, apresentação ao cliente e acompanhamento da carteira.

Fluxo principal:

`Lead -> Cliente -> Diagnóstico -> Tarefa -> Planejamento -> Proposta -> Apresentação -> Fechamento -> Acompanhamento`

## Documentos do atendimento

O PDF do diagnóstico registra o levantamento e a revisão das informações declaradas pelo cliente. Ele não substitui o PDF comercial da proposta final, que apresentará a solução recomendada em etapa própria.

## Dashboards e apresentação comercial

O dashboard da corretora consolida CRM, Kanban, planejamentos, propostas e fechamentos já persistidos no dispositivo. Seus filtros operacionais levam ao Kanban correspondente, e o dashboard individual reúne a fotografia financeira declarada, a proposta selecionada e o histórico do cliente.

A apresentação web e o PDF comercial são gerados a partir de uma versão específica da proposta. Na primeira geração é criado um `reportSnapshot` local, com versão de template e origem explícita dos dados (`clientProvided`, `systemCalculated`, `brokerAnalysis` e `templateStatic`). O snapshot não é regravado: alterações posteriores no cadastro não mudam um relatório histórico.

## Metis, Assistente de Planejamento

A Metis é a Assistente de Planejamento do 7Protect. Analisa diagnósticos, revisa propostas e sugere perguntas para apoiar o planejamento de proteção financeira. Ela apoia a corretora, não substitui decisão profissional nem altera dados ou fecha propostas automaticamente.

O fluxo preserva a separação arquitetural: `UI -> MetisApplicationService -> PayloadSanitizer -> AI Provider -> OpenAI -> Schema Validator -> MetisRepository`. O provider `fake` é usado por padrão em desenvolvimento e homologação. O provider `openai` utiliza exclusivamente o Route Handler server-side e só é ativado com `NEXT_PUBLIC_METIS_PROVIDER=openai` e `OPENAI_API_KEY` configurada no ambiente hospedado. O provider real possui timeout, retry limitado e retorno seguro de falhas.

Antes da chamada, o payload remove nome, CPF, telefone, e-mail, endereço, apólice e IDs internos. A validação técnica expõe somente a evidência de sanitização e o fingerprint, nunca o conteúdo do cliente. O IndexedDB registra metadados, fingerprint, provider/modelo, duração, uso de tokens quando informado, resultado estruturado validado e falhas sem payload bruto. Nenhum dado do CRM, diagnóstico ou proposta é alterado pela Metis.

## Diretrizes do produto

- MVP local-first, sem dependência de Supabase.
- Persistência operacional em IndexedDB, nunca em localStorage como banco principal.
- Repository Pattern obrigatório para permitir troca futura de IndexedDB por Supabase sem reescrever a UI.
- Backup técnico em JSON e exportação humana em XLSX.
- Geração de apresentação web e PDF a partir de dados estruturados.
- Histórico de planejamentos e versões de proposta por cliente.
- Kanban operacional/comercial como fonte dos indicadores de funil.
- Dashboard da corretora e dashboard individual do cliente.
- IA Metis, usando OpenAI, como assistente do corretor para análise de diagnóstico e revisão de proposta.
- Whitelabel obrigatório, seguindo o padrão visual e de parametrização do 7Commander.
- Produto independente da MetLife. A primeira operação pode usar produtos MetLife, mas seguradora, produtos e identidade do cliente não devem ser hardcoded.
- O produto não é gestor ou plataforma de investimentos. Produtos de seguradoras são referências operacionais possíveis, nunca uma limitação da plataforma.

## Estratégia de branches e validação

O fluxo oficial do projeto utiliza duas branches permanentes:

- `develop`: branch de integração, homologação e validação humana. Toda implementação concluída deve chegar primeiro nesta branch e gerar um deploy de preview/homologação no Vercel para validação do responsável pelo produto.
- `main`: branch estável. Somente código já validado em `develop` pode ser promovido para `main`.

Regras:

1. O desenvolvimento e a manutenção ocorrem diretamente em `develop`.
2. `develop` é a única linha de homologação antes da promoção para produção.
3. Cada atualização relevante de `develop` deve gerar deploy no Vercel para validação humana.
4. A validação funcional e visual será feita sempre sobre o ambiente publicado a partir de `develop`.
5. Correções encontradas durante a homologação permanecem em `develop` até aprovação.
6. Somente após aprovação explícita o checkpoint pode ser promovido de `develop` para `main`.
7. Não desenvolver diretamente em `main` e não usar `main` como ambiente de homologação.

Fluxo esperado:

`develop -> Vercel Preview/Homologação -> validação humana -> main -> produção`

Não criar branches `feat/*`, `fix/*` ou `docs/*` para o fluxo normal de desenvolvimento.

O projeto Vercel já existe e deve ser utilizado para publicar cada atualização necessária para validação em `develop`. A configuração de produção associada à `main` deve permanecer separada da homologação.

## Referência de frontend

O projeto de referência é o 7Commander:

- `CMOURASIGA/7Commander/components/layout/app-shell.tsx`
- `CMOURASIGA/7Commander/components/layout/sidebar.tsx`
- `CMOURASIGA/7Commander/components/brand/brand-lockup.tsx`
- `CMOURASIGA/7Commander/lib/brand.ts`
- `CMOURASIGA/7Commander/lib/brand-settings.ts`
- `CMOURASIGA/7Commander/app/globals.css`

O 7Protect deve reutilizar a linguagem visual, shell responsivo, tokens, comportamento mobile/tablet/desktop e modelo de whitelabel do 7Commander, adaptando apenas navegação e conteúdo ao domínio de seguros.

## Especificações

1. `docs/specs/SPEC_01_FOUNDATION_LOCAL_FIRST.md`
2. `docs/specs/SPEC_02_CRM_PIPELINE.md`
3. `docs/specs/SPEC_03_DIAGNOSTIC_PLANNING_PROPOSALS.md`
4. `docs/specs/SPEC_04_DASHBOARDS_REPORTING.md`
5. `docs/specs/SPEC_05_METIS_AI_ASSISTANT.md`
6. `docs/specs/SPEC_06_PORTFOLIO_REPORTS.md`
7. `docs/specs/SPEC_07_METIS_PRODUCTION_READINESS.md`
8. `docs/specs/SPEC_08_OPERATIONAL_GUIDE_CONTEXTUAL_HELP.md`
9. `docs/specs/SPEC_09_DATA_PORTABILITY_CLOUD_MIGRATION.md`

### Linha V2 experimental

A fundação do novo domínio comercial está isolada na branch `v2/commercial-domain`, sem alterar o fluxo homologado em `develop` e `main`. A ativação é explícita por ambiente:

```env
NEXT_PUBLIC_DOMAIN_MODE=commercial-v2
```

Sem essa variável, o produto mantém o modo `legacy`. A especificação está em `docs/specs/V2_SPEC_01_COMMERCIAL_DOMAIN_FOUNDATION.md`.

### Status do roadmap

- **SPEC 07 — Metis Production Readiness:** aprovada como `SPEC 07 - METIS PRODUCTION READY` na Human Validation. SHA homologado: `f8c731d27d0d8243a914b978fd91c4fffe19dd6d`.
- **SPEC 08 — Guia Operacional e Ajuda Contextual:** em implementação em `develop`. A Ajuda passa a documentar o fluxo operacional e as rotinas de apoio existentes.
- **SPEC 09 — Portabilidade de Dados e Migração Cloud:** mantida para planejamento futuro. Nenhuma implementação Cloud está autorizada nesta etapa.
- **Checkpoint pós-SPEC 07 — Navegação Metis e Ambiente Demo:** concluído tecnicamente. Ver `docs/POST_SPEC_07_DEMO_ENVIRONMENT.md`.

Documentos complementares:

- `docs/PRODUCT_VISION.md`
- `docs/ARCHITECTURE.md`
- `docs/UX_AND_WHITELABEL.md`

## Sequência recomendada de desenvolvimento

Implementar as SPECs em ordem. Cada SPEC deve gerar um checkpoint validável pelo usuário em `develop`, publicado no Vercel, antes do início da próxima etapa e antes de qualquer promoção para `main`.

## V2-SPEC 02 - Mercado Base e Qualificação

O Mercado Base V2 oferece cadastro rápido, edição do mesmo Contact, qualificação estruturada, busca e filtros combináveis. Configurações passa a separar Parâmetros comerciais e Marca da corretora. Os valores da aba Matriz são dados iniciais editáveis por tenant, persistidos em repositories próprios. HOT40 continua exigindo qualificação válida, sem score automático.

Status: implementada, aguardando Human Validation. Base aprovada da V2-SPEC 01: `6eaa2987ec8c23e7199e76172aad5b223ed180b2`. Branch: `v2/commercial-domain`. Confira o roteiro em `docs/specs/V2_SPEC_02_MARKET_BASE_QUALIFICATION_PARAMETERS.md`. V2-SPEC 03 não iniciada.

Verificação: `npm test`, `npm run typecheck`, `npm run lint`, `NEXT_PUBLIC_DOMAIN_MODE=commercial-v2 npm run build` e `git diff --check`.

## V2-SPEC 03 - HOT40 operacional

Lista e Kanban usam os mesmos Contacts e memberships. Etapas e atividades geram timeline por contato; próxima ação, última interação e tempo parado são derivados dos eventos. Implementada em `v2/commercial-domain`, pendente de Human Validation. Roteiro: `docs/specs/V2_SPEC_03_HOT40_KANBAN_ACTIVITIES.md`.

## V2-SPEC 04 - Indicadores comerciais

O Dashboard V2 organiza Visão do Mês, Visão Semanal, Funil e Performance. Benchmarks por período são configuráveis; resultados e conversões são derivados de atividades comerciais. O roteiro de validação está em `docs/specs/V2_SPEC_04_DASHBOARD_INDICATORS_BENCHMARK_FUNNEL.md`. Pendente de Human Validation.

### Domínio Comercial V2, SPEC 05

A Agenda operacional em `/agenda` reúne Hoje, Atrasadas, Próximas e HOT40 sem próxima ação. O Dashboard exibe a Central de atenção. Atividades planejadas são concluídas, canceladas ou reagendadas no mesmo registro, com evento de ciclo e comando idempotente. Alertas são calculados de atividades, HOT40, benchmark semanal e funil, com notificações internas rastreáveis. Limites ficam em Configurações > Alertas. Consulte `docs/specs/V2_SPEC_05_OPERATIONAL_AGENDA_ALERTS_NOTIFICATIONS_PREPARATION.md` para regras e Human Validation.
