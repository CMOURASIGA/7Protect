# V2-SPEC 07 — Implementação e validação

Base: `675d81cf2367914daffa59dd5f6abf9dbf0205ba` em `v2/commercial-domain`. Este checkpoint depende de Human Validation. Não iniciar etapa posterior.

## Fluxo

`/importacao`: selecionar `.xlsm`, analisar em memória, revisar cada linha, confirmar e consultar relatório persistido. Análise/preview não escreve dados operacionais. O parser lê ZIP/XML, valores brutos, shared strings e fórmulas sem executar macros nem confiar em cache. Tamanho máximo: 15 MB. Abas conhecidas: Mercado Base, HOT40, Indicadores, Matriz. A fórmula/caches da HOT40 é apenas aviso; suas datas nunca geram atividade.

Matching por tenant usa telefone íntegro de 10 a 13 dígitos normalizados. Mesmo telefone em arquivo e base ou nome coincidente vira candidato de revisão; nome isolado jamais associa automaticamente. E-mail está preparado no domínio Contact, mas a planilha examinada não possui coluna de e-mail. Números curtos, fracionários ou repetidos não identificam pessoa. Toda linha exige decisão explícita de criar, associar ou ignorar; aplicar campos de Contact e qualificação em existente são escolhas separadas. A qualificação incompleta fica pendente, e a intenção HOT40 não contorna seu gate. Membership novo entra em `ab_phone`, com único Contact e evento de entrada. Nenhuma atividade ou recomendação agregada é importada.

Benchmark opcional usa somente `Indicadores!D:H` para os sete tipos, no ano/mês escolhido. O total deriva da soma. Substituir benchmark existente exige checkbox explícito, com metas antigas e novas visíveis. Resultado, gap, Funil e outras grades não são importados.

## Persistência e segurança de repetição

Schema IndexedDB 12 adiciona `importBatches` e `importOperations`, sem modificar stores anteriores. SHA-256 do binário identifica o lote por tenant; SHA-256 da linha tipada e `operationKey` identificam cada operação. Uma transação por linha reúne Contact, qualificação, membership, evento e operação auditada; benchmark possui transação independente. Reimportação do mesmo lote preserva IDs, e revisão/erro parcial pode ser retomado. Versão de Contact/qualificação/benchmark é conferida na transação após o preview. A auditoria registra IDs, coordenadas, estados, versões e snapshots mínimos necessários para reversão assistida, não o arquivo bruto.

Rollback confere versão e vínculos posteriores, incluindo atividades, oportunidades, referências, movimentações e operações de outro lote. Conflito preserva dados e aparece no resultado. Quando seguro, reverte o registro criado ou restaura os valores anteriores. O reset da Demo é isolado pelo banco de sessão `demoDatabaseName` e não atua sobre banco operacional. A preparação de cenário já existente da Agenda cria contatos fictícios e atividades identificáveis de forma idempotente, com meta e funil; a página Importação oferece acesso a preparar/resetar a sessão demo e percorrer Mercado Base, Agenda/Central e Dashboard/Metis.

### Correção do checkpoint: reset comercial

O reset comercial usa `resetCommercialDemoScenario()` e uma transação própria do repository. O reset global `resetDemo()` continua reservado à reinicialização completa do banco da demonstração legada; os botões da V2 chamam somente o reset do cenário comercial. Cada registro criado pela preparação nova recebe `demoScenarioKey` e a versão no momento da criação. O reset verifica versão, tenant e vínculos antes de excluir Contacts e suas dependências identificadas. Edição manual, associação a lote e vínculos não pertencentes ao cenário preservam o Contact e todas as suas dependências. Benchmarks e metas só são removidos se marcados pelo preparo e ainda na versão marcada. `importBatches` e `importOperations` nunca entram na transação de exclusão. Após o reset, a preparação idempotente recria o cenário.

Registros demonstrativos criados antes desta marcação não são assumidos por nome, e-mail ou data. São preservados por segurança; em uma sessão nova, a preparação gera registros com proveniência explícita. Uma interrupção entre criação e marcação também preserva o registro não marcado. O resultado do reset informa os IDs preservados por conflito.

## Roteiro para Human Validation

1. Na sessão Demo, abrir Importação e selecionar `OFICIAL - Contatos e HOT40_vFinal.xlsm`. Antes de confirmar, ver 17 linhas, 10 intenções HOT40, 9 datas, aviso de `#VALUE!` e nenhum novo Contact.
2. Verificar telefone curto, repetido e fracionário na linha 23. Associar um Contact existente somente por decisão explícita. Alterar um parâmetro no tenant e mapear opção desconhecida; revisar diff planilha x sistema.
3. Criar uma linha qualificada e pedir HOT40: mesmo Contact, etapa `ab_phone`, um membership. Criar linha com data de origem vazia e pedir HOT40: Contact pendente, pendência no relatório, nenhum membership. Confirmar zero atividades criadas das datas HOT40.
4. Configurar benchmark opt-in para ano/mês escolhido: ABPhone `20 | 10 | 20 | 20 | 10 = 80`. Ver metas existentes antes de substituir. Conferir Dashboard derivado, sem importar realizado.
5. Confirmar parcialmente com erro/pendência. Reabrir relatório, atualizar página, reenviar o mesmo arquivo e verificar IDs/quantidades. Corrigir decisão de uma linha com erro e retomar.
6. Tentar rollback seguro, depois editar um Contact ou criar atividade e tentar rollback: alteração posterior deve permanecer, com conflito registrado. Checar que outro lote associado ao mesmo Contact impede exclusão.
7. Preparar demo duas vezes: mesma quantidade de contatos e atividades. Percorrer Mercado Base, qualificação, HOT40, Agenda, Central, Dashboard, Funil e Metis. Resetar somente a sessão Demo.
8. Regressão SPECs 01–06: lista/Kanban e arraste, timeline, ciclo de atividade, alertas idempotentes, benchmark Semana 1–5, Funil/Performance e respostas da Metis. Conferir navegação/refresh.
9. Rodada desktop e mobile: Dashboard, Mercado Base, HOT40 Lista/Kanban, drawers, Agenda, Central, Metis, Configurações e fluxo completo da Importação. Registrar dispositivo, viewport, navegador, resultado `PASS`, `FAIL` ou `NOT TESTED` com evidência. Mobile não deve ser presumido aprovado a partir de teste unitário ou CSS.
10. Reteste focal: após importação e rollback com conflito, clicar em `Resetar cenário demonstrativo`. Confirmar que Contact preservado, ImportBatch, ImportOperation, benchmark importado e conflito permanecem após refresh. Conferir remoção/recriação apenas dos IDs marcados para demo. Repetir reset e preparo, sem duplicação. Conferir navegação e regressão das SPECs 01 a 06.

## Gates

Executar `npm test`, `npm run typecheck`, `npm run lint`, `NEXT_PUBLIC_DOMAIN_MODE=commercial-v2 npm run build` e `git diff --check`. O status real dos gates e do Preview deve ser informado no retorno do checkpoint, sem alegar Human Validation automática.
