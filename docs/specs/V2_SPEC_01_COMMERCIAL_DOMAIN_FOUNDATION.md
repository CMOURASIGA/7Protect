# V2-SPEC 01 - Fundação do Novo Domínio Comercial

## Estado

Em implementação na branch `v2/commercial-domain`. Esta SPEC não altera `develop` ou `main`.

## Decisões de fundação

- O modo é definido por `NEXT_PUBLIC_DOMAIN_MODE`, com valores `legacy` e `commercial-v2`.
- O modo padrão é `legacy`. Em homologação, use `NEXT_PUBLIC_DOMAIN_MODE=commercial-v2` para ativar a navegação V2.
- O modo V2 preserva o legado tecnicamente, mas expõe somente Dashboard, Mercado Base, HOT40, Clientes, Configurações e Ajuda.
- `Contact` é a pessoa canônica. Qualificação, HOT40, atividades, oportunidades, indicações e notificações se relacionam por `contactId`.
- E-mail e telefone normalizados impedem criação acidental de duplicidade. Não há merge automático.
- Semana, mês e ano são derivados exclusivamente das datas da atividade por agregadores centralizados.
- IndexedDB mantém stores próprios do domínio comercial V2 e o Repository Pattern continua sendo a fronteira de persistência.

## Entidades

`Contact`, `ProspectQualification`, `Hot40Membership`, `CommercialActivity`, `CommercialOpportunity`, `CommercialGoal`, `Referral` e `Notification` usam metadados canônicos: id, tenantId, timestamps, version e soft-delete.

## Dados de demonstração

Com `NEXT_PUBLIC_DEMO_MODE=true` e V2 ativa, o ambiente recebe somente uma base mínima: contatos, qualificações, membros HOT40, atividades e uma meta. Em ambiente normal, a V2 começa vazia.

## Human Validation

1. Definir `NEXT_PUBLIC_DOMAIN_MODE=commercial-v2` no Preview da branch.
2. Confirmar o menu V2 e a ausência dos módulos legados.
3. Criar um Contact, qualificar, incluir no HOT40 e registrar atividade.
4. Confirmar a data derivada exibida sem campos para semana, mês ou ano.
5. Atualizar a página e confirmar persistência.
6. Definir o modo como `legacy` e confirmar que o 7Protect anterior continua abrindo.

Não iniciar a V2-SPEC 02 antes da aprovação humana desta base.

## Checkpoint de revisão da fundação, 08/10/2026

- Qualificar não inclui automaticamente no HOT40. A inclusão é uma ação explícita e preserva o Contact.
- Requalificação atualiza a entidade vinculada. A conversão em cliente marca a participação HOT40 como convertida.
- Serviços verificam contato, tenant, soft-delete, tipo, status e data da atividade antes de persistir.
- Datas são normalizadas para ISO. Relatórios usam calendário America/Sao_Paulo; ano civil e ano ISO da semana são separados.
- Agregadores cobrem tipo, status, semana, mês, ano, origem e consultor. Conversões contam pessoas distintas presentes nas duas etapas realizadas. Base vazia retorna percentual nulo, nunca uma conversão inventada.
- Formulários preservam conteúdo após erro, exibem a mensagem e bloqueiam envio durante a gravação.
- O carregamento comercial aguarda a configuração da corretora. Demo V2 começa somente com tenant/identidade e seed comercial mínimo, sem popular o domínio legado.
- Testes críticos: `node --test tests/commercial-aggregations.test.mjs` (Node 24).

### Alternância para homologação

`NEXT_PUBLIC_DOMAIN_MODE=commercial-v2` ativa a V2. `legacy` (ou ausência) preserva a experiência anterior. A alteração requer novo build/deploy; não é uma migração de dados. No Vercel, o override fica restrito ao Preview da branch `v2/commercial-domain`.

A SPEC permanece aguardando Human Validation. A V2-SPEC 02 não foi iniciada.

### Evidências e limites da revisão

Typecheck, lint (zero erros, cinco avisos preexistentes), build V2 e os três testes de agregação passaram. A checagem automatizada de navegador não executou: Chromium ausente e download bloqueado/truncado neste ambiente. Persistência após refresh, responsividade e a alternância funcional entre V2 e legacy devem ser confirmadas na Human Validation do Preview. Não registrar esses itens como homologados antes da validação.

## Correções finais da Human Validation, 08/10/2026

- Entrada no HOT40 exige qualificação `qualified` no mesmo tenant. Pendentes e não qualificados não recebem o botão e são bloqueados no service e nos repositories de Contact/HOT40.
- Repositories comerciais especializados validam dentro de transações IndexedDB. A criação concorrente de duas participações ativas é bloqueada.
- Requalificação para pendente/não qualificado ou exclusão da qualificação encerra a participação e devolve contatos HOT40 ao Mercado Base, preservando os registros como histórico removido.
- Ao carregar a visão comercial, vínculos inconsistentes criados pela versão anterior são corrigidos de forma transacional e idempotente, sem exclusão de histórico.
- Drawer: Planejada mostra `Data agendada` e grava `scheduledAt`; Realizada mostra `Data realizada` e grava `completedAt`. Atividades realizadas podem preservar um agendamento anterior como histórico, mas agrupamento, ordenação e exibição utilizam `completedAt`.
- Planejada não aceita data realizada. Realizada exige data realizada, inclusive na chamada direta ao repository. Semana, mês e ano continuam derivados.
- Suíte `npm test`: testes de service/repository com IndexedDB em memória, concorrência, isolamento de tenant, qualificação excluída, reparo de registros anteriores e semântica de datas, além dos testes existentes de agregação.
- V2-SPEC 02 permanece não iniciada. A aprovação humana continua pendente deste checkpoint.
