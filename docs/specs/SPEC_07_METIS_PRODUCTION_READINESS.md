# SPEC 07 - Metis Production Readiness

## Status

**APROVADA — METIS PRODUCTION READY**

- Human Validation aprovada.
- SHA homologado: `f8c731d27d0d8243a914b978fd91c4fffe19dd6d`.
- A SPEC 08 está liberada somente para planejamento e confirmação final de escopo. Sua implementação continua bloqueada até nova autorização explícita.

## Objetivo

Levar a Metis do estado arquitetural e de homologação para condição real de uso com provider OpenAI, preservando integralmente a arquitetura entregue na SPEC 05.

Esta SPEC não reconstrói a Metis, não altera dados de domínio e não implementa cobrança. O foco é validar e completar a operação real do provider, a segurança do contexto enviado, a persistência das análises e o comportamento seguro diante de falhas.

## 1. Escopo e limites

Validar e completar:

- provider OpenAI real;
- endpoint exclusivamente server-side;
- `OPENAI_API_KEY` somente em ambiente seguro;
- ausência de segredo no browser;
- sanitização efetiva do payload;
- schema de resposta e tratamento de resposta inválida;
- timeout, retry e indisponibilidade do provider;
- histórico das análises;
- vínculo com cliente, planejamento e versão da proposta;
- `inputFingerprint`, provider e modelo utilizados;
- controle de chamadas, tokens ou uso quando disponíveis;
- desabilitação da Metis sem impacto no restante do produto.

Não implementar nesta SPEC:

- novo assistente ou chat genérico;
- alteração automática de diagnóstico, proposta, fechamento ou catálogo;
- recomendação automática de fechamento;
- cobrança, plano comercial ou consumo automático sem ação explícita do usuário;
- Cloud, migração ou troca do provider de persistência.

## 2. Provider real e segurança

O provider OpenAI deve permanecer atrás do Route Handler server-side existente. A chave `OPENAI_API_KEY` deve existir somente no ambiente seguro e nunca deve ser exposta por bundle, endpoint público, log, erro de tela ou histórico local.

O provider deve ser habilitado por configuração explícita. Quando estiver desabilitado, ausente ou indisponível, CRM, diagnóstico, planejamentos, propostas, Carteira, Relatórios e Metis histórica devem continuar acessíveis.

O payload encaminhado ao provider deve ser mínimo e sanitizado. Não pode conter:

- nome, CPF, telefone, e-mail ou endereço;
- número de apólice;
- IDs internos, UUIDs ou `tenantId`;
- campos de interface, logs ou metadados sem utilidade para a análise.

Dados de saúde só podem ser enviados quando forem estritamente necessários ao contexto solicitado e devem ser reduzidos ao mínimo útil, sem identificação pessoal.

## 3. Evidência técnica do payload

Criar evidência técnica própria para homologação, sem registrar segredo nem payload bruto identificável. A evidência deve permitir confirmar:

- tipo da ação Metis;
- versão de sanitização ou contrato aplicado;
- campos ou categorias enviados;
- campos sensíveis removidos;
- `inputFingerprint`;
- provider, modelo, duração e uso quando disponíveis;
- resultado de validação do schema;
- categoria de erro quando houver falha.

Não registrar API key, texto bruto de campos removidos ou informação identificável desnecessária.

## 4. Ações disponíveis

Validar as três ações com provider real, podendo usar o caso Rafael da SPEC 06.

### 4.1 Analisar diagnóstico

A Metis deve:

- resumir fatos fornecidos;
- identificar pontos de atenção e lacunas;
- sugerir perguntas úteis;
- diferenciar fato informado de inferência;
- informar claramente quando faltarem dados;
- não inventar fatos, produtos, condições ou informações pessoais.

### 4.2 Revisar proposta

A revisão deve analisar a versão exata selecionada e permanecer vinculada ao cliente, planejamento e proposta correspondentes.

Validar objetivos versus coberturas, capital, prêmio, lacunas, inconsistências e questões que o corretor precisa revisar.

A Metis não pode:

- inventar condição de seguradora ou produto;
- alterar a proposta ou suas coberturas;
- recomendar fechamento automaticamente;
- tratar capital segurado como investimento, saldo ou rendimento.

### 4.3 Preparar próxima reunião

As perguntas devem ser contextualizadas, curtas e úteis. Devem se relacionar a informações faltantes ou decisões pendentes e não repetir perguntas já respondidas sem justificativa.

## 5. Contrato de resposta e falhas

A resposta do provider deve passar pelo schema validator antes de ser persistida ou exibida. Respostas malformadas ou fora do schema devem resultar em mensagem compreensível e opção de retry, sem perda de dados de CRM, diagnóstico ou proposta.

Simular e validar:

- chave ausente;
- erro da API;
- timeout;
- resposta inválida;
- schema inválido.

Em todos os cenários:

- o restante do 7Protect permanece operacional;
- a análise falha de forma isolada e compreensível;
- o usuário pode executar retry quando aplicável;
- nenhuma alteração de domínio é feita pela Metis;
- o histórico anterior continua preservado.

## 6. Histórico, contexto e imutabilidade

Depois de cada análise, persistir ao menos:

- data e hora;
- tipo da ação;
- cliente e planejamento de origem;
- versão da proposta, quando aplicável;
- provider e modelo utilizados;
- resultado estruturado validado;
- `inputFingerprint`;
- status, duração e métrica de uso disponível.

Após refresh e reabertura, o histórico deve continuar acessível.

Ao alterar informação relevante do diagnóstico e executar novamente a análise, o novo resultado deve ter outro `inputFingerprint`. O resultado antigo deve permanecer preservado, associado ao contexto que o originou.

## 7. Controle de consumo

Registrar pelo menos:

- quantidade de chamadas;
- provider;
- modelo;
- tokens ou uso retornado pelo provider, quando disponíveis;
- estimativa ou métrica de consumo oferecida pela arquitetura.

Não implementar cobrança nesta SPEC. O objetivo é dar visibilidade operacional e permitir controle futuro.

## 8. Human Validation

Executar com provider OpenAI real:

1. concluir um diagnóstico;
2. executar `Analisar diagnóstico`;
3. confirmar que a resposta não inventa dados e indica lacunas;
4. executar `Preparar próxima reunião`;
5. criar proposta v1 e executar `Revisar proposta`;
6. criar v2 com alteração relevante;
7. revisar v2 e confirmar que cada análise aponta para a versão correta;
8. atualizar e reabrir o navegador, conferindo histórico, data, provider, modelo e resultado;
9. alterar um dado relevante do diagnóstico e executar nova análise;
10. confirmar novo `inputFingerprint` e preservação do resultado anterior;
11. simular falha de API e executar retry;
12. confirmar que CRM, diagnóstico e propostas continuam funcionando durante a falha.

## 9. Critérios de aceite

Somente considerar `SPEC 07 - METIS PRODUCTION READY` quando:

- provider real estiver funcionando no ambiente seguro;
- sanitização estiver comprovada por evidência técnica;
- nenhum segredo ou identificador pessoal desnecessário for enviado;
- histórico persistir e respeitar cliente, planejamento e versão;
- `inputFingerprint` mudar quando o contexto mudar;
- falhas não afetarem o restante do produto;
- retry e mensagens de erro forem compreensíveis;
- respostas tiverem qualidade aceitável e não apresentarem inferências como fatos;
- revisão profissional continuar obrigatória;
- typecheck, lint e build estiverem aprovados;
- Human Validation com provider real passar.

Com este aceite, a SPEC 08 - Portabilidade de Dados e Migração Cloud fica desbloqueada para planejamento. Não iniciar sua implementação antes da confirmação final de escopo.