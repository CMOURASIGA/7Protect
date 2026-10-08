# V2-SPEC 03 - HOT40, Kanban e Atividades

Base: `7df32fadcb56bd544acee9e27b8cb40b48838bc6` na branch `v2/commercial-domain`.

## Entrega

- HOT40 operacional reúne memberships ativos com o mesmo Contact nas visões Lista e Kanban.
- Etapa comercial pertence ao membership. Migração IndexedDB v8 adiciona eventos de mudança de etapa com identidade, horário, origem, destino e contexto. Entrada no HOT40 gera evento inicial. Movimentação e evento são gravados na mesma transação.
- Seis etapas fixas. Recomendação continua como atividade. Mudança de etapa pede contexto no drawer e pode ser feita por seleção acessível ou arraste no desktop.
- Atividades planejadas usam `scheduledAt`, realizadas usam `completedAt`. A timeline combina eventos de etapa e atividades por Contact. Próxima ação deriva das atividades planejadas e última interação das realizadas.
- Semana, mês, ano e indicadores continuam derivados das atividades persistidas. Qualificação e parâmetros da SPEC 02 permanecem como condição de entrada.

## Human Validation

1. No Mercado Base, qualificar um contato e adicioná-lo ao HOT40. Confirmar uma única entrada na carteira e etapa ABPhone.
2. Em Lista, criar atividade planejada com data/hora futura. Confirmar próxima ação e `scheduledAt` na timeline. Confirmar que não consta como realizada.
3. Criar atividade realizada com data/hora. Confirmar última interação e `completedAt` na timeline, além do tempo parado.
4. Mover o card para Abordagem Marcada, preencher o contexto no drawer e confirmar. Repetir para outra etapa. Abrir Detalhes e conferir origem, destino, data/hora e contexto dos eventos.
5. Alternar Lista e Kanban. Conferir o mesmo nome, etapa, próxima ação e ações do mesmo Contact. Mover pelo seletor no mobile e por arraste no desktop.
6. Atualizar a página. Conferir a persistência de atividades, eventos e etapa, sem Contact duplicado. Verificar a origem do catálogo de parâmetros.
7. Validar desktop, tablet e mobile, inclusive rolagem horizontal das seis colunas no Kanban.

Status: implementada, aguardando Human Validation. Não iniciar V2-SPEC 04 antes da aprovação.
