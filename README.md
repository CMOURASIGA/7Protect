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

## Aegis, assistente de IA

A Aegis é uma assistente contextual para o corretor. Ela analisa diagnósticos, revisa versões de propostas e prepara perguntas objetivas para reuniões, sempre como apoio à revisão profissional.

O fluxo preserva a separação arquitetural: `UI -> AegisApplicationService -> PayloadSanitizer -> AI Provider -> OpenAI -> Schema Validator -> AegisRepository`. O provider `fake` é usado por padrão em desenvolvimento e homologação. O provider `openai` utiliza exclusivamente o Route Handler server-side e só é ativado com `NEXT_PUBLIC_AEGIS_PROVIDER=openai` e `OPENAI_API_KEY` configurada no ambiente hospedado.

Antes da chamada, o payload remove nome, CPF, telefone, e-mail, endereço, apólice e IDs internos. O IndexedDB registra somente metadados, fingerprint do contexto e resultado estruturado validado. Nenhum dado do CRM, diagnóstico ou proposta é alterado pela Aegis.

## Diretrizes do produto

- MVP local-first, sem dependência de Supabase.
- Persistência operacional em IndexedDB, nunca em localStorage como banco principal.
- Repository Pattern obrigatório para permitir troca futura de IndexedDB por Supabase sem reescrever a UI.
- Backup técnico em JSON e exportação humana em XLSX.
- Geração de apresentação web e PDF a partir de dados estruturados.
- Histórico de planejamentos e versões de proposta por cliente.
- Kanban operacional/comercial como fonte dos indicadores de funil.
- Dashboard da corretora e dashboard individual do cliente.
- IA Aegis, usando OpenAI, como assistente do corretor para análise de diagnóstico e revisão de proposta.
- Whitelabel obrigatório, seguindo o padrão visual e de parametrização do 7Commander.
- Produto independente da MetLife. A primeira operação pode usar produtos MetLife, mas seguradora, produtos e identidade do cliente não devem ser hardcoded.
- O produto não é gestor ou plataforma de investimentos. Produtos de seguradoras são referências operacionais possíveis, nunca uma limitação da plataforma.

## Estratégia de branches e validação

O fluxo oficial do projeto utiliza duas branches permanentes:

- `develop`: branch de integração, homologação e validação humana. Toda implementação concluída deve chegar primeiro nesta branch e gerar um deploy de preview/homologação no Vercel para validação do responsável pelo produto.
- `main`: branch estável. Somente código já validado em `develop` pode ser promovido para `main`.

Regras:

1. O desenvolvimento deve ocorrer em branches de feature derivadas de `develop`, por exemplo `feat/spec-01-foundation`.
2. A feature deve ser integrada primeiro em `develop`.
3. Cada atualização relevante de `develop` deve gerar deploy no Vercel para validação humana.
4. A validação funcional e visual será feita sempre sobre o ambiente publicado a partir de `develop`.
5. Correções encontradas durante a homologação permanecem em `develop` até aprovação.
6. Somente após aprovação explícita o checkpoint pode ser promovido de `develop` para `main`.
7. Não desenvolver diretamente em `main` e não usar `main` como ambiente de homologação.

Fluxo esperado:

`feat/* -> develop -> Vercel Preview/Homologação -> validação humana -> main`

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
5. `docs/specs/SPEC_05_AEGIS_AI_ASSISTANT.md`
6. `docs/specs/SPEC_06_DATA_PORTABILITY_CLOUD_MIGRATION.md`

Documentos complementares:

- `docs/PRODUCT_VISION.md`
- `docs/ARCHITECTURE.md`
- `docs/UX_AND_WHITELABEL.md`

## Sequência recomendada de desenvolvimento

Implementar as SPECs em ordem. Cada SPEC deve gerar um checkpoint validável pelo usuário em `develop`, publicado no Vercel, antes do início da próxima etapa e antes de qualquer promoção para `main`.
