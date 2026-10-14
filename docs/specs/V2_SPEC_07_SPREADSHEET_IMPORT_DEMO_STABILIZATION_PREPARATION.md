# V2-SPEC 07 — Importação da Planilha, Demo e Estabilização: preparação

Status: **AUTHORIZED FOR PREPARATION**. Branch exclusiva: `v2/commercial-domain`. Base funcional homologada: `5290e6687bbaed873f76485d4159e0d7d770c9e8` (V2-SPEC 06 APPROVED). Este documento define a implementação futura; **não autoriza executar importação, alterar schema ou iniciar outra SPEC**.

## 1. Fonte examinada e decisão de escopo

Arquivo examinado: `OFICIAL - Contatos e HOT40_vFinal.xlsm` (7 abas). A leitura considerou valores de célula, fórmulas e valores em cache, sem executar macros nem recalcular o arquivo. A aba `Mercado Base` tem cabeçalho em B6:O6 e **17 linhas com nome em B7:B23**. As demais linhas até 1000 incluem fórmulas pré-preenchidas, não contatos. Dez linhas têm `M = Sim`, sete `M = Não`; nove têm data de origem em N. Os 17 telefones foram armazenados como número, muitos têm quatro a seis dígitos e há valores repetidos. A linha 23 contém um número fracionário, inadequado para telefone. O arquivo concreto parece uma massa de teste (`Teste 1` a `Teste 17`), portanto o preview deve alertar sobre essa característica; jamais tratar o nome do arquivo como prova de que seus dados são reais.

`HOT40!B8` contém `CHOOSECOLS(FILTER('Mercado Base'!B:O,'Mercado Base'!M:M="Sim"),...)`. O cache disponível mostra `#VALUE!` nessa célula e não oferece nomes confiáveis nas linhas seguintes. Embora existam datas de etapas em P:AH, **não há chave verificável ligando cada uma dessas linhas a uma pessoa** no snapshot examinado. `Mercado Base!M` serve como intenção explícita de participação; nenhuma data da aba HOT40 deve ser vinculada automaticamente por posição de linha, ordem do filtro ou cache de fórmula. Uma exportação/revisão com identidade verificável por linha pode habilitar importação de histórico em lote posterior.

`Indicadores!D14:H20` contém metas semanais numéricas para sete indicadores; `I14:I20` soma as cinco semanas. É uma referência de benchmark, não resultado comercial. A aba também contém resultado e funil calculados; `Configuração1` repete fórmulas para até mil linhas, incluindo sentinelas como `sem nome`, `sem data` e até ano 1899 em caches. Esses valores não são fatos importáveis. `Matriz!C4:J9` já foi incorporada como parâmetros iniciais editáveis por tenant na SPEC 02.

| Aba | Conteúdo real observado | Política da implementação futura |
| --- | --- | --- |
| `Mercado Base` | 17 linhas preenchidas B7:N23; O é fórmula de mês preenchida também em centenas de linhas vazias | **Importar** B:N conforme a tabela de mapeamento e preview; ignorar O. Selecionar linha por conteúdo real e validar separadamente cada campo. |
| `HOT40` | Cabeçalho B7:AK7, B8 é fórmula dinâmica; datas P:AH e quantidade AI coexistem sem identidade confiável em cache | **Não importar linhas como pessoas ou atividades por padrão.** Participação vem de `Mercado Base!M`. Datas/observação só podem ser importadas após associação explícita e auditável com Contact e classificação semântica de cada fato. |
| `Planilha2` | Sem valores | Não importar. |
| `Indicadores` | Metas em D14:H20; totais em I; resultados/funil e outra grade semanal em B41:I54 | **Opt-in separado** para configurar benchmark do período escolhido pelo usuário, com preview e substituição explícita de metas existentes. Não importar resultados, totais, funil ou segunda grade como produção. |
| `Configuração1` | Espelho de HOT40, status, mês, ano e semana por fórmulas até a linha 1000 | Não importar; projeções derivadas no sistema. |
| `Funil Novembro` | Tabela e fórmulas agregadas do funil | Não importar; Dashboard calcula a partir de `CommercialActivity`. |
| `Matriz` | Catálogo C4:J9 e listas auxiliares | Não importar como registros. Usar somente para conferir os oito grupos de parâmetros do tenant, sem criar opções silenciosamente. |

## 2. Mapeamento célula por célula para o domínio canônico

Dados da aba `Mercado Base` começam na linha 7. `Contact` é a única identidade da pessoa. `ProspectQualification` armazena a qualificação; `Hot40Membership` referencia o mesmo `contactId`. Comparar rótulos da planilha com `CommercialParameter` ativo do grupo correto, normalizando somente espaço, caixa e acentos para busca; preservar o rótulo exibido. Sinônimos ou opções inativas precisam de mapeamento explícito, não de criação automática.

| Coluna | Cabeçalho original | Destino e transformação | Falha/revisão |
| --- | --- | --- | --- |
| B | Nome | `Contact.fullName`, trim, espaços internos normalizados | Vazio: `INVALID`; nome sozinho não autoriza matching. |
| C | Telefone (Opcional) | `Contact.phone` só se texto original preservável, convertido de forma verificável e número válido; normalização por dígitos para matching | Número fracionário, dígitos perdidos, curto ou ambíguo: não usar como chave; manter erro da célula no preview. Não inventar DDD/zero à esquerda. |
| D | Fontes de Prospecção | `ProspectQualification.sourceId`, referência a parâmetro `source` | Sem correspondência ativa: `NEEDS_REVIEW` e mapeamento explícito. `Contact.origin` legado não vira segunda fonte editável da qualificação. |
| E | Renda mensal estimada | `incomeBandId` (`income_band`) | Não converter faixa em `estimatedMonthlyIncome` numérico. Valor desconhecido exige revisão. |
| F | Idade | `ageRangeId` (`age_range`) | Faixa, não data de nascimento nem idade exata. |
| G | Profissão | `profession`, texto livre | Vazio impede qualificação `qualified`; pode manter Contact pendente. |
| H | Estado Civil | `maritalStatusId` (`marital_status`) | Valor desconhecido exige revisão. |
| I | Filhos | `childrenId` (`children`), converter 0, 1, 2, 3 numéricos inteiros para rótulos equivalentes | Fração e opção desconhecida exigem revisão. |
| J | Quantas Vezes Foi Visto no Último Ano | `contactFrequencyId` (`contact_frequency`) | Sem inferir quantidade de atividades; valor desconhecido exige revisão. |
| K | Facilidade para Abordagem Comercial | `approachEaseId` (`approach_ease`) | Normalizar Sim/Não para opção configurada; outros valores exigem revisão. |
| L | Capacidade de Gerar Referências | `referralPotentialId` (`referral_potential`) | Não criar recomendação ou Referral a partir de potencial. |
| M | Virou HOT40? | `Sim` solicita membership do mesmo Contact após qualificação válida; `Não` não remove membership existente | Campo ausente/desconhecido: revisão. Se qualificação incompleta, não forçar entrada em HOT40. |
| N | Data de origem | `ProspectQualification.originDate`, data civil `YYYY-MM-DD` validada | Nove datas preenchidas, oito vazias neste arquivo. Data ausente/inválida impede `qualified` e HOT40 até decisão/complemento. |
| O | Mês de origem | **Derivado** por `originMonth(originDate)` | Ignorar fórmula/cache e não persistir mês separado. |

| Aba `HOT40`, coluna | Conteúdo | Regra condicional para uma futura associação de linha validada |
| --- | --- | --- |
| B:N | Identidade/atributos trazidos por fórmula de `Mercado Base` | Não criar segundo Contact nem sobrescrever qualificação a partir do cache. O (comentários) pode virar nota somente após identidade confiável e revisão de conteúdo. |
| P, S, V, Y, AB, AE, AH | Data de ABPhone, abordagem marcada, abordagem realizada, fechamento marcado, fechamento realizado, proposta e data final | A data isolada não distingue sempre agendamento de execução. **Pendente de revisão semântica por campo e linha**, mesmo com Contact ligado; não criar atividade automaticamente nesta preparação. Se o fato for confirmado, mapear a um tipo de `CommercialActivity` e escolher `scheduledAt` para planned ou `completedAt` para completed, nunca ambos por suposição. |
| Q, T, W, Z, AC, AF, AJ | `Pendente`/`Concluído` por fórmula | Não importar como status de atividade; o cache pode discordar do fato. |
| R, U, X, AA, AD, AG, AK | Semana do ano por fórmula | Ignorar; `commercialMonthWeek` define Semana 1–5 pela data em São Paulo. |
| AI | Qtd. de Recomendações | Agregado sem pessoa recomendada nem eventos individuais; **não gerar N atividades** nem Referral. |

`Indicadores!B14:B20` mapeia respectivamente a `ab_phone`, `approach_scheduled`, `approach_completed`, `closing_scheduled`, `closing_completed`, `proposal`, `recommendation`. `D:H` corresponde às Semanas Comerciais 1–5; `I` é soma derivada, não entrada. Exemplo observado para ABPhone: `20 | 10 | 20 | 20 | 10 = 80`. A planilha não fornece um ano/mês inequívoco para tornar essas metas configuração permanente do tenant: no opt-in, o usuário escolhe ano/mês e vê destino e diferenças antes de confirmar. `Indicadores!B41:I54` é outra grade semanal, com semântica distinta e até semanas 6–13, e não deve substituir o benchmark homologado. Resultado, gap e atingimento continuam derivados de atividades e benchmark no Dashboard.

## 3. Parser, identidade e classificação

Pipeline planejado: `arquivo local → parser XLSM sem executar macro → linhas fonte com coordenada/valor/tipo/fórmula → validação → matching dentro do tenant → preview → decisões explícitas → commit transacional por grupo → relatório`. Processar somente o formato e as abas conhecidas da versão de regra. Limitar tamanho, linhas e tempo; rejeitar arquivo corrompido, formato diferente ou macro como instrução executável. Nunca enviar a planilha nem PII à Metis/IA. Não guardar o binário bruto no domínio operacional.

Matching determinístico por tenant: (1) telefone íntegro e válido normalizado; (2) e-mail válido normalizado, embora esta planilha não contenha coluna de e-mail; (3) nome normalizado **mais outro atributo independente e suficientemente discriminante** pode propor candidato, mas não resolve automaticamente quando esse atributo é uma faixa compartilhada ou não há identidade forte; (4) inconclusivo vai à revisão. Mesmo identificador que aponte para dois Contacts, conflito entre telefone e e-mail, duplicação no arquivo, ou um número curto como `2222` resulta em revisão. Não usar nomes `Teste 1` como chave. Revalidar matching no commit contra o estado atual da base, inclusive concorrência.

Cada linha recebe um estado principal e motivos/células auxiliares:

| Estado | Significado e ação padrão |
| --- | --- |
| `NEW_CONTACT` | Identidade suficiente, sem correspondência/conflito; pode criar Contact depois de confirmação. Um nome válido sem identificador pode ser novo **somente após decisão expressa** e aviso de risco de duplicidade. |
| `MATCHED_EXISTING` | Identificador forte aponta univocamente para Contact do tenant; associar sem trocar ID. Atualização de campo só com diff e aprovação. |
| `POSSIBLE_DUPLICATE` | Candidatos conflitantes/duplicação dentro do arquivo ou da base; selecionar Contact ou pular. Nunca merge por nome. |
| `INVALID` | Fato impossível ou obrigatório ausente, com coordenada e motivo; não grava a linha até correção. |
| `SKIPPED` | Linha vazia, fórmula auxiliar, linha descartada ou já aplicada sem mudança; registrar motivo. |
| `NEEDS_REVIEW` | Identidade ou parâmetro/data/qualificação/HOT40 inconclusiva; usuário completa, mapeia, cria pendente ou ignora. |

O estado principal não esconde resultados parciais: cada linha expõe Contact, qualificação e participação HOT40 como operações separadas e dependentes. Nunca classificar `MATCHED_EXISTING` como licença para sobrescrever notas, origem, parâmetros ou status mais recentes. Havendo conflito, mostrar lado a lado planilha, sistema e decisão `manter atual / aplicar valor / ignorar linha`. Valor vazio não apaga valor existente por padrão. Uma qualificação incompleta pode permanecer `pending` após aprovação explícita; `M = Sim` fica pendência e não contorna o gate da SPEC 02. A etapa inicial de novo membership é `ab_phone`, como no serviço homologado; uma etapa diferente exige prova associada ao Contact e decisão explícita, com evento de movimentação rastreável. Não criar Cliente, oportunidade ou transição automática a partir da planilha.

## 4. Datas, idempotência, transação e auditoria

Datas de origem são datas civis, sem hora. Validar calendário gregoriano e salvar `YYYY-MM-DD`; mês deriva da data. Para eventual evento com hora, interpretar na zona `America/Sao_Paulo`, resolver horários inexistentes/ambíguos explicitamente e persistir ISO UTC. Uma data Excel serial só é válida após conferir sistema de datas do workbook, tipo bruto e conversão, sem confiar em formatação visual. Para uma data comercial válida, Semana Comercial 1 = dias 1–7, 2 = 8–14, 3 = 15–21, 4 = 22–28 e 5 = 29–fim, via `commercialMonthWeek` existente. Não reutilizar as fórmulas `WEEKNUM` da planilha.

Planejar stores de `ImportBatch` e `ImportRowResult`/`ImportOperation` via repository, com `tenantId`, metadados (`id`, `createdAt`, `updatedAt`, `version`), `ruleVersion`, nome/tamanho do arquivo, fingerprint SHA-256 do **binário**, autor/processo, início/fim, status (`previewed`, `committing`, `completed`, `partial`, `failed`, `rolled_back_partially`), totais analisado/criado/atualizado/associado/HOT40/qualificado/ignorado/erro/revisão. Persistir decisão, coordenada, fingerprint SHA-256 de aba + linha + valores tipados canônicos + versão da regra e IDs resultantes, diffs de campos e versões antes/depois. Evitar armazenar PII duplicada em resultado; mostrar detalhes sensíveis a partir de referências ao Contact quando possível. Hash de arquivo não substitui matching de pessoa.

Fingerprint do arquivo identifica reupload idêntico; fingerprint de registro e ID da operação identificam repetição do lote. No commit, resolver/remapear cada linha e verificar o registro de operação e membership ativo sob transação. Uma reexecução idêntica retorna o lote e seus resultados, sem novos Contacts, memberships ou atividades. Se arquivo foi alterado, criar novo lote e reconciliar pelo Contact; não usar número de linha sozinho como identidade. Deduplicar dentro do arquivo antes de commit. Um lote pode terminar `partial`, mantendo sucesso e erro por linha; nenhuma linha ruim interrompe as outras. Operações correlatas de uma linha (Contact, qualificação, membership, auditoria) devem ser atômicas ou deixar pendência explícita sem membership órfão. Usar versão otimista/conflito no commit e reanálise quando a base mudou desde o preview. Após recarga, continuar mostrando o relatório e as decisões pendentes.

Rollback: oferecer **assistido por operação do lote**. Só desfazer criação se o Contact/membership/qualificação ainda tiver a versão registrada e nenhum vínculo/atividade/edição posterior. Atualização de Contact já existente só pode ser revertida com diff anterior, versão atual igual à versão importada e confirmação; caso contrário manter dado e apontar conflito humano. Nunca apagar um Contact real, evento de timeline, atividade ou edição posterior por cascade. Um lote parcialmente revertido registra IDs revertidos, preservados e motivo. Recomenda-se snapshot técnico/export antes de confirmar primeiro lote real; reset da Demo é fluxo separado e restrito. A futura implementação precisa definir o tratamento de tombstones do repository antes de oferecer botão de rollback.

## 5. UX proposta e relatório

Fluxo em Configurações ou área dedicada: `Selecionar .xlsm → Analisar (sem gravação) → Preview por aba e linha → Resolver conflitos → Confirmar importação → Relatório do lote`. Indicadores no preview: linhas candidatas e ignoradas, novos, existentes, possíveis duplicados, inválidos, revisão, intenção HOT40, qualificação completa/pendente e metas opt-in. Mostrar aviso de `#VALUE!` na fórmula HOT40 e bloqueio de associação automática das datas. A revisão permite filtrar motivo, inspecionar valor bruto/transformado com coordenada, mapear parâmetro do tenant, atribuir Contact ou pular. Ao escolher aplicar a qualificação/benchmark, exibir diff e exigir confirmação específica. Desabilitar confirmar enquanto há decisões obrigatórias sem resolução; permitir importação parcial das linhas resolvidas com declaração de pendências.

O relatório persistido mostra total analisado, Contacts criados/associados/atualizados, qualificações, HOT40 incluídos, metas opcionais, ignorados, erros e conflitos/revisões, com detalhe por linha e referência ao Contact. Indicar o que **não** foi importado e por quê. Números reconciliam com os estados finais, não com contagens preliminares do preview. Tela deve oferecer reabrir lote, exportar resumo sem arquivo original e iniciar rollback assistido quando seguro. Não expor dados de outro tenant.

## 6. Demo reproduzível

Separar banco/sessão de demonstração por `demoDatabaseName()` e verificar `isDemoMode()` antes de qualquer preparo ou reset. IDs/namespace determinísticos, marcador de origem demo e rotina idempotente. Dados demonstrativos identificáveis, sem usar linhas da planilha ou dados pessoais reais. Preparar poucos contatos distintos: um no Mercado Base pendente, um qualificado ainda fora do HOT40, um HOT40 com atividade futura, outro com atividade vencida e notificação, um parado/sem próxima ação e um pequeno funil com denominador suficiente para gargalo. Benchmark semanal 1–5 do mês demonstrado, produção parcial e meta zero em outro indicador. Uma atividade planejada pode ser concluída no mesmo registro durante apresentação. Metis apenas lê essas projeções e explica a Central/Funil.

Roteiro da demo: cadastrar → qualificar com parâmetros → adicionar ao HOT40 → planejar atividade → localizar na Agenda → identificar atraso e próxima ação → observar benchmark e gargalo no Dashboard → resolver causa na Central → perguntar à Metis e abrir o fato. Para permitir demonstração em outra data, gerar datas relativas ao relógio comercial de São Paulo em cada preparo de **nova sessão** e fixar o relógio para testes; não mudar datas da mesma sessão a cada refresh. Reset exige confirmação, só atua no banco demo isolado e nunca na base operacional real. Garantir que preparo repetido conserva IDs e quantidade; documentar o que o reset apaga.

## 7. Estabilização e aceite futuro

Executar inventário de rotas/estados e testes ponta a ponta de SPECs 01–06: Mercado Base, qualificação, parâmetros/Configurações, HOT40 Lista/Kanban e arraste, timeline, Agenda/atividade no mesmo registro, Central/notifications idempotentes, Dashboard mensal/semanal 1–5, Funil/Performance, Metis de leitura. Revisar navegação direta e refresh com query string, loading, vazio, erro recuperável, datas em São Paulo, ações e persistência. Corrigir problemas encontrados com registro de antes/depois; nenhuma alteração de regra homologada por conveniência visual.

Rodada mobile real e desktop nas mesmas tarefas, incluindo importação: Dashboard, Mercado Base, HOT40 Lista/Kanban e rolagem horizontal indicada, drawers e CTAs, Agenda, Central, Metis, Configurações, preview/revisão/relatório. Testar toque, teclado, foco, contraste, textos longos e ausência de overflow não intencional. Registrar dispositivo/viewport/browser e `PASS`, `FAIL` ou `NOT TESTED`, com evidência; as coberturas mobile anteriores não são presumidas aprovadas.

Gates para a implementação **após revisão desta preparação**: testes de parser XLSM e valores reais versus cache; matching (inclusive colisões e tenant), parâmetro desconhecido, datas/serial, deduplicação interna e externa, idempotência de arquivo/linha/concorrência, commit parcial/retomada, rollback assistido e proteção a edições posteriores; regressão SPECs 01–06; typecheck; lint; `NEXT_PUBLIC_DOMAIN_MODE=commercial-v2 npm run build`; `git diff --check`. Publicar somente em `v2/commercial-domain` quando a implementação for autorizada.

## 8. Roteiro previsto de Human Validation

1. Analisar o arquivo original sem gravar; conferir 17 linhas de Contact candidatas, 10 intenções de HOT40, nove datas de origem e aviso do cache `#VALUE!` da aba HOT40. Verificar que fórmulas pré-preenchidas não contam como pessoas.
2. Ver linha com telefone curto/repetido e linha 23 com número fracionário; confirmar revisão e ausência de merge por nome. Testar contato existente por telefone válido formatado de outro modo; confirmar mesmo `contactId`.
3. Alterar uma opção de parâmetro para valor desconhecido e mapear explicitamente; verificar que nenhuma opção nova nasce sozinha. Conferir faixas, profissão, origem e data civil; incompleta fica pendente e não entra no HOT40.
4. Resolver conflito e confirmar parte das linhas; validar totais de criados, associados, inválidos, ignorados e revisão no relatório. Conferir que um erro não perde os sucessos e que houve confirmação antes da gravação.
5. Confirmar `M = Sim` somente para Contact qualificado e membership único na etapa inicial `ab_phone`; não criar atividades fictícias a partir das datas HOT40 sem associação validada ou de `Qtd. De Recomendações`.
6. Optar por benchmark do período selecionado e conferir `20 | 10 | 20 | 20 | 10 = 80`; não importar resultados/funil da planilha. Meta existente requer diff e confirmação.
7. Importar o mesmo arquivo novamente, atualizar a página e reabrir o lote; validar IDs/contagens preservados e zero duplicatas. Alterar um Contact após importar e verificar que rollback assistido preserva a edição e relata conflito.
8. Preparar/repetir/resetar a Demo isolada, percorrer todo o fluxo até Metis e comprovar que Contact, Agenda, Central e Dashboard mostram os mesmos fatos.
9. Regressão funcional das SPECs 01–06 e rodada desktop/mobile das telas e do importador, documentando falhas ou itens não executados.

## 9. Limites e decisões a revisar

O snapshot disponível não permite validar associação das linhas `HOT40!P:AH` a pessoas. A implementação deve manter esse histórico bloqueado ou exigir fonte corrigida e associação manual auditável; nunca contornar o bloqueio por alinhamento de linhas. A planilha não tem e-mail nem identificador externo estável; matching por telefone só vale com número íntegro, e muitas linhas exigirão revisão. O arquivo examinado contém nomes de teste e telefones inválidos, portanto a primeira Human Validation deve tratar a importação como ensaio controlado. A opção de benchmark é separada e não altera produção.

Ficam fora da SPEC: IA paga adicional, automações autônomas, canais externos, integração bancária, Supabase definitivo, autenticação de produção, migração cloud e alteração de `develop` ou `main`. A arquitetura continua `UI → services/domain → repositories → IndexedDB`, substituível futuramente por provider cloud.
