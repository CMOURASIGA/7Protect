# 7Protect - UX, Frontend e Whitelabel

## 1. Referência obrigatória

O frontend do 7Protect deve usar o 7Commander como referência visual e estrutural.

Arquivos de referência no repositório `CMOURASIGA/7Commander`:

- `components/layout/app-shell.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/header.tsx`
- `components/brand/brand-lockup.tsx`
- `lib/brand.ts`
- `lib/brand-settings.ts`
- `app/globals.css`
- `styles/tokens.css`

O objetivo não é copiar o domínio do 7Commander, e sim reaproveitar o padrão de produto do HUB da Consult Services.

## 2. Shell

O 7Protect deve manter:

- sidebar fixa em desktop;
- rail compacto em tablet quando aplicável;
- gaveta no mobile;
- header consistente;
- conteúdo central responsivo;
- cards, inputs, botões, pills, toasts e estados vazios com a mesma linguagem visual;
- navegação clara por módulos;
- ausência de scroll horizontal em resoluções suportadas.

## 3. Whitelabel

O 7Commander já separa marca do produto e marca do cliente. O 7Protect deve seguir o mesmo princípio.

### Marca do produto

- `7Protect`
- subtítulo: `CRM e Planejamento de Proteção Financeira`
- assistente: `Metis`

Descrição institucional: **O 7Protect é uma plataforma CRM para corretores de seguros, voltada ao diagnóstico, planejamento e gestão da proteção financeira dos clientes.**

### Marca da corretora

Parametrizável:

- nome;
- logo;
- cor principal;
- cor de destaque;
- telefone;
- e-mail;
- endereço opcional;
- dados institucionais para relatório.

O logo da corretora deve ocupar o espaço principal de marca no canto superior esquerdo, seguindo o padrão visual adotado no HUB.

## 4. Tokens

Usar CSS variables/tokens equivalentes aos do 7Commander, permitindo que o whitelabel altere a identidade sem reescrever componentes.

Tokens mínimos:

- `--accent`
- `--accent-strong`
- `--brand-highlight`
- `--sidebar`
- `--sidebar-deep`
- `--bg-page`
- `--bg-surface`
- `--bg-muted`
- `--text-primary`
- `--text-secondary`
- `--text-tertiary`
- `--border`
- `--success`
- `--danger`
- `--warning`

## 5. Navegação proposta

### Principal

- Dashboard
- Kanban

### CRM

- Leads
- Clientes

### Operação

- Diagnósticos
- Planejamentos
- Propostas
- Carteira

### Inteligência

- Metis
- Relatórios

### Sistema

- Configurações
- Backup e Dados
- Ajuda

A navegação pode ser refinada durante a validação, mas os módulos devem permanecer semanticamente separados.

## 6. Dashboard da corretora

Primeira dobra deve priorizar indicadores operacionais, não decoração.

Cards mínimos:

- leads no período;
- diagnósticos concluídos;
- em cálculo;
- aguardando cliente;
- fechados no período;
- prêmio mensal contratado;
- capital protegido;
- taxa de conversão.

Abaixo:

- funil por etapa;
- evolução temporal;
- oportunidades paradas;
- tarefas e próximos retornos.

## 7. Dashboard do cliente

Cabeçalho:

- nome do cliente;
- status atual;
- planejamento vigente;
- próxima revisão;
- ações rápidas.

Blocos:

- resumo financeiro;
- objetivos;
- proteção atual;
- coberturas;
- investimento mensal/anual;
- capital protegido;
- linha do tempo;
- análise Metis;
- histórico de propostas e planejamentos.

## 8. Diagnóstico

O formulário deve ser dividido em etapas, evitando uma única tela longa.

Sugestão:

1. Identificação
2. Família
3. Trabalho e renda
4. Despesas
5. Patrimônio
6. Dívidas
7. Reservas e investimentos
8. Previdência e seguros
9. Saúde
10. Objetivos e prioridades
11. Revisão

Requisitos:

- salvar rascunho automaticamente;
- indicar progresso;
- permitir voltar entre etapas;
- mostrar campos faltantes;
- distinguir campos obrigatórios e opcionais;
- conclusão explícita do diagnóstico.

## 9. Kanban

Cards devem mostrar apenas informação operacional útil:

- cliente/lead;
- etapa;
- valor potencial quando aplicável;
- data da última movimentação;
- próxima ação;
- responsável no futuro;
- alerta de atraso.

O drag-and-drop deve atualizar histórico e indicadores.

## 9.1 PDF do diagnóstico

O diagnóstico deve possuir uma visualização consolidada e gerar dois documentos sob demanda no dispositivo:

- PDF para o cliente, com dados declarados apropriados para compartilhamento;
- PDF completo interno, que pode incluir análise profissional e notas internas.

Esses documentos não substituem o PDF comercial da proposta final. A marca da corretora configurada no whitelabel deve ser aplicada ao cabeçalho e aos dados institucionais.

## 10. Metis

Metis deve aparecer como parte do contexto do cliente, não como chatbot genérico isolado. Ela analisa diagnósticos, revisa propostas e prepara perguntas, sempre com revisão profissional da corretora.

Ações principais:

- `Analisar diagnóstico`
- `Revisar proposta`
- `Gerar perguntas para próxima reunião`

A resposta deve ser renderizada em blocos estruturados:

- resumo;
- riscos/pontos de atenção;
- oportunidades de análise;
- perguntas recomendadas;
- revisão da proposta.

O bloco deve informar que utiliza IA com dados minimizados e que o resultado exige revisão profissional da corretora. Em caso de indisponibilidade, deve mostrar erro recuperável, preservar a tela e permitir nova tentativa.

## 11. Responsividade

Validar pelo menos:

- mobile estreito;
- mobile largo;
- tablet;
- notebook 1366x768;
- desktop Full HD.

Nenhuma função crítica pode depender exclusivamente de hover.

## 12. Acessibilidade mínima

- contraste legível;
- labels associados a inputs;
- navegação por teclado;
- foco visível;
- ícones com texto/aria-label quando necessário;
- status não dependentes apenas de cor.
