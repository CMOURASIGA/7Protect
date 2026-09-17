# SPEC 05 - Aegis, Assistente de IA

## Objetivo

Integrar a Aegis ao 7Protect como assistente contextual do corretor, usando OpenAI para interpretar dados estruturados do diagnóstico e revisar propostas.

## Princípio de produto

Aegis apoia o corretor.

Ela não substitui decisão profissional, não fecha proposta automaticamente e não altera dados sem confirmação explícita.

## Casos de uso

### 1. Analisar diagnóstico

Entrada:

- composição familiar;
- renda e despesas;
- patrimônio e reservas;
- dívidas;
- seguros e previdência existentes;
- objetivos;
- dados de saúde estritamente necessários à análise;
- observações estruturadas relevantes.

Saída:

- resumo do perfil;
- pontos de atenção;
- lacunas de proteção a avaliar;
- objetivos que merecem cobertura/planejamento;
- perguntas adicionais recomendadas;
- alertas de informação incompleta.

### 2. Revisar proposta

Entrada:

- diagnóstico consolidado;
- objetivos;
- análise da corretora;
- versão atual da proposta.

Saída:

- aderência entre objetivos e proposta;
- possíveis lacunas;
- possíveis excessos ou inconsistências a revisar;
- perguntas para a corretora validar antes da apresentação;
- itens não suportados pelos dados existentes.

### 3. Preparar próxima reunião

Gerar perguntas curtas e objetivas com base no que ainda não está claro.

## UX

No dashboard do cliente, exibir bloco `Aegis` com ações:

- `Analisar diagnóstico`
- `Revisar proposta`
- `Gerar perguntas`

Mostrar a resposta em seções estruturadas, não apenas em texto corrido.

## Contrato de saída

A resposta da IA deve ser validada por schema.

Exemplo conceitual:

```ts
type AegisAnalysis = {
  summary: string
  attentionPoints: string[]
  protectionTopics: string[]
  questions: string[]
  missingInformation: string[]
  proposalReview?: {
    alignedItems: string[]
    reviewItems: string[]
  }
  disclaimer: string
}
```

Não persistir resposta sem validar o schema.

## Minimização de dados

Antes da chamada à OpenAI, remover identificadores que não agreguem valor analítico.

Não enviar por padrão:

- nome completo;
- CPF;
- telefone;
- e-mail;
- endereço;
- número de apólice;
- identificadores internos.

Preferir atributos úteis como idade, composição familiar, renda agregada, despesas, objetivos e coberturas.

## Saúde

Dados de saúde são sensíveis.

Enviar apenas o mínimo necessário para o caso de uso e somente quando a análise exigir.

A interface deve informar que a análise usa IA e que o corretor deve revisar o resultado.

## Arquitetura

Fluxo:

```text
UI
 -> AegisApplicationService
 -> PayloadSanitizer
 -> AI Gateway/Provider
 -> OpenAI
 -> Schema Validator
 -> AegisRepository
```

Nunca chamar OpenAI diretamente de componente React.

## Chave e endpoint

A chave OpenAI não pode ficar exposta no client.

Quando o app estiver hospedado, usar route handler/server-side endpoint.

No modo estritamente local sem backend seguro, a feature real de IA pode permanecer desabilitada até existir um endpoint protegido. É aceitável usar provider fake/mock para validação da UX.

Não armazenar chave OpenAI no IndexedDB ou localStorage.

## Provider abstraction

Criar interface de IA para permitir futura evolução sem acoplamento.

Exemplo:

```ts
interface AiProvider {
  analyzeClient(input: SanitizedClientContext): Promise<AegisAnalysis>
  reviewProposal(input: SanitizedProposalContext): Promise<AegisAnalysis>
}
```

Provider inicial real: OpenAI.

Provider de desenvolvimento: Fake/Mock.

## Contexto e prompts

Prompts devem:

- usar linguagem de apoio ao corretor;
- separar fato fornecido de inferência;
- marcar quando faltam dados;
- evitar inventar regras de produto;
- evitar prometer aceitação de seguro;
- evitar tratar sugestão como obrigação;
- não usar capital segurado como sinônimo de rendimento;
- não assumir condições específicas de seguradora não fornecidas.

## Persistência

Salvar metadados da análise:

- id;
- clientId;
- planningCycleId;
- proposalVersionId opcional;
- analysisType;
- inputFingerprint;
- model/provider;
- createdAt;
- structuredResult;
- status.

Não salvar o payload bruto com dados identificáveis desnecessários.

## Controle de custo

Registrar consumo lógico por ação.

Preparar contadores para plano futuro, por exemplo:

- análises de diagnóstico no mês;
- revisões de proposta no mês;
- limite/franquia por tenant.

O sistema deve permitir desabilitar Aegis sem afetar CRM, Kanban, diagnóstico e propostas.

## Critérios de aceite

- Aegis é acionada manualmente;
- payload sanitizado não contém identificadores pessoais básicos;
- saída é estruturada e validada;
- erro da OpenAI não quebra o dashboard;
- análise fica associada ao ciclo correto;
- revisão de proposta referencia a versão correta;
- UI informa que o conteúdo exige revisão do corretor;
- feature pode operar com provider mock;
- build, lint e typecheck passam.

## Checkpoint humano

Validar com um cliente demo:

1. diagnóstico completo;
2. análise Aegis;
3. perguntas sugeridas;
4. proposta v1;
5. revisão Aegis da proposta;
6. falha simulada da API sem perda de dados.
