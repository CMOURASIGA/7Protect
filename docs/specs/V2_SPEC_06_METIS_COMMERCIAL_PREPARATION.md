# V2-SPEC 06 - Metis Comercial, preparação

Status: implementação autorizada, checkpoint pendente de Human Validation. Branch: `v2/commercial-domain`. Base funcional homologada: `6f3ad36c72e6de7c9aa6cea9a37bf6323aa6802f` (V2-SPEC 05 APPROVED).

## 1. Objetivo e fronteira

Metis Comercial é um copiloto explicável para a rotina diária do consultor. Lê fatos comerciais já consolidados nas SPECs 01 a 05, interpreta o contexto, explica prioridades e recomenda ações que o usuário poderá executar nas telas existentes. Não cria uma segunda fonte de verdade, um novo cálculo de KPI ou uma automação autônoma. O usuário registra os fatos; o sistema calcula Agenda, HOT40, indicadores e alertas; Metis apresenta uma leitura fundamentada.

A Metis já existente para diagnóstico, perguntas de reunião e revisão de proposta (`SPEC_05_METIS_AI_ASSISTANT.md`) pertence ao fluxo de planejamento do cliente. A interface e o serviço comercial devem distinguir essa finalidade, preservar análises históricas e reutilizar apenas a infraestrutura de provider, sanitização, validação de saída, tratamento de falhas e controle de custos que for compatível. O nome `V2-SPEC 06` não altera o escopo da antiga `SPEC 06` da linha legacy.

## 2. Perguntas do primeiro recorte

| Pergunta | Fonte canônica | Resposta e destino |
| --- | --- | --- |
| O que preciso fazer hoje? Quais atividades estão atrasadas? | Agenda da SPEC 05, `planned` com `scheduledAt` | Atividades de Hoje e Atrasadas, prazo em São Paulo, Contact e ação de abrir a atividade existente. |
| Quem devo priorizar? Por que esse contato merece atenção? | `attention` e `causes` da Central, com HOT40 e atividades | Ordem homologada, motivo e severidade da causa, data e próximo passo; abrir Contact ou atividade. |
| Quais contatos estão parados? | Projeção HOT40 parado da SPEC 05 | Contact, última interação realizada ou entrada no HOT40, dias sem interação e ação para abrir o Contact. |
| Onde estou abaixo da meta? Como está meu desempenho nesta semana? | `commercialDashboard` e projeção de expectativa da SPEC 05 | Semana comercial atual, produção, meta, gap e expectativa proporcional, deixando claro quando um gap mensal ou de semana futura não é um alerta atual. |
| Qual é meu maior gargalo? | `report.bottleneck` homologado | Exatamente `type`, `previousType`, `converted`, `denominator`, `conversion` e `period` do Funil, com link para a mesma visão. |

O conjunto é inicial, não um chat livre sobre dados não estruturados. Perguntas equivalentes podem usar o mesmo caso de uso. Uma pergunta fora do escopo deve declarar a limitação. Metis não infere motivo psicológico, capacidade de compra, necessidade de produto ou causa de ausência de interação sem dado que sustente a afirmação.

## 3. Contrato de leitura e identidade do fato

Fluxo proposto: `UI -> MetisCommercialService -> CommercialFactProjection -> minimização -> provider opcional -> validação -> apresentação`. O serviço consulta os repositories do tenant por meio dos serviços existentes. `operationalOverview()` e `commercialDashboard()` fornecem projeções, mas a preparação da implementação deve separar uma leitura pura de qualquer reconciliação de Notification: perguntar à Metis não pode marcar, resolver, reabrir ou criar notificações. A reconciliação normal da Central continua com seu fluxo próprio. UI e provider não consultam Dexie diretamente.

O pacote de fatos deve conter `tenantId` apenas dentro da fronteira local, `asOf` (instante UTC), timezone `America/Sao_Paulo`, escopo `{year, month, week, consultant?, origin?}`, política aplicável e uma lista tipada de fatos. Cada fato contém `kind`, `sourceType`, `sourceId` local, período ou data operacional, dados numéricos já calculados, estado atual e destino de navegação validado. A resposta usa referências aos fatos por identificadores efêmeros do pacote, nunca inventa links ou IDs. O serviço valida de novo tenant, existência e status antes de abrir uma ação. Não aceitar um Contact de outro tenant ou registro removido.

Agenda usa `scheduledAt` para atividades planejadas; interação realizada usa `completedAt`. Semana 1–5 vem exclusivamente de `commercialMonthWeek` no fuso de São Paulo. Filtros por consultor ou origem não comparam produção filtrada à meta geral. O gargalo comercial deve ser o mesmo objeto retornado pelo Dashboard para o mesmo tenant, ano, mês e conjunto de atividades. A prioridade da Central é: vencidas, compromissos de hoje, HOT40 parado, HOT40 sem próxima ação, meta semanal abaixo e gargalo. Metis não reordena os fatos para contrariar essa regra sem dizer expressamente que fez um recorte solicitado pelo usuário.

Respostas não devem tratar uma Notification `read` como causa resolvida; o estado ativo vem da causa calculada. Usar o snapshot do momento da pergunta e exibir `Atualizado em`. Ao atualizar fatos relevantes ou trocar filtro/período, obter novo snapshot; uma resposta anterior deve ser identificada como histórica ou desatualizada, sem fingir que reflete o presente.

## 4. Explicabilidade e resposta

Contrato conceitual de saída, sujeito a revisão antes da implementação:

```ts
type CommercialAnswer = {
  questionType: "today" | "overdue" | "priority" | "stalled" | "weekly_performance" | "bottleneck" | "contact_attention";
  summary: string;
  asOf: string;
  scope: { year: number; month: number; week?: 1 | 2 | 3 | 4 | 5; consultant?: string; origin?: string };
  items: Array<{
    explanation: string;
    recommendation?: string;
    factRefs: string[];
    action?: { label: string; targetRef: string };
  }>;
  limitations: string[];
};
```

Cada afirmação verificável deve apontar para pelo menos um fato. Número, etapa, status, severidade, prazo, percentual, denominador e convertidos devem coincidir com a projeção. Uma recomendação é distinguida dos fatos e conduz à tela que permite ao usuário decidir e agir. Se faltar meta, base de conversão ou evidência suficiente, responder `Sem base` ou `Não há dados suficientes`, sem inventar comparação. Se não houver pendências, dizer isso com o período da leitura. Não afirmar que uma atividade foi concluída, uma notificação resolvida ou uma ação executada porque a Metis a sugeriu.

Para o gargalo, a resposta deve poder mostrar: `Abordagens Marcadas`, `vindos de ABPhone`, `0 de 5 contatos`, `0%`, usando o mesmo `bottleneck` exibido pelo Funil. Se o objeto mudar de etapa após novos fatos, a resposta nova acompanha a etapa nova; a resposta antiga conserva seu `asOf` e não aparece como estado atual.

## 5. Limites de ação, privacidade e provider

Metis Comercial é somente leitura sobre fatos comerciais. Nem o modelo nem sua resposta têm ferramenta ou endpoint de escrita para mover estágio, concluir/cancelar/reagendar atividades, alterar benchmark, inserir/remover HOT40, resolver notificação ou editar cadastro. Links apenas abrem a tela ou o drawer; a confirmação e a gravação permanecem nas ações existentes do usuário. Não oferecer um botão de execução automática nesta SPEC.

Preferir resposta determinística para perguntas cuja resposta já é uma projeção direta. Se o provider de IA for usado para resumir ou explicar, enviar somente o mínimo necessário: rótulo operacional ou alias de Contact quando suficiente, fatos agregados e referência efêmera. Não enviar CPF, telefone, e-mail, endereço, apólice, texto livre de notas, dados financeiros ou de saúde do planejamento, nem IDs internos/tenantId para a IA por padrão. A navegação faz a correspondência dos aliases localmente. Sanitizar também a saída e rejeitar IDs, ações ou números que não estejam nos fatos permitidos. O texto de Contact/atividade é dado não confiável e não pode instruir o modelo nem sobrepor regras do sistema.

Usar o provider `fake` em demo/testes. Provider real somente pelo endpoint server-side e configuração explícita, com chave fora do browser, timeout e falha recuperável. A falha ou indisponibilidade da IA deve manter a Agenda, a Central e os indicadores funcionando e apresentar uma leitura determinística útil. Registrar uso e falhas sem payload bruto ou identificadores pessoais. Definir limite de tamanho, timeout e cota por tenant antes de ativar chamadas reais; não habilitar IA paga automaticamente nesta preparação.

## 6. UX proposta

Entrada contextual no Dashboard V2 e na Agenda, com perguntas iniciais selecionáveis e campo de pergunta restrito aos casos suportados. Resposta em blocos curtos: conclusão, fatos que a sustentam, recomendação e ação de navegação. Mostrar período, fuso, filtros e horário da leitura. Em Contact/HOT40, a pergunta `Por que este contato merece atenção?` recebe o `contactId` da tela, com escopo verificado pelo serviço. Em telas estreitas, manter as mesmas explicações e ações acessíveis por toque e teclado. A antiga Metis de planejamento continua contextual ao cliente e à proposta.

Não criar caixa genérica de mensagens, notificações externas, IA agendada ou monitoramento com navegador fechado. Resposta de IA não é fato comercial e não alimenta indicador, alerta ou timeline.

## 7. Persistência e evolução

Para o primeiro recorte, fatos e respostas atuais podem ser derivados sob demanda. Se houver histórico de consultas, persistir apenas metadados mínimos, escopo, fingerprint do conjunto minimizado, horário, provider/modelo, uso e resultado validado com referências, em entidade específica ou evolução compatível de `AiAnalysis`, sempre com `tenantId`, versão e migração explícita. Nunca persistir o prompt bruto com dados do Contact. Definir retenção e exclusão antes de implementar histórico. Nenhuma migração de schema é autorizada nesta fase de preparação.

Uma futura integração cloud deve preservar tenant e referências, sem usar nomes exibidos como chave. A identidade de um fato é a origem operacional existente; Metis não cria um segundo registro de atividade, benchmark, membership ou notificação.

## 8. Critérios de aceite para uma implementação futura

1. As oito perguntas do recorte têm resposta útil e referenciada, com estado vazio/sem base e link correto.
2. Para um mesmo snapshot, Funil, Central e Metis apresentam o mesmo gargalo em etapa, origem, convertido, denominador, percentual e período; mudança de gargalo não deixa resposta atual obsoleta.
3. Metis reproduz Agenda, prioridades e semana comercial com fuso São Paulo; leitura não modifica atividade, Contact, HOT40, Notification ou benchmark, inclusive quando a pergunta é repetida ou a IA falha.
4. Filtro de consultor/origem não compara produção filtrada a meta geral. Respostas históricas mostram `asOf` e escopo.
5. Tenant cruzado, Contact excluído, fonte inexistente, output inventado ou prompt injection em notas não produzem fato nem link válido.
6. Provider fake, indisponibilidade e fallback determinístico são verificáveis. Evidência de minimização e custos não expõe payload bruto.
7. Desktop e mobile permitem ler fatos e abrir destinos. Testes de domínio, integração/repository, schema e falhas, regressão das SPECs 01–05, typecheck, lint, build comercial V2 e `git diff --check` passam.

## 9. Human Validation planejada

No ambiente demo, preparar agenda vencida, hoje e futura; HOT40 parado e sem ação; benchmark positivo e zero; funil com denominador >= 5. Perguntar as oito perguntas e confrontar cada número e data com Agenda, HOT40, Visão Semanal e Funil. Abrir um destino e confirmar que só o usuário pode concluir/reagendar/editar. Mudar o gargalo, atualizar e comparar a nova resposta com Funil/Central; preservar a resposta anterior como histórica. Repetir a pergunta e recarregar, conferindo ausência de alterações nos fatos. Simular indisponibilidade do provider, falta de dados e tentativa de instrução em texto não confiável. Validar desktop e mobile; registrar explicitamente `NOT TESTED` onde a cobertura não for executada.

## 10. Gate

Gate da preparação, já cumprido pela autorização de implementação do usuário: a implementação depende de aprovação explícita deste recorte. Histórico persistido e provider real exigirão decisões próprias de retenção, custo e ativação antes de serem habilitados. Não alterar `develop` ou `main`; não iniciar SPEC 07 V2.

## 11. Checkpoint de implementação autorizado

O desenvolvimento foi autorizado após a preparação. Primeiro recorte: oito intents controladas, com botões e pergunta digitada equivalente. A resposta é construída pela projeção determinística de fatos e não depende de IA paga. Não há persistência de consultas nem migração de schema. `readCommercialMetisInput` lê repositories sem chamar `commercialOverview` ou `operationalOverview`, pois ambos podem reconciliar dados; `answerCommercialQuestion` usa `operationalAttention` puro. As perguntas não atualizam Notification, atividade, benchmark, Contact ou membership. A UI apresenta `asOf`, semana comercial, fontes e links existentes. HOT40 fornece `contactId` no drawer para a pergunta contextual. Perguntas fora do recorte recebem limite explícito.

Human Validation do checkpoint: preparar o cenário da Agenda; consultar as oito perguntas, incluindo a contextual no detalhe de um Contact HOT40; comparar Hoje, Atrasadas, prioridade e parado com a Agenda/Central; comparar semana e meta zero com a Visão Semanal; comparar etapa, convertidos, denominador e conversão com o Funil. Tratar uma atividade, consultar novamente e confirmar atualização sem ação autônoma. Alterar o gargalo se possível e conferir a resposta atual; testar refresh, pergunta fora do escopo, desktop e mobile. Registrar `NOT TESTED` para cobertura não executada. O checkpoint permanece pendente de Human Validation e aprovação explícita, sem iniciar V2-SPEC 07.
