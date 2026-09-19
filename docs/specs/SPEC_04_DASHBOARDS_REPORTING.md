# SPEC 04 - Dashboards e Relatórios

## Objetivo

Entregar as duas visões principais do produto: gestão da corretora e visão individual do cliente, além da geração da apresentação final em web/PDF.

## 1. Dashboard da corretora

### Indicadores principais

- leads novos no período;
- diagnósticos concluídos;
- em cálculo;
- em andamento;
- prontos para apresentação;
- apresentados;
- aguardando cliente;
- fechados;
- não fechados;
- taxa de conversão;
- tempo médio até proposta;
- tempo médio até fechamento;
- prêmio mensal contratado;
- capital total protegido;
- ticket médio de prêmio;
- carteira ativa.

### Funil

O funil deve ser derivado dos eventos do Kanban.

Não criar cadastro paralelo de funil.

Mostrar quantidade e percentual por etapa, com filtro por período.

### Aging

Exibir oportunidades sem movimentação por faixas, por exemplo:

- 0 a 3 dias;
- 4 a 7 dias;
- 8 a 14 dias;
- acima de 14 dias.

Permitir abrir os cards correspondentes.

### Evolução temporal

Gráficos mínimos:

- leads x propostas x fechamentos por mês;
- prêmio mensal contratado por mês;
- capital protegido por mês.

Não usar gráficos meramente decorativos.

## 2. Dashboard do cliente

Cabeçalho:

- nome;
- status;
- planejamento atual;
- próxima revisão;
- última proposta apresentada;
- ações rápidas.

### Resumo financeiro

Quando disponível:

- renda familiar;
- despesa mensal;
- patrimônio resumido;
- reservas;
- dívidas;
- percentual de comprometimento da proposta.

### Proteção

- investimento mensal;
- investimento anual;
- capital total protegido;
- coberturas por categoria;
- objetivos protegidos;
- vigências;
- gaps identificados pelo corretor/Metis.

### Linha do tempo

Exibir:

- início do relacionamento;
- diagnósticos;
- versões apresentadas;
- fechamento;
- vigências relevantes;
- revisões periódicas.

### Futuro financeiro

Somente exibir projeções quando houver dados formais suficientes.

Distinguir visualmente:

- capital segurado;
- valor garantido;
- valor projetado;
- valor de resgate;
- prêmio pago.

Nunca usar o título `ganho` para capital segurado sem contexto.

## 3. Relatório/apresentação

O sistema deve gerar uma apresentação a partir do ciclo e da versão de proposta selecionados.

Estrutura inicial sugerida:

1. capa whitelabel;
2. objetivos do planejamento;
3. dados pessoais/familiares relevantes;
4. dados financeiros consolidados;
5. diagnóstico e prioridades;
6. planejamento definido pela corretora;
7. proposta de proteção;
8. coberturas e finalidades;
9. investimento mensal/anual;
10. resumo final;
11. dados de contato da corretora;
12. informações institucionais configuráveis.

A sequência pode ser refinada após validação com a cliente.

## 4. Fontes dos dados no relatório

Cada bloco deve declarar em código/schema sua origem:

- `clientProvided`
- `systemCalculated`
- `brokerAnalysis`
- `templateStatic`

Isso facilita auditoria e manutenção do template.

## 5. Apresentação web

Criar rota de visualização em modo apresentação.

Requisitos:

- layout limpo;
- navegação próxima/anterior;
- modo fullscreen quando suportado;
- responsivo para notebook e tablet;
- sem controles administrativos desnecessários na tela de apresentação.

## 6. PDF

Gerar PDF consistente com a apresentação.

Requisitos:

- identidade whitelabel;
- paginação previsível;
- não cortar tabelas/coberturas no meio quando evitável;
- data e versão da proposta;
- nome do cliente;
- total mensal e capital segurado claramente separados.

A implementação pode usar renderização HTML para PDF ou biblioteca adequada, desde que gere resultado estável.

## 7. Snapshot

Ao gerar relatório final de uma proposta apresentada, armazenar `reportSnapshot` com:

- proposalVersionId;
- generatedAt;
- templateVersion;
- dados consolidados necessários para reproduzir o relatório.

O objetivo é evitar que alterações futuras no cadastro mudem silenciosamente um relatório histórico.

## 8. Critérios de aceite

- dashboard da corretora usa dados reais do pipeline local;
- funil reage às movimentações de cards;
- aging identifica oportunidades paradas;
- dashboard do cliente consolida diagnóstico e proposta;
- apresentação web é gerada sem redigitação;
- PDF corresponde à versão selecionada;
- proposta antiga continua reproduzível por snapshot;
- whitelabel aparece no relatório;
- build, lint e typecheck passam.

## Checkpoint humano

Validar lado a lado:

1. dashboard da corretora;
2. dashboard de um cliente demo;
3. apresentação web;
4. PDF gerado;
5. diferença visual entre duas versões de proposta.
