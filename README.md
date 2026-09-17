# 7Protect

CRM especializado para corretoras de seguros e consultoria de proteção financeira, integrante do HUB da Consult Services.

## Propósito

O 7Protect digitaliza o fluxo hoje executado manualmente pelo corretor: captação de lead, cadastro do cliente, preenchimento do diagnóstico, análise profissional, cálculo de proteção, montagem da proposta, apresentação ao cliente e acompanhamento da carteira.

Fluxo principal:

`Lead -> Cliente -> Diagnóstico -> Tarefa -> Planejamento -> Proposta -> Apresentação -> Fechamento -> Acompanhamento`

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

Implementar as SPECs em ordem. Cada SPEC deve gerar um checkpoint validável pelo usuário antes do início da próxima etapa.
