# SPEC 03 - Diagnóstico, Planejamento e Propostas

## Objetivo

Digitalizar o formulário de levantamento, transformar suas informações em dados estruturados e permitir que a corretora registre sua análise profissional e monte propostas versionadas.

## Princípio obrigatório

O sistema deve separar claramente:

1. dados informados pelo cliente;
2. dados calculados pelo sistema;
3. análise e decisão da corretora;
4. conteúdo fixo de apresentação.

Nenhum campo de análise profissional deve ser gravado como se fosse declaração do cliente.

## Ciclo de planejamento

Cada cliente pode possuir vários ciclos.

Exemplo:

```text
Cliente
  -> Planejamento 2026
  -> Revisão 2027
  -> Revisão 2028
```

Cada ciclo possui seu próprio diagnóstico, análise, proposta e relatório.

## Diagnóstico digital

Dividir o formulário em etapas.

### 1. Identificação

- nome completo;
- data de nascimento;
- idade derivada;
- estado civil;
- profissão;
- empresa;
- contato;
- endereço quando necessário.

### 2. Família

- cônjuge;
- filhos;
- dependentes;
- idade/data de nascimento;
- relação;
- dependência financeira;
- observações.

### 3. Trabalho e renda

- renda principal;
- renda do cônjuge;
- renda extra;
- total de renda familiar calculado;
- estabilidade/observações de renda quando informadas.

### 4. Despesas

- despesa mensal familiar;
- compromissos fixos relevantes;
- observações.

### 5. Patrimônio

- imóveis;
- veículos;
- empresa/participações;
- outros bens;
- valor estimado;
- liquidez quando aplicável.

### 6. Reservas e investimentos

- reservas;
- investimentos;
- previdência privada;
- finalidade declarada;
- valor aproximado.

### 7. Dívidas e compromissos

- tipo;
- saldo aproximado;
- parcela mensal;
- prazo;
- observações.

### 8. Seguros e proteção existentes

- seguradora;
- produto/tipo;
- cobertura;
- capital segurado;
- prêmio;
- vigência;
- observações.

### 9. Saúde

Deve suportar os pontos do formulário atual, como:

- prática de atividade física;
- medicamentos controlados;
- cirurgias;
- diagnóstico de doença grave;
- histórico familiar de doenças graves;
- tabagismo;
- observações complementares relevantes ao atendimento.

A modelagem deve permitir ampliar perguntas sem migration destrutiva do domínio.

### 10. Objetivos e prioridades

- manutenção do padrão de vida;
- invalidez;
- doenças graves;
- educação dos filhos;
- sucessão/legado;
- formação patrimonial;
- outros objetivos;
- ordem de prioridade;
- horizonte de tempo;
- valor-alvo quando informado.

### 11. Revisão

Exibir resumo antes da conclusão.

Campos faltantes devem ser sinalizados.

## Salvamento

- autosave de rascunho;
- status `draft`, `completed`, `reopened`;
- permitir retomada posterior;
- conclusão exige ação explícita;
- concluir diagnóstico dispara criação de tarefa em `A calcular`.

## Planejamento da corretora

Criar área exclusiva para interpretação profissional.

Campos/blocos mínimos:

- resumo do caso;
- prioridades identificadas;
- hipóteses de planejamento;
- necessidade estimada por objetivo;
- prazo considerado;
- observações de cálculo;
- recomendações a validar;
- perguntas pendentes;
- notas internas não exibidas ao cliente.

## Cálculos

Implementar camada de cálculo separada da UI.

Cálculos iniciais possíveis:

- renda familiar total;
- despesa anual;
- percentual de comprometimento do prêmio sobre renda;
- capital total das coberturas;
- investimento mensal e anual;
- necessidade estimada definida manualmente ou por fórmula configurada.

Não inventar regras atuariais ou comerciais específicas da MetLife sem fonte formal.

## Seguradoras e produtos

Criar catálogo configurável.

Entidades mínimas:

- insurer;
- product;
- coverageType.

O MVP pode vir com dados demo da MetLife, mas nada deve depender de `MetLife` em código.

## Proposta

Uma proposta pertence a um ciclo de planejamento e possui versões.

Campos por versão:

- número da versão;
- status;
- data;
- observação geral;
- coberturas;
- total mensal;
- total anual;
- capital total protegido;
- percentual da renda comprometida;
- data de apresentação;
- motivo de revisão quando houver.

## Cobertura

Campos mínimos:

- insurerId;
- productId;
- coverageType;
- label exibido ao cliente;
- objetivo associado;
- capital segurado;
- prazo/vigência;
- prêmio mensal;
- descrição;
- observação da corretora;
- ordem de exibição.

## Versionamento

Regras:

- proposta apresentada não pode ser sobrescrita;
- editar versão apresentada deve gerar nova versão;
- versão antiga permanece acessível;
- relatório deve apontar exatamente para a versão usada;
- fechamento referencia uma versão específica.

## Fechamento

Ao marcar como `Fechado`:

- registrar versão aceita;
- registrar data;
- mover pipeline;
- registrar evento de histórico;
- criar data de revisão sugerida opcional.

## Critérios de aceite

- formulário completo pode ser preenchido e retomado;
- conclusão cria card em `A calcular`;
- dados declarados e análise profissional ficam separados;
- cliente pode possuir mais de um ciclo;
- proposta suporta várias versões;
- somatórios são consistentes;
- MetLife não está hardcoded como única seguradora;
- fechamento aponta para versão específica;
- build, lint e typecheck passam.

## Checkpoint humano

Usar pelo menos um caso demo completo do início ao fim:

1. cliente;
2. diagnóstico preenchido;
3. análise da corretora;
4. proposta v1;
5. proposta v2;
6. versão selecionada para apresentação;
7. fechamento.
