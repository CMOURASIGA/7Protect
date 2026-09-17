# AGENTS.md - 7Protect

## Objetivo

Orientações obrigatórias para desenvolvimento do 7Protect.

## Regras de implementação

1. Ler `README.md`, `docs/PRODUCT_VISION.md`, `docs/ARCHITECTURE.md`, `docs/UX_AND_WHITELABEL.md` e a SPEC da etapa antes de codificar.
2. Implementar as SPECs em ordem e manter checkpoints pequenos e validáveis.
3. Usar `CMOURASIGA/7Commander` como referência visual e de whitelabel.
4. Não copiar lógica de negócio do 7Commander.
5. Não hardcodar MetLife, Isabela ou Consult Services como único tenant/seguradora.
6. IndexedDB é a persistência operacional do MVP. `localStorage` pode ser usado apenas para preferências simples, nunca como banco principal.
7. Toda persistência deve passar por repository interfaces.
8. UI não acessa IndexedDB diretamente.
9. IDs devem ser UUIDs gerados no domínio/aplicação e preserváveis na futura migração para Supabase.
10. Toda entidade deve carregar `tenantId`, `createdAt`, `updatedAt`, `version` e, quando aplicável, `deletedAt`.
11. Diagnóstico histórico não deve ser sobrescrito por revisão posterior.
12. Nova proposta cria nova versão. Nunca apagar versão apresentada ao cliente.
13. Movimentações de Kanban devem gerar histórico.
14. Dados declarados pelo cliente e análise do corretor devem ser campos/entidades diferentes.
15. Aegis não pode alterar dados ou proposta sem confirmação explícita do corretor.
16. Antes de enviar dados para IA, minimizar e remover identificadores desnecessários.
17. Nunca expor chave OpenAI em código client-side.
18. Capital segurado, projeção, valor de resgate e investimento não podem ser apresentados como conceitos equivalentes.
19. O sistema deve continuar funcional quando a IA estiver indisponível.
20. O sistema deve continuar funcional sem Supabase no MVP.

## Branches

Sugestão:

- `main`: versão estável
- `develop`: integração
- `feat/spec-01-foundation`
- `feat/spec-02-crm-pipeline`
- `feat/spec-03-planning-proposals`
- `feat/spec-04-dashboards-reporting`
- `feat/spec-05-aegis`
- `feat/spec-06-data-portability`

## Qualidade mínima por checkpoint

- lint sem erro;
- typecheck sem erro;
- build sem erro;
- testes de regras críticas;
- dados demo suficientes para validação humana;
- responsividade validada;
- sem regressão do whitelabel;
- README/changelog da etapa atualizado quando necessário.
