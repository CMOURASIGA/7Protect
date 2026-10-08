# V2-SPEC 02 - Mercado Base, Qualificação e Parâmetros

## Estado

Implementada, aguardando Human Validation. Base homologada: `6eaa2987ec8c23e7199e76172aad5b223ed180b2`. Branch exclusiva: `v2/commercial-domain`. V2-SPEC 03 não iniciada.

## Escopo entregue

- Cadastro rápido: nome obrigatório; telefone, e-mail e observações opcionais.
- Edição mantém o ID do Contact. Qualificação e HOT40 referenciam a mesma pessoa.
- Drawer de qualificação: fonte, faixa de renda estimada, renda numérica opcional, faixa etária, profissão livre, estado civil, filhos, frequência de contato, facilidade de abordagem, capacidade de referências, data de origem e observações.
- Resultado decidido pelo consultor: Pendente, Qualificado ou Não qualificado. Não há score automático.
- Pendente pode salvar dados parciais. Qualificado exige os oito parâmetros, profissão e data válida de origem. A faixa de renda mantém a semântica da Matriz; um valor numérico opcional não é inferido a partir dela.
- Mês de origem é derivado da data civil `YYYY-MM-DD`, sem fuso, por `originMonth`. Não existe coluna persistida de semana, mês ou ano.
- Busca por nome, telefone, e-mail, profissão e fonte, com normalização de acentos e telefone. Filtros combináveis: qualificação, etapa, fonte e mês de origem. Paginação de 20 contatos.
- Estados visuais: carregamento, base vazia, filtro sem resultado, erro recuperável, gravação, sucesso, pendente, qualificado, não qualificado e etapa atual.

## Matriz como parâmetros

Referência conferida: `OFICIAL - Contatos e HOT40_vFinal.xlsm`, aba `Matriz`, intervalo `C4:J9`. A extração contém somente as 35 opções desses oito grupos, sem contatos, macros ou informações pessoais.

Os valores iniciais estão em `domains/commercial/matrix-defaults.json` como bootstrap com origem documentada. Não são listas fixas na UI. A primeira abertura cria entidades CommercialParameter no IndexedDB por tenant, em transação. A interface e a validação consultam o repository.

Configurações oferece criação, edição de nome e ordem, ativação e desativação. IDs e grupos são estáveis. Uma opção inativa não pode ser escolhida para um novo cadastro, mas pode permanecer em uma qualificação que já a usava. Desativação não elimina registros históricos. Profissão é texto livre porque não existe catálogo de profissões na Matriz.

## Persistência e invariantes

- Schema IndexedDB 7 adiciona `commercialParameters` e preserva stores antigos.
- UI -> services -> repositories -> IndexedDB. UI não acessa banco diretamente.
- Repositories validam tenant, grupo de parâmetro, seleção ativa ou seleção histórica preservada, completude da qualificação, data real e renda não negativa.
- ContactRepository rejeita duplicação de e-mail ou telefone normalizados, inclusive em gravações concorrentes e na edição.
- HOT40 exige qualificação estruturada válida. Requalificação como Pendente/Não qualificado encerra a participação atual sem apagar o histórico.
- Qualificações antigas da SPEC 01 que não possuíam os novos campos aparecem como pendentes de complementação. O mesmo Contact e a mesma entidade de qualificação são reutilizados. Vínculos HOT40 sem qualificação válida são encerrados como histórico removido.
- Demo reiniciada recebe contatos qualificados com os novos campos. Uma sessão Demo anterior pode ser complementada ou reiniciada pelo botão existente.

## Human Validation

Validar no desktop e no celular:

1. Abrir Mercado Base e criar contato informando somente o nome. Confirmar estado Pendente e ausência de Adicionar ao HOT40.
2. Editar nome, telefone e e-mail. Confirmar que continua sendo um único contato.
3. Qualificar parcialmente como Pendente e reabrir o drawer. Confirmar dados preservados.
4. Completar todos os parâmetros, profissão e data de origem; concluir como Qualificado. Confirmar habilitação do HOT40.
5. Escolher uma data no último dia de um mês e confirmar o mês de origem exibido e seu filtro.
6. Buscar por nome com/sem acento, e-mail, telefone e profissão; combinar filtros; limpar filtros; verificar estado sem resultados.
7. Em Configurações -> Parâmetros comerciais, criar uma fonte, editar seu nome e ordem, desativar e ativar.
8. Confirmar que a fonte ativa aparece na qualificação; a inativa desaparece de novas seleções e permanece nos registros que já a utilizavam.
9. Adicionar um contato qualificado ao HOT40. Confirmar um só cadastro e uma participação, com mesmo nome/ID.
10. Tentar criar outro contato com mesmo telefone formatado de modo diferente ou mesmo e-mail em maiúsculas. Confirmar erro sem novo registro.
11. Editar/requalificar um HOT40 como Não qualificado. Confirmar retorno ao Mercado Base e ausência do botão de inclusão.
12. Atualizar o navegador. Confirmar contatos, qualificação, parâmetros e HOT40 preservados.
13. Conferir campos, drawers e ações em desktop e mobile, sem scroll horizontal e com labels legíveis.
14. Conferir Marca da corretora na segunda seção de Configurações.

## Verificação técnica

`npm test`: 20 testes aprovados, incluindo bloqueios da fundação, Matriz, qualificação estruturada, parâmetros inativos, duplicidade concorrente, busca/filtros, persistência após fechar e reabrir IndexedDB e preservação de dados na atualização para schema 7.

Typecheck, lint (zero erros e cinco avisos preexistentes), build V2 e git diff --check passaram no checkpoint. A validação visual de desktop/mobile e o refresh no navegador real ficam para a Human Validation: este ambiente não possui Chromium disponível. Os testes de persistência usam IndexedDB em memória e reabertura do banco; não representam uma homologação visual.

## Fora deste checkpoint

Score automático, Dashboard final, Kanban final, importação operacional da planilha, novas integrações e V2-SPEC 03.
