# V2-SPEC 05 - Agenda Operacional, Alertas e Notificações

Status: READY FOR HUMAN VALIDATION. Base homologada: `f6b7f6d7c03ff5fc6554ee0d307d3300619d9539`. Branch: `v2/commercial-domain`.

Este documento registra o recorte funcional aprovado, a implementação da SPEC 05 e o roteiro de validação. A SPEC 06 permanece bloqueada.

## 1. Contratos existentes e lacunas

- `CommercialActivity` já contém `planned | completed | cancelled`, `scheduledAt` e `completedAt`, mas a UI só cria atividades; não há serviço para concluir, cancelar ou reagendar o mesmo registro. `assertActivityDate` deve passar a validar explicitamente o estado cancelado e as transições.
- HOT40 mantém membership, etapa e eventos de movimentação. Próxima ação e última interação são derivadas das atividades, sem outro campo manual.
- O Dashboard usa `commercialMonthWeek` e `America/Sao_Paulo`; o funil e seus denominadores vêm de `commercialDashboard`. A SPEC 05 consome esses resultados, sem copiar fórmulas.
- `Notification` atual só tem `info | warning | success` e `unread | read`, sem referência estável, severidade ou resolução. O store IndexedDB já existe; será necessária migração de schema e normalização explícita dos registros antigos, se houver.

## 2. Agenda e ciclo da atividade

A Agenda é uma projeção de atividades `planned` ativas do tenant. Usa `scheduledAt` como instante, convertido para o calendário de São Paulo. Com `now` injetado nas regras:

| Faixa | Regra |
| --- | --- |
| Atrasadas | `scheduledAt < now`, ainda `planned` |
| Hoje | `scheduledAt >= now` e data local igual à de hoje |
| Próximas | data local posterior a hoje |
| Sem próxima ação | membership HOT40 `active`, Contact ativo, sem atividade `planned` com `scheduledAt >= now` |

Uma atividade atrasada pode coexistir com o alerta HOT40 sem próxima ação, mas a Central agrupa por Contact e destaca primeiro a atividade vencida para evitar duas chamadas visuais redundantes. A Agenda conserva a atividade vencida como item próprio. Excluir soft deleted, outros tenants e membership removido, pausado ou convertido da regra HOT40. Consultor e origem podem ser filtros futuros sem alterar o dado persistido.

Transições permitidas: `planned -> completed` (mesmo `id`, `scheduledAt` preservado, `completedAt` obrigatório), `planned -> cancelled` (mesmo `id`, `scheduledAt` preservado, `completedAt` ausente), `planned -> planned` para reagendar (mesmo `id`, novo `scheduledAt`). Estados terminais não voltam a `planned` nesta SPEC. Atividade criada diretamente como `completed` continua possível. Exigir motivo curto no cancelamento ou reagendamento e gravar evento de ciclo com `activityId`, tipo, data, valor anterior e novo, motivo, tenant e metadados de versão. Esse evento compõe a timeline; não cria outra atividade ou Contact. A atualização e seu evento devem ocorrer na mesma transação. Um retry com a mesma chave de comando não deve repetir a transição nem o evento.

## 3. Regras temporais e alertas

Uma função única de calendário comercial deve retornar `{year, month, week: 1..5, start, end}` usando `commercialMonthWeek` e `America/Sao_Paulo`. Semana 1 corresponde a dias 1–7, Semana 2 a 8–14, Semana 3 a 15–21, Semana 4 a 22–28, Semana 5 a 29–fim do mês. `start` é inclusivo, `end` é exclusivo. O mesmo intervalo guia benchmark, produção e futura reavaliação de alerta.

| Tipo | Causa e resolução determinística | Severidade inicial |
| --- | --- | --- |
| Atividade vencida | `planned` e `scheduledAt < now`; resolve ao concluir, cancelar ou reagendar para `>= now` | Atenção; Crítico somente após 48 horas de atraso |
| HOT40 sem próxima ação | membership e Contact ativos, sem `planned` futura; resolve ao planejar ação futura ou sair do HOT40 ativo | Atenção |
| HOT40 parado | sem atividade `completed` há 7 dias corridos, contados da última interação ou `enteredAt` se nunca houve; resolve após nova atividade realizada ou saída do HOT40 ativo | Atenção; Crítico após 14 dias |
| Meta semanal abaixo | meta da semana atual `> 0`, resultado homologado de `CommercialActivity` abaixo da expectativa temporal; resolve quando alcança a expectativa ou termina a semana | Atenção |
| Gargalo comercial | consumir `bottleneck` do Dashboard no mês corrente; emitir somente se denominador da etapa anterior `>= 5` contatos distintos e conversão `< 50%`; resolve se critério deixar de valer ou ao mudar o mês | Informação |

Os limites 7/14 dias, 48 horas, denominador 5 e taxa 50% ficam em um objeto de política por tenant com defaults versionados; a UI só lê a severidade calculada. Alterar a política exige recálculo, sem apagar a fonte. Sem benchmark configurado, meta zero ou benchmark legado não reconfigurado não geram alerta de desempenho. Não comparar produção filtrada por consultor ou origem com meta geral.

### Expectativa proporcional da semana

Para cada indicador da semana comercial **atual**, obter `target = weeklyTargets[week - 1]` e `actual` da mesma projeção que alimenta o Dashboard. Calcular `elapsed = clamp(now - start, 0, end - start)` em milissegundos absolutos, com instantes locais convertidos para UTC. `expected = floor(target * elapsed / (end - start))`. Emitir alerta apenas quando `expected > 0` e `actual < expected`. O início da semana não acusa automaticamente toda a meta como atraso. Reavaliar ao abrir, atualizar ou alterar dados; `now` é injetável para testes. Ao terminar a semana, resolver o alerta corrente; a Performance mantém o gap histórico, sem gerar notificação retroativa diária. Não usar número ISO de semana.

## 4. Central de atenção e navegação

Ordenar por classe nesta ordem: atividade vencida, compromisso de hoje, HOT40 parado, HOT40 sem próxima ação, meta semanal abaixo, gargalo. Dentro da classe, ordenar por severidade (`Crítico`, `Atenção`, `Informação`), prazo mais antigo e identificador estável. Compromisso de hoje é item derivado da Agenda, sem notificação persistida quando ainda não há problema. Agrupar alertas de um Contact na apresentação, preservar causas e referências separadas no domínio.

Cada item mostra motivo em linguagem simples, Contact quando aplicável, data/prazo, severidade, ação recomendada e destino real. Vencida: `Registrar realização`, `Reagendar`, `Abrir contato`; sem ação: `Planejar atividade`; parada: `Abrir contato`; meta e gargalo: abrir visão semanal/funil do Dashboard no período. Para Contact, link ou drawer deve usar o `contactId` existente, com validação de tenant. Navegação não resolve o alerta por si só.

## 5. Notification, idempotência e persistência

A notificação interna terá `id`, `tenantId`, `contactId?`, `type`, `severity`, `title`, `message`, `status: unread | read | resolved`, `createdAt`, `readAt?`, `resolvedAt?`, `sourceType`, `sourceId`, `occurrenceKey`, `updatedAt`, `version`, `deletedAt?`. Não duplicar `scheduledAt` ou benchmark: a origem permanece na atividade, membership ou resultado do Dashboard. O ciclo de leitura é persistido; a condição do alerta é derivada.

Chave estável `tenantId:type:sourceType:sourceId:occurrenceKey`. Para atividade, `sourceId = activityId` e ocorrência vinculada ao ciclo de planejamento, de modo que reagendamento que resolve e depois vence novamente pode gerar novo ciclo. Para HOT40, `sourceId = membershipId`; para meta, `activityType + year-month + week`; para gargalo, `stage + year-month`. O repository impõe unicidade da chave por tenant em transação. Reconciliar conjunto de causas ativas com notificações existentes: criar só quando ausente, manter `read` ao atualizar texto ou severidade, resolver quando causa desaparece. Uma causa que reaparece no mesmo ciclo reabre a mesma notificação de forma determinística; política de leitura reabre como `unread` apenas se havia sido `resolved`. Atualizar página repetidamente não muda contagem, `id` nem `createdAt`. Ler não equivale a resolver. Registros legados sem referência estável permanecem legíveis, mas não são reutilizados como notificações da SPEC 05; migração não inventa origem.

Reconciliar ao abrir Dashboard/Agenda, refresh e após comandos relevantes. Sem timer ou monitoramento com navegador fechado. Atividades, metas e HOT40 são a fonte da verdade; notificações não comandam estágio nem produção.

## 6. Implementação prevista

1. Acrescentar regra temporal e política de atenção em `domains/commercial` e serviço de projeção da Agenda em `application`; reutilizar agregação e funil existentes.
2. Implementar transições de atividade e eventos de ciclo no repository, com validação de tenant, status, versão e transação; exibir ações na Agenda e timeline existente.
3. Evoluir `Notification` e Dexie com migração segura e índice de chave de causa; criar reconciliador idempotente e ações de leitura.
4. Criar Agenda Hoje/Atrasadas/Próximas/Sem próxima ação e Central de atenção com destinos; exibir feedback após concluir, cancelar e reagendar.
5. Preparar dados demo reproduzíveis sem tocar em Contacts de produção, metas já configuradas ou registros históricos.

Não incluir IA, canais externos, mudanças automáticas de estágio, importação, polling em background nem SPEC 06.

## 7. Testes e Human Validation

Testes de domínio: fronteiras de hoje no fuso SP, virada do mês e dias 7/8, 14/15, 21/22, 28/29; meta zero, legado e expectativa proporcional no início, meio e fim da semana; `scheduledAt` preservado ao concluir; estados terminais; cancelamento/reagendamento com evento único; ausência de Contact cruzado entre tenants. Testes de repository: unicidade de causa, dez refreshes, leitura persistida, resolução e reabertura, migração sem origem inventada. Regressão do Dashboard, Funil e benchmark 1–5. Gates: testes, typecheck, lint, build comercial V2 e `git diff --check`.

Roteiro humano: criar planejada para hoje, futura e vencida; conferir as quatro faixas; concluir uma planejada e confirmar mesmo ID, `scheduledAt` e novo `completedAt`; cancelar e reagendar, verificando timeline e resolução; criar HOT40 sem ação e parado; configurar semana abaixo do esperado e semana com meta zero; atualizar dez vezes, conferir uma notificação por causa e preservar `read`; tratar causa e conferir `resolved`; abrir Contact pela notificação; checar Funil/Performance, desktop e mobile. Usar datas controladas em ambiente de demonstração para que o cenário seja reproduzível.

## 8. Gate

A V2-SPEC 06 depende de Human Validation e aprovação explícita da V2-SPEC 05.

## Implementação da SPEC 05

Status funcional: READY FOR HUMAN VALIDATION. A preparação acima foi implementada na branch `v2/commercial-domain`. A V2-SPEC 06 permanece bloqueada.

- A Agenda é a rota `/agenda`; a Central aparece no Dashboard e na Agenda. A configuração de limites fica em Configurações > Alertas. Ações no HOT40 e na Agenda usam o mesmo Contact e a mesma atividade.
- Comandos de ciclo recebem `commandKey`, `expectedVersion` e são persistidos junto com `ActivityCycleEvent` na transação Dexie. O evento mantém data anterior, data resultante, motivo, horário e versão resultante. Repetir uma chave devolve o resultado lógico original mesmo depois de uma transição posterior; uma chave reutilizada para outra ação é rejeitada.
- O schema Dexie v11 adiciona `activityCycleEvents`, `commercialAttentionPolicies` e índice composto para `Notification.causeKey`. Notificações preexistentes preservam id, conteúdo e status; recebem severidade informativa quando ausente e não ganham referência inventada. Somente novas causas da SPEC 05 entram na reconciliação.
- A semana proporcional usa o calendário comercial de São Paulo, com início inclusivo e fim exclusivo. A Central mostra atividade vencida antes da indicação sem próxima ação do mesmo Contact; ambas as causas continuam rastreáveis. Ao concluir a vencida, a indicação sem próxima ação passa a aparecer.
- Na Agenda do ambiente de demonstração, clicar em `Preparar cenário de validação`. O comando idempotente cria uma planejada vencida há dois dias para o primeiro HOT40, uma para hoje às 23h30 e outra para daqui a dois dias para o segundo. Não repete atividades com os marcadores de validação nem toca em metas. Atualizar, marcar a notificação lida, concluir ou reagendar a vencida e conferir resolução. Para HOT40 parado, registrar interação realizada com data anterior ao limite configurado e ajustar o limite em Configurações > Alertas se necessário. Os dados de produção não são sobrescritos.
