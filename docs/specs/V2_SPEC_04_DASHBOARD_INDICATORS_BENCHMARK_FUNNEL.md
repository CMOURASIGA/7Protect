# V2-SPEC 04 - Dashboard, indicadores, benchmark e funil

Base homologada: `2e1534bef4e43a757ce63026e8cc79ae45414921`, branch `v2/commercial-domain`.

## Domínio e cálculo

- A produção resulta exclusivamente de `CommercialActivity`. Ligações, atividades realizadas, propostas e recomendações contam quando `completed`. Abordagens e fechamentos marcados contam quando agendados (`planned`) ou realizados (`completed`). Canceladas não contam.
- Datas planejadas usam `scheduledAt`; realizadas usam `completedAt`. Semana ISO, mês e ano são derivados no fuso operacional America/Sao_Paulo.
- Benchmark por tenant, ano, mês e tipo de atividade, com metas semanais e mensais configuráveis. Índice único lógico e validação no repository. Zero ou ausência de meta exibe percentual sem base e impede divisão por zero.
- Gap = realizado menos benchmark. Atingimento = realizado / benchmark × 100 quando benchmark > 0. Filtro de consultor ou origem mostra a produção filtrada, mas omite a comparação com a meta geral da corretora.
- O funil conta contatos distintos por tipo no mês. Conversão entre etapas = contatos que tiveram atividade na etapa seguinte em data igual ou posterior à etapa anterior / contatos na etapa anterior. Se a base anterior for zero, a taxa é indisponível. Maior gargalo é a menor conversão com denominador válido.
- As linhas da Visão do Mês e da Visão Semanal abrem os registros que formam cada resultado. Nenhum resultado pode ser digitado. O Dashboard não modifica Contact, HOT40 ou timeline.

## Human Validation

1. Abrir Dashboard V2. Selecionar ano e mês com produção conhecida. Conferir os cards e as sete linhas: ABPhone, abordagens marcadas/realizadas, fechamentos marcados/realizados, propostas e recomendações.
2. Configurar benchmarks semanais e mensais para o período. Conferir realizado, gap e atingimento. Deixar uma meta em zero e confirmar “Sem base”. Atualizar a página e conferir persistência.
3. Abrir “Ver atividades” em uma linha. Conferir o Contact, situação, horário e observação contra as atividades no HOT40. Uma ligação apenas planejada não deve entrar na produção de ligações.
4. Conferir semanas com produção e semanas vazias no mês. Trocar o mês e ano e conferir que os totais e metas mudam com o período.
5. Abrir Funil. Conferir contatos distintos, denominador e maior gargalo. Em um período vazio, confirmar taxas indisponíveis.
6. Conferir Performance e filtros por consultor e origem. Ao filtrar, conferir a produção e a ausência de comparação com benchmark geral.
7. No Kanban, conferir a indicação e a rolagem horizontal. Testar arraste no desktop, preencher contexto e conferir histórico. Validar Lista, Kanban, drawer e Dashboard em viewport mobile, inclusive a rolagem das colunas e da tabela.

Status: implementada, pendente de Human Validation. SPEC 05 somente após aprovação explícita.

## Correção de checkpoint: semanas comerciais e benchmarks

- O mês selecionado tem exatamente cinco semanas comerciais: Semana 1 (dias 1–7), Semana 2 (8–14), Semana 3 (15–21), Semana 4 (22–28) e Semana 5 (29 até o último dia). A regra é independente do dia da semana e do número ISO da semana. Uma semana sem atividades permanece visível.
- A data operacional da atividade é `scheduledAt` quando planejada e `completedAt` quando realizada, interpretada em `America/Sao_Paulo`. A função `commercialMonthWeek` em `application/commercial-aggregations.ts` é a fonte única para Dashboard, benchmark, agregações mensais e futuros alertas.
- Cada indicador e mês guarda `weeklyTargets` com cinco inteiros não negativos. A meta mensal é sempre a soma desses cinco valores, sem campo mensal persistido ou editável. Meta semanal zero exibe `Sem base` no atingimento. Com filtro por consultor ou origem, não se aplica a meta geral da corretora.
- O upgrade IndexedDB v9 para v10 preserva os campos antigos em `legacyWeeklyTarget` e `legacyMonthlyTarget`, remove os campos antigos ativos e não distribui valores automaticamente. Esses registros exibem benchmark `Não configurado` até o usuário informar explicitamente cinco metas. O drawer avisa que há metas legadas e exige preenchimento das cinco semanas antes de salvar. Ao salvar, os campos legados desse indicador são removidos.

### Human Validation do checkpoint

1. Configure ABPhone - Ligações com `20 | 10 | 20 | 20 | 10`. Confirme o total mensal `80` no formulário e na Visão do Mês.
2. Confira Semana 1 a Semana 5, inclusive semanas vazias, com as metas individuais, gaps e percentuais respectivos.
3. Configure zero para uma semana e confirme `Sem base`, sem divisão por zero.
4. Atualize a página e confirme que as cinco metas e a soma persistem.
5. Registre atividades em datas distintas do mês e confira a distribuição, a soma mensal e `Ver atividades`.
6. Confira Funil, maior gargalo, Performance e filtros de origem/consultor; produção filtrada não recebe benchmark geral.
7. Em uma base anterior v9 com metas existentes, confira o aviso de legado, ausência de comparação e reconfiguração explícita.
8. Confira desktop e mobile, inclusive a indicação de rolagem horizontal do Kanban.

A V2-SPEC 05 permanece bloqueada até nova aprovação explícita da V2-SPEC 04.
