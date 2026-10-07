# V2-SPEC 01 - Fundação do Novo Domínio Comercial

## Estado

Em implementação na branch `v2/commercial-domain`. Esta SPEC não altera `develop` ou `main`.

## Decisões de fundação

- O modo é definido por `NEXT_PUBLIC_DOMAIN_MODE`, com valores `legacy` e `commercial-v2`.
- O modo padrão é `legacy`. Em homologação, use `NEXT_PUBLIC_DOMAIN_MODE=commercial-v2` para ativar a navegação V2.
- O modo V2 preserva o legado tecnicamente, mas expõe somente Dashboard, Mercado Base, HOT40, Clientes, Configurações e Ajuda.
- `Contact` é a pessoa canônica. Qualificação, HOT40, atividades, oportunidades, indicações e notificações se relacionam por `contactId`.
- E-mail e telefone normalizados impedem criação acidental de duplicidade. Não há merge automático.
- Semana, mês e ano são derivados exclusivamente das datas da atividade por agregadores centralizados.
- IndexedDB mantém stores próprios do domínio comercial V2 e o Repository Pattern continua sendo a fronteira de persistência.

## Entidades

`Contact`, `ProspectQualification`, `Hot40Membership`, `CommercialActivity`, `CommercialOpportunity`, `CommercialGoal`, `Referral` e `Notification` usam metadados canônicos: id, tenantId, timestamps, version e soft-delete.

## Dados de demonstração

Com `NEXT_PUBLIC_DEMO_MODE=true` e V2 ativa, o ambiente recebe somente uma base mínima: contatos, qualificações, membros HOT40, atividades e uma meta. Em ambiente normal, a V2 começa vazia.

## Human Validation

1. Definir `NEXT_PUBLIC_DOMAIN_MODE=commercial-v2` no Preview da branch.
2. Confirmar o menu V2 e a ausência dos módulos legados.
3. Criar um Contact, qualificar, incluir no HOT40 e registrar atividade.
4. Confirmar a data derivada exibida sem campos para semana, mês ou ano.
5. Atualizar a página e confirmar persistência.
6. Definir o modo como `legacy` e confirmar que o 7Protect anterior continua abrindo.

Não iniciar a V2-SPEC 02 antes da aprovação humana desta base.
