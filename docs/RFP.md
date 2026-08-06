# RFP WS-14 — API de Reserva de Assentos

Reserva de assentos com bloqueio temporário · Produto SaaS técnico composto por três microserviços

> Documento de referência do projeto **WS-14** — Web Services 2026/2 · IFRO Campus Vilhena.
> Convertido do RFP original em HTML; em caso de divergência, vale o documento entregue em aula.

---

> **Sobre este documento**
>
> Este RFP descreve **o que** o serviço deve fazer, não **como** implementar. As decisões de projeto — modelagem, organização de camadas, bibliotecas auxiliares — são responsabilidade de quem desenvolve e fazem parte da avaliação.

## 1. Contexto e problema

Cinemas, teatros, casas de show, companhias aéreas e empresas de ônibus vendem o mesmo tipo de coisa: um lugar específico, numerado, que só pode pertencer a uma pessoa. Quando um espetáculo popular abre vendas, milhares de compradores entram no mapa de assentos ao mesmo tempo e muitos deles clicam *exatamente na mesma poltrona* no mesmo segundo. O sistema precisa escolher um vencedor e informar aos demais, imediatamente, que aquele lugar já não está disponível.

A dificuldade não está em gravar a reserva — está no intervalo entre a escolha e o pagamento. O comprador seleciona os assentos, digita os dados do cartão, confere o valor, erra o CVV, tenta de novo. Durante esses minutos o lugar não pode ser vendido a outra pessoa, mas também não pode ficar preso para sempre: se o comprador fechar o navegador, o assento tem que voltar ao mercado sozinho, sem que ninguém precise intervir. Esse **bloqueio temporário que expira por conta própria** é o coração do produto.

Some-se a isso a irregularidade do mundo real. Salas não são grades perfeitas: existem corredores, fileiras com quantidades diferentes de poltronas, lugares para cadeirantes e acompanhantes, cabines, camarotes e assentos com visão obstruída que valem menos. E há a regra que mais causa insatisfação quando falha: um grupo de quatro pessoas quer sentar junto, e o serviço precisa conseguir bloquear quatro poltronas adjacentes **de forma atômica** — ou todas, ou nenhuma. Reservar três e falhar na quarta é pior do que recusar o pedido inteiro.

## 2. Objetivo do serviço

Construir uma **API de reserva de assentos** consumida por bilheterias, sites de venda e aplicativos parceiros (B2B). O serviço é a autoridade sobre o que está livre, o que está bloqueado e o que está vendido em cada sessão, e garante que dois pedidos concorrentes jamais resultem na mesma poltrona vendida duas vezes.

### Operações mínimas obrigatórias

| Operação | Descrição | Efeito no assento |
|---|---|---|
| `mapa` | Devolve a planta da sessão com o estado atual de cada lugar | nenhum (leitura) |
| `bloquear` | Cria um bloqueio temporário sobre um conjunto de assentos, com prazo de expiração | `livre` → `bloqueado` |
| `bloquear adjacentes` | Solicita N lugares contíguos na mesma fileira, deixando o serviço escolher quais | `livre` → `bloqueado` (tudo ou nada) |
| `prorrogar` | Estende o prazo de um bloqueio ativo, dentro de um limite máximo | mantém `bloqueado` |
| `confirmar` | Converte o bloqueio em reserva definitiva após o pagamento | `bloqueado` → `vendido` |
| `liberar` | Cancela o bloqueio por desistência explícita do comprador | `bloqueado` → `livre` |
| `expirar` | Liberação automática quando o prazo do bloqueio termina | `bloqueado` → `livre` |
| `cancelar reserva` | Desfaz uma venda já confirmada, devolvendo o lugar ao mercado | `vendido` → `livre` |

> **Escopo do pagamento**
>
> Este serviço **não processa pagamentos**. O cliente informa um comprovante ou referência externa no momento de confirmar. O que está sendo avaliado é o controle do estado do assento sob concorrência — não a integração com adquirentes.

## 3. Arquitetura

A solução é composta por **três microserviços independentes**, cada um responsável por uma fatia do produto e por um conjunto de tecnologias da ementa. Eles compartilham o domínio, mas sobem, são testados e são avaliados separadamente.

| Serviço | Tecnologias | Responsabilidade |
|---|---|---|
| **MS-A** | REST Open-API BetterAuth | Cadastro de locais, mapas, sessões e preços; bloqueio, confirmação e cancelamento de assentos. Documentado em Swagger. |
| **MS-B** | GraphQL Webhooks | Consulta de disponibilidade, ocupação e vendas por setor; notificação de bloqueio expirado e sessão esgotada. |
| **MS-C** | WebSocket | Mapa de assentos ao vivo: todo bloqueio, venda ou liberação aparece instantaneamente para quem está olhando a mesma sessão. |

## 4. MS-A — API REST documentada em Open-API

Serviço principal e única autoridade de escrita sobre o estado dos assentos. Persiste em banco relacional via Prisma e é integralmente documentado em Open-API, com Swagger UI navegável.

### 4.1 Endpoints mínimos

| Método | Rota | Descrição |
|---|---|---|
| POST | `/v1/locais` | Cadastra um local (cinema, teatro, casa de show) |
| POST | `/v1/locais/:id/mapas` | Define o mapa de assentos: setores, fileiras, lugares, corredores e atributos especiais |
| GET | `/v1/locais/:id/mapas/:mapaId` | Recupera a planta cadastrada, com a geometria de cada lugar |
| POST | `/v1/sessoes` | Cria uma sessão a partir de um mapa, com data, hora e faixas de preço por setor |
| GET | `/v1/sessoes` | Lista sessões com paginação e filtro por local, data e situação |
| GET | `/v1/sessoes/:id/assentos` | Mapa da sessão com o estado atual de cada assento e o preço aplicável |
| POST | `/v1/sessoes/:id/bloqueios` | Bloqueia assentos escolhidos ou pede N adjacentes; devolve prazo de expiração |
| GET | `/v1/bloqueios/:id` | Estado do bloqueio, assentos incluídos e segundos restantes |
| POST | `/v1/bloqueios/:id/prorrogar` | Estende o prazo do bloqueio, respeitando o limite máximo de prorrogações |
| DELETE | `/v1/bloqueios/:id` | Libera o bloqueio antes da expiração, por desistência do comprador |
| POST | `/v1/bloqueios/:id/confirmar` | Converte o bloqueio em reserva definitiva; exige chave de idempotência |
| GET | `/v1/reservas/:id` | Reserva confirmada, com assentos, valores e comprovante |
| DELETE | `/v1/reservas/:id` | Cancela uma reserva confirmada e devolve os assentos ao mercado |
| POST | `/v1/chaves` | Cria uma chave de API; o segredo é devolvido uma única vez |
| GET | `/v1/chaves` | Lista as chaves do dono autenticado, sem revelar os segredos |
| DELETE | `/v1/chaves/:id` | Revoga uma chave imediatamente |

### 4.2 Ciclo de vida do assento na sessão

```
livre ──▶ bloqueado ──▶ vendido
  ▲           │              │
  │           ├──▶ (expirou) │
  │           └──▶ (liberado)│
  └───────────────────────── (reserva cancelada)

bloqueado: pertence a um comprador, tem prazo e expira sozinho
vendido:   definitivo, só sai por cancelamento explícito
```

O bloqueio responde `201 Created` com o identificador, a lista de assentos efetivamente bloqueados e o instante de expiração. Um pedido que perde a disputa responde `409 Conflict` indicando **quais** assentos já não estavam disponíveis — nunca um sucesso parcial.

### 4.3 Requisitos da especificação Open-API

- Todos os endpoints descritos, com parâmetros, corpo de requisição e respostas.
- Schemas reutilizáveis em `components` — `Assento`, `Bloqueio` e `Reserva` definidos uma única vez.
- Códigos de status corretos e coerentes: `201` para bloqueio criado, `409` para assento indisponível ou bloqueio já expirado, `410` para bloqueio vencido, `422` para entrada inválida.
- O header de idempotência da confirmação declarado explicitamente como parâmetro.
- Exemplos de requisição e resposta em cada operação, incluindo o corpo do `409` com a lista de assentos em conflito.
- Swagger UI servido pela própria aplicação e acessível no navegador.
- Validação de entrada com Zod, alinhada aos schemas declarados na especificação.

## 5. Autenticação e autorização

> **Obrigatório em todos os projetos**
>
> A autenticação faz parte da ementa (Tópico 3 da ementa) e deve usar **BetterAuth** com adapter Prisma — não implementar JWT artesanal.

### 5.1 Dois planos de autenticação

Este serviço é consumido por **outros sistemas** — o site de venda de ingressos, o aplicativo da rede de cinemas, o parceiro que revende lugares — e não por pessoas em navegador. Exigir apenas sessão de navegador seria incoerente: um backend cliente não guarda cookie nem faz login interativo. A solução são dois planos distintos de autenticação, com finalidades separadas.

| Plano | Quem usa | Mecanismo | Para quê |
|---|---|---|---|
| **Gestão** | pessoa, no painel | Sessão BetterAuth (cookie) | Cadastrar-se, criar e revogar chaves de API, consultar histórico de reservas e configurar webhooks |
| **Consumo** | sistema cliente | Cabeçalho `Authorization: Bearer <chave>` | Operar o produto: consultar o mapa da sessão, bloquear assentos, prorrogar, confirmar reserva e cancelar |

- As rotas de **gestão** — cadastro, login, criação e revogação de chaves, configuração de webhooks — exigem sessão BetterAuth.
- As rotas de **consumo** — as operações do produto — aceitam chave de API no cabeçalho `Authorization`.
- Os dois caminhos resolvem para o **mesmo dono**. O isolamento por cliente vale igual nos dois planos: o que a chave enxerga é exatamente o que a sessão do seu dono enxergaria, nem mais, nem menos. Um bloqueio criado por chave de API pertence ao dono da chave, e só ele pode confirmá-lo ou liberá-lo.

### 5.2 Autenticação entre os três microserviços

- Os três serviços compartilham o mesmo PostgreSQL e, portanto, as mesmas tabelas do BetterAuth e de chaves de API.
- O **MS-A** é o único que expõe as rotas de cadastro e login.
- **MS-B** e **MS-C** não expõem rotas de autenticação: resolvem a sessão a partir do cookie ou validam a chave de API, consultando o banco via Prisma.
- O **MS-C** valida no *handshake* da conexão WebSocket e recusa antes do *upgrade*.
- Encerrar a sessão ou revogar uma chave vale imediatamente para os três serviços, inclusive derrubando conexões WebSocket abertas.

> **Por que sessão persistida e não JWT**
>
Em arquitetura de microserviços o usual é JWT, porque cada serviço valida o token pela assinatura sem precisar tocar no banco. O custo desse desenho é que um token válido continua valendo até expirar, e revogar antes disso exige manter uma lista de bloqueio compartilhada.

Como aqui os três serviços já compartilham o mesmo banco, a sessão persistida sai mais barata e ainda entrega revogação imediata. É exatamente o *trade-off* discutido em aula, e a decisão deve estar justificada no README.

### 5.3 Chaves de API

- A chave **nunca** é armazenada em claro: guarda-se apenas o hash. O segredo é exibido uma única vez, no momento da criação.
- Prefixo visível para identificação na interface, permitindo reconhecer a chave sem revelar o segredo.
- Escopo por chave — por exemplo somente leitura (consultar mapas e sessões), ou leitura e escrita (bloquear e confirmar reservas).
- Revogação imediata, com registro de quando e por quem a chave foi revogada.
- Registro do último uso, para permitir identificar chaves esquecidas e desativá-las.

### 5.4 Isolamento e papéis

- **Isolamento por cliente:** um comprador só enxerga e manipula os próprios bloqueios e reservas. Tentar acessar recurso alheio retorna `404`, nunca `403` — não revelar a existência do recurso.
- Pelo menos dois papéis, com capacidades distintas: `comprador`, que bloqueia e confirma, e `promotor`, que cadastra locais, mapas e sessões e enxerga a ocupação completa. O papel vale igual pelos dois planos de autenticação.
- O mapa da sessão é legível por qualquer portador de credencial válida, mas a identidade de quem detém cada bloqueio nunca é exposta a terceiros — o mapa mostra apenas `livre`, `bloqueado` ou `vendido`.
- Rotas públicas e protegidas claramente separadas e marcadas na especificação Open-API. A listagem de sessões e o mapa em visão reduzida podem ser públicos; bloquear, confirmar e cancelar, jamais.

## 6. MS-B — GraphQL e Webhooks

Serviço de consulta e integração. O GraphQL existe aqui porque as perguntas sobre ocupação são combinatórias — por setor, por faixa de preço, por janela de horário, com ou sem o detalhe assento a assento. Em REST isso viraria dezenas de endpoints ou uma resposta gigante que ninguém aproveita inteira.

### 6.1 Schema GraphQL mínimo

```
type Query {
  sessao(id: ID!): Sessao
  sessoes(
    localId: ID
    de: DateTime
    ate: DateTime
    situacao: SituacaoSessao
    primeiros: Int = 20
    cursor: String
  ): SessaoConnection!

  disponibilidade(sessaoId: ID!, setorId: ID): Disponibilidade!
  ocupacaoPorSetor(sessaoId: ID!): [OcupacaoSetor!]!
  vendas(de: DateTime!, ate: DateTime!, localId: ID): RelatorioVendas!
  bloqueiosAtivos(sessaoId: ID!, primeiros: Int = 50, cursor: String): BloqueioConnection!
  webhooks: [Webhook!]!
}

type Mutation {
  registrarWebhook(url: String!, eventos: [EventoTipo!]!): Webhook!
  removerWebhook(id: ID!): Boolean!
  reenviarEntrega(entregaId: ID!): EntregaWebhook!
}

type Sessao {
  id: ID!
  local: Local!
  mapa: Mapa!
  inicioEm: DateTime!
  situacao: SituacaoSessao!
  capacidade: Int!
  vendidos: Int!
  bloqueados: Int!
  livres: Int!
  esgotadaEm: DateTime
}

type Disponibilidade {
  sessaoId: ID!
  capacidade: Int!
  livres: Int!
  bloqueados: Int!
  vendidos: Int!
  percentualOcupacao: Float!
  maiorBlocoContiguoLivre: Int!
}

type OcupacaoSetor {
  setor: Setor!
  capacidade: Int!
  vendidos: Int!
  bloqueados: Int!
  receita: Float!
  precoMedio: Float!
}

type Bloqueio {
  id: ID!
  sessao: Sessao!
  assentos: [Assento!]!
  criadoEm: DateTime!
  expiraEm: DateTime!
  segundosRestantes: Int!
  prorrogacoes: Int!
  situacao: SituacaoBloqueio!
}

type BloqueioConnection {
  arestas: [BloqueioAresta!]!
  paginacao: PaginaInfo!
  total: Int!
}

type BloqueioAresta { cursor: String!, no: Bloqueio! }
type PaginaInfo { temProxima: Boolean!, cursorFinal: String }

enum SituacaoSessao { AGENDADA, VENDAS_ABERTAS, ESGOTADA, REALIZADA, CANCELADA }
enum SituacaoBloqueio { ATIVO, CONFIRMADO, EXPIRADO, LIBERADO }
enum EventoTipo {
  BLOQUEIO_EXPIRADO
  RESERVA_CONFIRMADA
  RESERVA_CANCELADA
  SESSAO_ESGOTADA
  SESSAO_DISPONIVEL_NOVAMENTE
}
```

- Resolvers acessando o banco via Prisma.
- Paginação por cursor — não devolver a coleção inteira, nem mesmo em `bloqueiosAtivos`.
- O campo `segundosRestantes` é calculado no momento da consulta, nunca persistido.
- Tratamento de erro no padrão do GraphQL, sem vazar stack trace.

### 6.2 Eventos de webhook

| Evento | Disparado quando |
|---|---|
| `bloqueio.expirado` | O prazo terminou sem confirmação e os assentos voltaram ao mercado |
| `reserva.confirmada` | Um bloqueio virou venda definitiva |
| `reserva.cancelada` | Uma reserva confirmada foi desfeita e os lugares foram devolvidos |
| `sessao.esgotada` | O último assento livre da sessão saiu do mercado |
| `sessao.disponivel_novamente` | Uma sessão esgotada voltou a ter lugar livre por expiração ou cancelamento |
| `sessao.cancelada` | O promotor cancelou a sessão e todas as reservas foram invalidadas |

#### Requisitos de entrega do webhook

- **Assinatura do payload:** header `X-Signature` com HMAC do corpo, para o receptor validar a origem.
- **Tentativas de entrega:** em caso de falha, repetir a entrega até três vezes em sequência, com espera curta e fixa entre elas. Esgotadas as tentativas, a entrega é marcada como falha e fica disponível para reenvio manual pela mutation `reenviarEntrega`. Registrar cada tentativa.
- **Histórico de entregas:** guardar código de resposta, corpo e duração de cada tentativa, consultável via GraphQL.
- **Endpoint receptor de demonstração:** uma rota própria que recebe o webhook e registra o recebimento, para permitir a demonstração ponta a ponta sem depender de terceiros.

## 7. MS-C — WebSocket

Serviço de tempo real e a parte mais visível do produto. Quem está olhando o mapa de uma sessão vê as poltronas mudarem de cor conforme outras pessoas bloqueiam, desistem e compram — sem recarregar a página e sem descobrir só no clique que o lugar já era.

### 7.1 Canais e mensagens

| Canal | Conteúdo transmitido |
|---|---|
| `sessao:{id}` | Mudanças de estado de qualquer assento da sessão: bloqueio, liberação, expiração e venda |
| `sessao:{id}:setor:{setorId}` | Mesmo fluxo, restrito a um setor — para mapas grandes que carregam por partes |
| `bloqueio:{id}` | Cronômetro regressivo do próprio bloqueio, avisos de prazo curto e o instante da expiração |
| `promotor:{localId}` | Contadores agregados de ocupação e receita ao vivo — restrito ao papel `promotor` |

```
// exemplo de mensagem no canal sessao:{id}
{
  "evento": "assento.estado_alterado",
  "sessaoId": "clx9a1m...",
  "alteracoes": [
    { "assentoId": "F12", "de": "livre",     "para": "bloqueado" },
    { "assentoId": "F13", "de": "livre",     "para": "bloqueado" },
    { "assentoId": "C04", "de": "bloqueado", "para": "livre", "motivo": "expiracao" }
  ],
  "livresRestantes": 87,
  "versaoSessao": 1432,
  "em": "2026-10-02T20:14:33.108Z"
}

// exemplo de mensagem no canal bloqueio:{id}
{
  "evento": "bloqueio.contagem",
  "bloqueioId": "blk_7f3...",
  "segundosRestantes": 45,
  "expiraEm": "2026-10-02T20:15:18.000Z"
}
```

### 7.2 Requisitos

- Autenticação no momento do handshake — conexão sem sessão válida é recusada.
- Autorização por canal: o canal `bloqueio:{id}` só aceita o dono do bloqueio; `promotor:{localId}` só aceita quem administra aquele local.
- Salas ou canais, com inscrição e cancelamento de inscrição — trocar de sessão não pode deixar a inscrição anterior viva.
- Cada mensagem carrega um número de versão crescente da sessão, para o cliente detectar mensagem perdida ou fora de ordem.
- Reconexão com recuperação do estado atual: ao reconectar, o cliente recebe o mapa completo da sessão, não apenas os eventos posteriores.
- Nenhuma mensagem revela a identidade de quem bloqueou o assento.
- **Demonstrável sem interface própria:** a conexão, a inscrição em canal e o recebimento de eventos devem ser verificáveis por ferramenta de linha de comando (por exemplo `wscat`) ou por cliente de teste que suporte WebSocket. Não é exigida página HTML nem qualquer front-end.

## 8. Requisitos não-funcionais

> **Eixo deste projeto: concorrência**
>
> É aqui que este RFP deixa de ser um CRUD. Vários compradores disputam a mesma poltrona no mesmo instante, e o serviço precisa provar que só um vence. Os pontos abaixo têm peso na avaliação.

### 8.1 Controle de concorrência explícito

- A transição `livre → bloqueado` acontece dentro de uma **transação de banco** com nível de isolamento adequado, escolhido e justificado no README.
- A escolha entre **lock otimista** (campo de versão no assento, escrita condicionada à versão lida) e **lock pessimista** (bloqueio de linha durante a transação) deve ser explícita, documentada e coerente com o resto do desenho.
- Nenhuma decisão de disponibilidade pode ser tomada com base em leitura feita fora da transação que escreve. Consultar, decidir e gravar em passos separados sem proteção é exatamente a falha que este projeto avalia.
- Restrição de unicidade no banco garantindo que um mesmo assento de uma mesma sessão não possa ter dois bloqueios ativos — a integridade não depende apenas do código da aplicação.

### 8.2 Atomicidade do bloqueio múltiplo

- Pedido de vários assentos é **tudo ou nada**: se qualquer um deles estiver indisponível, nenhum é bloqueado e a resposta lista os assentos em conflito.
- Ao pedir N lugares adjacentes, o serviço escolhe um bloco contíguo na mesma fileira, respeitando corredores — poltronas separadas por passagem **não são adjacentes**.
- Assentos com atributos especiais (cadeirante, acompanhante, visão obstruída, camarote) seguem regras próprias de elegibilidade e não entram em blocos contíguos comuns por acidente.
- A ordem de aquisição de bloqueios deve ser determinística para evitar *deadlock* entre dois pedidos que disputam o mesmo par de assentos em ordens invertidas.

### 8.3 Expiração do bloqueio

- Todo bloqueio nasce com prazo definido e configurável por sessão.
- A expiração acontece **sem intervenção**: um bloqueio vencido não é considerado válido em nenhuma leitura, mesmo que a rotina de limpeza ainda não tenha rodado.
- Confirmar um bloqueio já vencido falha com `410 Gone` — e não pode, em hipótese alguma, ressuscitar a reserva se outro comprador já tomou o lugar.
- Prorrogação é permitida, mas com teto: número máximo de prorrogações e duração total máxima do bloqueio.
- Reinício da aplicação não perde bloqueios nem prazos — o estado vive no banco, não em memória.

### 8.4 Comportamento sob rajada simultânea

- O projeto deve incluir um **teste de concorrência demonstrável**: um script que dispara dezenas de pedidos simultâneos sobre o mesmo assento e comprova que exatamente um obteve sucesso e todos os demais receberam `409`.
- Nenhum assento pode terminar vendido duas vezes, e a soma `livres + bloqueados + vendidos` deve ser sempre igual à capacidade da sessão — invariante verificável a qualquer momento.
- Perder a disputa é um resultado normal e barato: a resposta de conflito precisa ser rápida e informativa, não um erro genérico.
- Limite de assentos por bloqueio e de bloqueios ativos por comprador, evitando que um cliente sequestre a sessão inteira.

### 8.5 Idempotência

- A confirmação aceita **chave de idempotência**: repetir a mesma requisição devolve a mesma reserva, sem criar uma segunda venda.
- Reenvio do mesmo pedido de bloqueio com a mesma chave devolve o bloqueio já existente em vez de disputar de novo.
- Cancelar duas vezes a mesma reserva não gera dois estornos nem duas liberações do assento.

## 9. Modelo de dados mínimo

Entidades que o schema Prisma deve contemplar. Nomes e campos adicionais ficam a critério de quem desenvolve.

| Entidade | Campos essenciais |
|---|---|
| **User** | Gerenciado pelo BetterAuth (users, sessions, accounts, verifications) |
| **Local** | id, nome, endereço, dono (promotor), criado em |
| **Mapa** | id, local, nome, capacidade total, versão do layout |
| **Setor** | id, mapa, nome, ordem de exibição, categoria |
| **Assento** | id, setor, fileira, número, coordenadas x/y, atributo especial, ordem contígua na fileira |
| **Sessao** | id, mapa, início em, situação, prazo de bloqueio em segundos, versão, esgotada em |
| **FaixaPreco** | id, sessão, setor, valor, meia-entrada, vigência |
| **AssentoSessao** | id, sessão, assento, estado, bloqueio atual, reserva atual, **versão (lock otimista)**, atualizado em |
| **Bloqueio** | id, sessão, comprador, chave de idempotência, criado em, expira em, prorrogações, situação |
| **Reserva** | id, bloqueio de origem, comprador, valor total, referência de pagamento, confirmada em, cancelada em |
| **ChaveApi** | id, dono, hash da chave, prefixo visível, escopo, ativa, último uso em, criada em, revogada em |
| **Webhook** | id, dono, URL, eventos assinados, segredo, ativo |
| **EntregaWebhook** | id, webhook, evento, tentativa, código de resposta, corpo, duração, entregue em |

> **Identificadores**
>
Toda chave primária e toda chave estrangeira usam **UUID**, nunca inteiro sequencial. Identificador previsível permite que um cliente descubra recursos alheios apenas incrementando o número na URL — e o isolamento por cliente exigido na seção 5 passa a depender só da checagem de permissão, sem defesa em profundidade.

```
id String @id @default(uuid()) @db.Uuid
```

As tabelas geradas pelo BetterAuth seguem o padrão da própria biblioteca e não precisam ser alteradas.

## 10. Stack obrigatória

Definida pela ementa da disciplina. Desvios precisam de autorização prévia do professor.

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js |
| API REST | Express |
| Persistência | Prisma ORM sobre PostgreSQL |
| Autenticação | BetterAuth com adapter Prisma |
| Validação | Zod |
| Documentação | Open-API 3.x + Swagger UI |
| GraphQL | Servidor GraphQL à escolha, com resolvers sobre Prisma |
| WebSocket | `ws` ou Socket.IO |
| Ambiente | Docker Compose subindo a aplicação e o PostgreSQL |
| Versionamento | Git — repositório com commits ao longo do semestre, não um envio único |

## 11. Marcos de entrega

Alinhados ao Plano de Curso. Cada marco é verificado ao final do tópico correspondente.

| Etapa | Marco | O que deve estar funcionando |
|---|---|---|
| **1** | MS-A — REST + Open-API | Locais, mapas, sessões e assentos persistidos; bloqueio e confirmação funcionando, especificação Open-API completa e Swagger UI navegável |
| **2** | Autenticação | BetterAuth funcionando, papéis comprador e promotor, isolamento por cliente demonstrável |
| **3** | MS-B — GraphQL | Disponibilidade, ocupação por setor e relatório de vendas com filtros e paginação por cursor |
| **4** | MS-B — Webhooks | Disparo assinado, tentativas de entrega e reenvio manual, histórico e endpoint receptor de demonstração |
| **5** | MS-C — WebSocket | Mapa ao vivo com autorização por canal, cronômetro de bloqueio e cliente de demonstração |
| **6** | Integração | Os três serviços operando juntos, teste de rajada simultânea e documentação final |
| **7** | Apresentação | Demonstração funcional ponta a ponta, incluindo disputa real pelo mesmo assento |

## 12. Critérios de avaliação

| Critério | Peso | O que é observado |
|---|---|---|
| API REST e especificação Open-API | 20 | Aderência aos princípios REST, códigos de status corretos, especificação completa e coerente com a implementação |
| Persistência e modelagem | 15 | Schema Prisma bem modelado, migrations versionadas, integridade referencial, restrições de unicidade que sustentam o domínio |
| Autenticação e autorização | 15 | BetterAuth corretamente integrado, isolamento por cliente sem brechas |
| GraphQL | 15 | Schema bem tipado, resolvers eficientes, paginação, tratamento de erro |
| Webhooks | 10 | Assinatura, reentrega, histórico e demonstração ponta a ponta |
| WebSockets | 10 | Autorização no handshake, canais, reconexão, cliente de demonstração |
| **Eixo do projeto** — concorrência | 10 | Transação com isolamento adequado, lock explícito e justificado, bloqueio atômico de múltiplos assentos, expiração automática, idempotência e teste de rajada provando ausência de reserva dupla |
| Qualidade e organização | 5 | Separação em camadas, legibilidade, histórico de commits, README que permite subir o projeto |

## 13. Regras gerais

> **Independência entre projetos**
>
> Cada serviço é avaliado **isoladamente**. Toda entrada externa precisa ser demonstrável pelo Swagger, por `curl` ou por massa de teste própria. Integração com o projeto de colega, se houver, é **bônus opcional** e jamais pode ser pré-requisito da apresentação.

- Trabalho **individual**. Discussão entre colegas é bem-vinda; código compartilhado, não.
- Repositório Git com histórico distribuído ao longo do semestre. Commit único na véspera é penalizado.
- Uso de assistentes de IA é permitido, mas o aluno precisa **explicar qualquer trecho** do próprio código quando questionado na apresentação.
- Bibliotecas de terceiros são livres para a tarefa-fim (gerar comprovante, desenhar o mapa no cliente de demonstração). O que não pode é terceirizar a arquitetura do serviço nem o controle de concorrência.
- O serviço deve subir com um comando, a partir do README, em máquina limpa.

## 14. Entregáveis

1. **Repositório Git** com os três microserviços e histórico de commits.
2. **Especificação Open-API** versionada no repositório e servida via Swagger UI.
3. **Docker Compose** que sobe aplicação e banco.
4. **README** com instruções de instalação, variáveis de ambiente, comandos de migration e seed, e a justificativa da estratégia de controle de concorrência adotada.
5. **Massa de teste** (seed) com pelo menos um mapa irregular — corredores, fileiras de tamanhos diferentes e lugares para cadeirante — suficiente para demonstrar todas as funcionalidades.
6. **Script de rajada simultânea** que dispara pedidos concorrentes sobre o mesmo assento e imprime o resultado de cada um.
7. **Apresentação** com demonstração funcional ponta a ponta.
