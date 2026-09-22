# SPEC 06 - Carteira e Central de Relatórios

## Objetivo

Entregar uma Carteira operacional derivada de contratos aceitos e uma Central de Relatórios para reutilizar documentos já gerados, preservando histórico e snapshots.

## Carteira

Entram na Carteira apenas fechamentos válidos vinculados a cliente, planejamento e proposta aceita. A tela mostra cliente, planejamento, proposta, seguradora, produto, coberturas, capital, prêmios mensal e anual, contratação, vigência, status e próxima revisão.

Permitir pesquisa e filtros, abrir o dashboard do cliente, a proposta aceita e o planejamento de origem. Ação de revisão ou replanejamento cria um novo ciclo para o mesmo cliente, sem alterar o ciclo fechado.

## Central de Relatórios

Listar os snapshots já gerados para diagnóstico do cliente, diagnóstico interno e apresentação ou PDF comercial. Cada item identifica cliente, planejamento, proposta quando aplicável, data, tipo, origem e versão do template.

Visualização e novo download usam exclusivamente o `reportSnapshot` persistido. Alterações posteriores no cadastro, diagnóstico, análise ou proposta não podem alterar um documento histórico.

## Critérios de aceite

- não há fonte paralela de verdade para a Carteira;
- cliente sem fechamento não aparece na Carteira;
- base vazia apresenta orientação sem depender de seed;
- iniciar revisão mantém o planejamento e a proposta aceita intactos;
- documentos já gerados reaparecem na Central;
- snapshots são preservados pelo backup e restauração;
- desktop e mobile não apresentam scroll horizontal;
- typecheck, lint, build e `git diff --check` passam.

## Checkpoint humano

1. Criar e fechar uma proposta aceita com cobertura.
2. Conferir a entrada na Carteira e os valores derivados.
3. Abrir cliente, proposta e planejamento de origem.
4. Iniciar revisão e conferir que o histórico anterior permanece.
5. Gerar PDF de diagnóstico para cliente e interno, além do comercial.
6. Localizar e reabrir os documentos na Central.
7. Alterar dados atuais e conferir que o documento histórico não mudou.
