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
