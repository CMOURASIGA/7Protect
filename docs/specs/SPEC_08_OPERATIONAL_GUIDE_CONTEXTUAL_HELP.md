# SPEC 08 - Guia Operacional e Ajuda Contextual

## Objetivo

Transformar a tela de Ajuda em um guia operacional para consultores e corretores, cobrindo o ciclo do primeiro contato ao acompanhamento e à revisão da proteção financeira.

O guia não é um FAQ isolado. Cada módulo deve explicar o que fazer, por que, quem executa, quando, onde, como, condição de término, próxima ação e erros comuns.

## Escopo

### Fluxo principal

Lead -> Kanban -> Cliente -> Diagnóstico -> Planejamento -> Análise profissional -> Proposta -> Metis -> Apresentação -> Fechamento -> Carteira -> Relatórios -> Revisão

O fluxo é uma orientação operacional. Exceções de negócio não devem ser apresentadas como falha automática do consultor.

### Rotinas de apoio

- Dashboard
- Catálogo
- Configurações e whitelabel
- Modo demonstração
- Backup e Dados

## Conteúdo obrigatório por item

Cada item do guia deve apresentar:

1. objetivo;
2. 5W2H resumido:
   - O quê;
   - Por quê;
   - Quem;
   - Quando;
   - Onde;
   - Como;
   - Quanto, usando Não se aplica diretamente. quando não houver impacto financeiro;
3. passo a passo;
4. condição objetiva de conclusão;
5. próxima etapa ou possibilidades seguintes;
6. erros operacionais comuns;
7. atalho para a rota existente, quando houver.

Não criar atalho genérico para Metis. Ela é usada somente no contexto do cliente ou da proposta.

## Regras de conteúdo

- Refletir somente funcionalidades existentes.
- Não inventar regras comerciais ou condições de seguradoras.
- Não tratar capital segurado como investimento, rendimento ou valor de resgate.
- Reforçar a diferença entre dados declarados e análise profissional.
- Reforçar que Planejamento não é Proposta.
- Reforçar que versões apresentadas ou aceitas não podem ser sobrescritas.
- Explicar que Carteira é derivada de fechamento e não possui cadastro paralelo.
- Explicar que Relatórios históricos usam snapshots e não devem ser recalculados com dados atuais.
- Identificar o caso Rafael exclusivamente como dado fictício do Modo demonstração.
- Informar que Backup e Dados é local-first. Cloud não é funcionalidade disponível nesta SPEC.

## UX e acessibilidade

- Cards expansíveis com semântica nativa.
- Busca textual por módulo, etapa, ação e palavras-chave.
- Filtros entre fluxo principal e rotinas de apoio.
- Índice navegável por seção.
- Atalhos coerentes com as rotas reais.
- Desktop, tablet e mobile sem scroll horizontal.
- Foco visível e navegação por teclado.

## Human Validation

1. Abrir Ajuda.
2. Conferir fluxo principal e rotinas de apoio.
3. Buscar por proposta, Metis, carteira, diagnóstico e revisão.
4. Abrir uma etapa e conferir 5W2H, passo a passo, conclusão, próxima ação e erros.
5. Usar atalhos de Leads, Clientes, Diagnósticos, Planejamentos, Catálogo, Propostas, Carteira, Relatórios, Configurações e Backup.
6. Confirmar que Metis explica as três ações e não possui rota genérica.
7. Conferir regras de versionamento, fechamento, Carteira e snapshots.
8. Conferir Modo demonstração e a separação de dados fictícios.
9. Testar em desktop, tablet e mobile.
10. Confirmar que nenhum texto descreve Cloud como funcionalidade atual.

## Critério de aceite

Registrar SPEC 08 - GUIA OPERACIONAL E AJUDA CONTEXTUAL APROVADA somente quando o fluxo e as rotinas relevantes estiverem documentados com 5W2H, busca, atalhos, FAQ, responsividade e acessibilidade básica aprovados, além de typecheck, lint, build e git diff --check.

## Roadmap

- SPEC 07 - Metis Production Ready: aprovada.
- Ajuste pós-SPEC 07 - Navegação Metis e Ambiente Demo: concluído tecnicamente.
- SPEC 08 - Guia Operacional e Ajuda Contextual.
- SPEC 09 - Portabilidade de Dados e Cloud.

Não iniciar a SPEC 09 antes da aprovação formal desta SPEC.
