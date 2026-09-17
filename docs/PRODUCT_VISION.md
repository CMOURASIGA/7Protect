# 7Protect - Visão do Produto

## 1. Problema atual

O processo da corretora é executado de forma fragmentada:

1. o cliente é atendido como lead;
2. a corretora coleta dados pessoais, familiares, financeiros, patrimoniais e de saúde em formulário;
3. parte dessas informações é transcrita manualmente para uma apresentação;
4. a corretora complementa a apresentação com sua própria análise, cálculos, coberturas e valores;
5. a apresentação final é usada para explicar ao cliente a necessidade de proteção e o investimento mensal;
6. o acompanhamento posterior depende de controles manuais.

Há duplicidade de digitação, baixa rastreabilidade, ausência de histórico estruturado e pouca visão do funil comercial.

## 2. Proposta do 7Protect

O 7Protect será um CRM vertical para corretoras de seguros e consultoria de proteção financeira.

O produto organiza todo o ciclo de atendimento:

`Lead -> Cliente -> Diagnóstico -> Planejamento -> Proposta -> Apresentação -> Fechamento -> Carteira -> Revisão`

## 3. Premissas funcionais

### 3.1 CRM

O sistema deve registrar leads, origem, indicação, dados de contato, status, próximas ações e histórico.

Quando o lead avançar, deve ser possível promovê-lo a cliente sem redigitação.

### 3.2 Diagnóstico

O formulário atual será digitalizado e estruturado por seções. Os dados coletados devem permanecer associados ao cliente e a um ciclo de planejamento.

Categorias mínimas:

- dados pessoais;
- estado civil e composição familiar;
- cônjuge, filhos e dependentes;
- informações profissionais;
- renda e renda extra;
- despesas mensais;
- dívidas e compromissos;
- patrimônio;
- reservas e investimentos;
- previdência;
- seguros existentes;
- plano de saúde;
- informações de saúde relevantes ao processo;
- projetos, objetivos e prioridades familiares;
- observações da reunião.

### 3.3 Separação entre dado coletado e análise profissional

O sistema deve distinguir claramente:

- informação fornecida pelo cliente;
- cálculo derivado pelo sistema;
- análise e decisão preenchidas pela corretora;
- conteúdo fixo do template de apresentação.

Essa separação é obrigatória para evitar que inferências do corretor sejam tratadas como declarações do cliente.

### 3.4 Kanban

A conclusão do diagnóstico deve criar automaticamente uma tarefa no pipeline.

Pipeline inicial:

- Novo lead
- Formulário em preenchimento
- A calcular
- Em andamento
- Pronto para apresentação
- Apresentado
- Aguardando cliente
- Fechado
- Não fechado

Cada movimentação deve registrar data/hora para alimentar indicadores de funil e tempo de ciclo.

### 3.5 Planejamento e proposta

A corretora deve conseguir registrar sua análise e montar uma ou mais versões da proposta.

Cada versão deve armazenar no mínimo:

- objetivo atendido;
- seguradora;
- produto/cobertura;
- capital segurado;
- prazo/vigência;
- prêmio mensal;
- observação e justificativa;
- status da versão;
- data de criação e apresentação.

Uma nova versão nunca deve apagar a anterior.

### 3.6 Apresentação final

O relatório final deve ser gerado a partir dos dados estruturados do sistema.

Saídas previstas:

- apresentação web para uso na reunião;
- PDF para envio/arquivamento;
- PPTX como evolução futura, se comercialmente necessário.

O relatório não deve ser um arquivo editado manualmente dentro do sistema. Deve ser uma renderização de dados e templates versionados.

### 3.7 Carteira e acompanhamento

Após o fechamento, o cliente passa a compor a carteira da corretora.

O sistema deve permitir revisão periódica do planejamento, preservando o histórico anterior.

Exemplo:

- Planejamento 2026
- Revisão 2027
- Revisão 2028

Cada revisão reutiliza o cadastro permanente e cria uma nova fotografia financeira e de proteção.

## 4. Dashboards

### 4.1 Corretora

Indicadores mínimos:

- leads novos no período;
- formulários concluídos;
- propostas em cálculo;
- propostas prontas;
- propostas apresentadas;
- oportunidades aguardando cliente;
- fechamentos;
- taxa de conversão por etapa;
- tempo médio entre etapas;
- oportunidades paradas há mais de N dias;
- prêmio mensal contratado;
- capital total protegido;
- ticket médio;
- carteira ativa.

O funil deve ser um conjunto de indicadores derivados do Kanban, não um cadastro separado.

### 4.2 Cliente

O dashboard do cliente deve apresentar sua posição de proteção de forma compreensível, sem confundir seguro com investimento.

Indicadores possíveis:

- investimento mensal;
- investimento anual;
- capital total protegido;
- coberturas contratadas;
- objetivos protegidos;
- percentual da renda comprometida;
- linha do tempo das coberturas;
- próxima revisão.

Quando um produto possuir componente real de acumulação ou resgate, valores futuros devem ser identificados corretamente como garantidos, projetados, capital segurado ou valor de resgate.

## 5. Aegis - IA embarcada

Aegis será a assistente de IA do 7Protect.

Responsabilidades:

1. resumir o perfil do cliente após o diagnóstico;
2. identificar lacunas de proteção e pontos de atenção;
3. sugerir perguntas que o corretor ainda deveria fazer;
4. indicar temas e necessidades que merecem análise;
5. revisar uma proposta montada pelo corretor e apontar possíveis inconsistências entre objetivos e coberturas;
6. nunca substituir a decisão profissional do corretor.

A IA deve apoiar o raciocínio, não executar recomendação autônoma de produto como verdade definitiva.

## 6. Persistência e modelo comercial

O MVP será local-first.

### Local

- dados no navegador/equipamento;
- IndexedDB;
- backup manual/assistido;
- exportação JSON e XLSX;
- uso em outro computador não exibe os mesmos dados.

### Cloud

Evolução futura com Supabase:

- login;
- dados centralizados;
- acesso em vários dispositivos;
- sincronização;
- backup em nuvem;
- multiusuário;
- portal do cliente;
- auditoria ampliada.

A camada Cloud poderá ser tratada como recurso comercial adicional.

## 7. Whitelabel

Whitelabel é requisito de produto.

O sistema deve permitir parametrizar pelo menos:

- nome da corretora/empresa;
- logotipo;
- cor principal;
- cor de destaque;
- telefone;
- e-mail;
- informações institucionais usadas nos relatórios.

Nenhuma identidade específica da Isabela, MetLife ou Consult Services deve ficar hardcoded como única configuração possível.

## 8. Fora do MVP inicial

Não fazem parte da primeira entrega, embora a arquitetura deva permitir evolução:

- emissão/apólice integrada diretamente à seguradora;
- integração transacional com MetLife;
- cobrança recorrente;
- portal externo do cliente;
- multiusuário real;
- sincronização cloud;
- assinatura eletrônica;
- automação de WhatsApp;
- geração obrigatória de PPTX.
