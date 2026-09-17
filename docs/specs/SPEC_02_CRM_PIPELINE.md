# SPEC 02 - CRM e Pipeline Comercial

## Objetivo

Implementar o núcleo comercial do 7Protect: leads, clientes, tarefas e Kanban operacional.

## Fluxo

`Lead -> Cliente -> Diagnóstico -> A calcular -> Em andamento -> Pronto para apresentação -> Apresentado -> Aguardando cliente -> Fechado/Não fechado`

## Leads

Campos mínimos:

- nome;
- telefone;
- e-mail;
- origem;
- indicação por;
- profissão;
- bairro/cidade opcional;
- observações;
- próxima ação;
- data da próxima ação;
- status;
- tags opcionais.

A tela deve permitir criar, editar, pesquisar, filtrar e arquivar.

## Promoção para cliente

Deve existir ação explícita `Converter em cliente`.

Ao converter:

- preservar ID de origem em `sourceLeadId`;
- copiar dados relevantes sem redigitação;
- registrar histórico;
- evitar duplicidade evidente por e-mail/telefone, exibindo alerta, sem bloquear automaticamente.

## Clientes

Cadastro permanente:

- nome;
- CPF opcional;
- data de nascimento;
- idade derivada;
- estado civil;
- telefone;
- e-mail;
- profissão;
- empresa;
- endereço opcional;
- status ativo/inativo;
- observações permanentes.

Dados de família e planejamento serão expandidos na SPEC 03.

## Kanban

Colunas mínimas:

- Novo lead
- Formulário em preenchimento
- A calcular
- Em andamento
- Pronto para apresentação
- Apresentado
- Aguardando cliente
- Fechado
- Não fechado

Requisitos:

- drag-and-drop em desktop;
- alternativa acessível por menu/botão;
- cada mudança de coluna gera `pipelineHistory`;
- registrar `fromStatus`, `toStatus`, `changedAt` e motivo opcional;
- `updatedAt` do card deve mudar;
- cards encerrados permanecem consultáveis.

## Criação automática de tarefa

Quando um diagnóstico for concluído na SPEC 03, criar automaticamente tarefa/card em `A calcular`.

Nesta SPEC, deixar service/handler preparado e coberto por teste.

## Card

Mostrar:

- nome do lead/cliente;
- tipo do card;
- etapa;
- data da última movimentação;
- próxima ação;
- atraso em dias quando houver;
- valor potencial opcional;
- indicador visual de prioridade opcional.

Evitar excesso de dados no card.

## Indicadores derivados

Criar selectors/services para fornecer:

- quantidade por etapa;
- conversão entre etapas;
- tempo médio por etapa;
- oportunidades sem movimentação há N dias;
- novos leads por período;
- fechamentos por período.

Esses serviços serão consumidos pelo Dashboard na SPEC 04.

## Histórico

Cada lead/cliente deve possuir timeline simples com:

- criação;
- conversão;
- conclusão de diagnóstico;
- mudanças de pipeline;
- criação/apresentação de proposta;
- fechamento.

Eventos podem ser registrados por tipo e payload reduzido.

## Critérios de aceite

- lead pode ser criado e convertido em cliente;
- dados não precisam ser redigitados na conversão;
- Kanban persiste localmente;
- movimentação gera histórico;
- refresh mantém posição do card;
- indicadores de contagem e aging são calculáveis;
- busca e filtros funcionam;
- mobile oferece forma utilizável de mudar etapa;
- build, lint e typecheck passam.

## Checkpoint humano

Validar com dados demo pelo menos:

- 8 leads;
- 5 clientes;
- cards distribuídos em várias etapas;
- 1 oportunidade atrasada;
- 1 fechamento;
- conversão de lead para cliente.
