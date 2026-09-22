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
15. Metis não pode alterar dados ou proposta sem confirmação explícita do corretor.
16. Antes de enviar dados para IA, minimizar e remover identificadores desnecessários.
17. Nunca expor chave OpenAI em código client-side.
18. Capital segurado, projeção, valor de resgate e investimento não podem ser apresentados como conceitos equivalentes.
19. O sistema deve continuar funcional quando a IA estiver indisponível.
20. O sistema deve continuar funcional sem Supabase no MVP.

## Branches e fluxo obrigatório

Branches permanentes:

- `develop`: integração, homologação e validação humana.
- `main`: versão estável aprovada.

O desenvolvimento, a manutenção e a homologação ocorrem diretamente em `develop`.

Não criar branches `feat/*`, `fix/*` ou `docs/*` para o fluxo normal.

Fluxo obrigatório:

`develop -> Vercel Preview/Homologação -> validação humana -> main -> produção`

Regras de entrega:

1. Nunca implementar diretamente em `main`.
2. Todo trabalho concluído deve permanecer em `develop` até a promoção aprovada.
3. Toda atualização relevante em `develop` deve ser publicada no projeto Vercel já configurado para permitir validação funcional e visual.
4. A validação do responsável pelo produto acontece sempre sobre a versão publicada a partir de `develop`.
5. Se houver reprovação ou ajuste, corrigir na linha de desenvolvimento e republicar `develop`.
6. Somente após aprovação explícita promover o checkpoint de `develop` para `main`.
7. `main` não é ambiente de teste nem de homologação.
8. O início da SPEC seguinte deve respeitar o checkpoint validado da etapa anterior, salvo orientação explícita em contrário.

## Qualidade mínima por checkpoint

- lint sem erro;
- typecheck sem erro;
- build sem erro;
- testes de regras críticas;
- dados demo suficientes para validação humana;
- responsividade validada;
- sem regressão do whitelabel;
- deploy de `develop` disponível no Vercel para homologação;
- README/changelog da etapa atualizado quando necessário.
