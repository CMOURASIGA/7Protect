# Checkpoint pós-SPEC 07 — Navegação Metis e Ambiente Demo

Este checkpoint não é uma nova SPEC. A SPEC 08 agora é o Guia Operacional e Ajuda Contextual; a etapa de Cloud foi renumerada para SPEC 09.

## Objetivo

Disponibilizar uma demonstração reinicializável do 7Protect, usando o caso fictício Rafael, sem expor ou alterar a base local de uma operação normal.

## Modo Demo

- Ativado somente com `NEXT_PUBLIC_DEMO_MODE=true`.
- Bloqueado no build quando `VERCEL_ENV=production`.
- Usa um banco IndexedDB por sessão, com prefixo `7protect-demo-`.
- Refresh preserva a sessão atual; uma nova sessão recebe uma base demo nova.
- O botão `Reiniciar demonstração` restaura somente a base da sessão atual após confirmação.
- A Metis real continua server-side e pode receber limite por sessão/endereço com `DEMO_METIS_MAX_CALLS` e `DEMO_METIS_WINDOW_MS`.

## Caso Rafael

O seed é determinístico, identificado como demonstração e não contém CPF, telefone, e-mail, endereço, renda, patrimônio ou saúde inventados.

Ele contém:

- catálogo MetLife e produto associado;
- planejamento histórico fechado com proposta aceita;
- capital protegido de R$ 1.410.000,00 e prêmio mensal de R$ 373,60;
- Carteira derivada do fechamento e snapshots de relatórios históricos;
- novo planejamento `Rafael — Revisão Metis (pré-análise)` com proposta em rascunho e sem histórico Metis.

## Navegação Metis

O item `Metis — em breve` não deve existir no menu. A Metis permanece no dashboard contextual do cliente, sem rota genérica isolada.

## Human Validation

Validar em Preview com Demo Mode habilitado:

1. abertura do Rafael, Carteira e Relatórios;
2. valores de R$ 1.410.000,00 e R$ 373,60/mês;
3. planejamento pré-Metis sem histórico;
4. ações de análise, perguntas e revisão de proposta;
5. persistência após refresh;
6. reset explícito e nova sessão restaurando o seed;
7. ausência do seed e do botão de reset em produção.
