# WS-14 · MS-A — REST + Open-API

Microserviço **MS-A** do projeto **WS-14 — API de Reserva de Assentos**.
Web Services · 4º semestre · CST em Análise e Desenvolvimento de Sistemas · IFRO Campus Vilhena · 2026/2.

| | |
|---|---|
| **RFP de referência** | [WS-14 — API de Reserva de Assentos](docs/RFP.md) |
| **Microserviço** | MS-A — REST + Open-API |
| **Tecnologias** | REST · Open-API 3.x · Swagger UI · BetterAuth · Prisma |
| **Eixo do projeto** | Concorrência |
| **Repositórios do projeto** | `ms-a-rest` (este) · [`ms-b-graphql`](../ms-b-graphql) · [`ms-c-websocket`](../ms-c-websocket) |

> **Documento de referência**
>
> O RFP completo está versionado neste repositório em [`docs/RFP.md`](docs/RFP.md).
> Ele descreve **o que** o serviço deve fazer, não **como** implementar — as decisões de projeto
> são responsabilidade de quem desenvolve e fazem parte da avaliação.

---

## Responsabilidade deste repositório

Cadastro de locais, mapas, sessões e preços; bloqueio, confirmação e cancelamento de assentos. Documentado em Swagger.

---

## MS-A — API REST documentada em Open-API

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

## Autenticação e autorização

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

---

## Contexto do produto

Cinemas, teatros, casas de show, companhias aéreas e empresas de ônibus vendem o mesmo tipo de coisa: um lugar específico, numerado, que só pode pertencer a uma pessoa. Quando um espetáculo popular abre vendas, milhares de compradores entram no mapa de assentos ao mesmo tempo e muitos deles clicam *exatamente na mesma poltrona* no mesmo segundo. O sistema precisa escolher um vencedor e informar aos demais, imediatamente, que aquele lugar já não está disponível.

A dificuldade não está em gravar a reserva — está no intervalo entre a escolha e o pagamento. O comprador seleciona os assentos, digita os dados do cartão, confere o valor, erra o CVV, tenta de novo. Durante esses minutos o lugar não pode ser vendido a outra pessoa, mas também não pode ficar preso para sempre: se o comprador fechar o navegador, o assento tem que voltar ao mercado sozinho, sem que ninguém precise intervir. Esse **bloqueio temporário que expira por conta própria** é o coração do produto.

Some-se a isso a irregularidade do mundo real. Salas não são grades perfeitas: existem corredores, fileiras com quantidades diferentes de poltronas, lugares para cadeirantes e acompanhantes, cabines, camarotes e assentos com visão obstruída que valem menos. E há a regra que mais causa insatisfação quando falha: um grupo de quatro pessoas quer sentar junto, e o serviço precisa conseguir bloquear quatro poltronas adjacentes **de forma atômica** — ou todas, ou nenhuma. Reservar três e falhar na quarta é pior do que recusar o pedido inteiro.

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

---

## Marcos de entrega que envolvem este repositório

| Etapa | Marco | O que deve estar funcionando |
|---|---|---|
| **1** | MS-A — REST + Open-API | Locais, mapas, sessões e assentos persistidos; bloqueio e confirmação funcionando, especificação Open-API completa e Swagger UI navegável |
| **2** | Autenticação | BetterAuth funcionando, papéis comprador e promotor, isolamento por cliente demonstrável |
| **6** | Integração | Os três serviços operando juntos, teste de rajada simultânea e documentação final |
| **7** | Apresentação | Demonstração funcional ponta a ponta, incluindo disputa real pelo mesmo assento |

Os marcos completos do projeto estão na seção 11 do [RFP](docs/RFP.md).

---

## Stack obrigatória

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

---

## Como executar

> Preencher durante o desenvolvimento. O RFP exige que o serviço suba **com um comando,
> a partir deste README, em máquina limpa**.

```bash
cp .env.example .env      # variáveis de ambiente
docker compose up -d      # aplicação + PostgreSQL
npx prisma migrate deploy # migrations
npm run seed              # massa de teste
```

| Item | Onde |
|---|---|
| Swagger UI | `http://localhost:PORTA/docs` |
| Especificação Open-API | `openapi.yaml` (a versionar) |

---

## Entregáveis e regras

1. **Repositório Git** com os três microserviços e histórico de commits.
2. **Especificação Open-API** versionada no repositório e servida via Swagger UI.
3. **Docker Compose** que sobe aplicação e banco.
4. **README** com instruções de instalação, variáveis de ambiente, comandos de migration e seed, e a justificativa da estratégia de controle de concorrência adotada.
5. **Massa de teste** (seed) com pelo menos um mapa irregular — corredores, fileiras de tamanhos diferentes e lugares para cadeirante — suficiente para demonstrar todas as funcionalidades.
6. **Script de rajada simultânea** que dispara pedidos concorrentes sobre o mesmo assento e imprime o resultado de cada um.
7. **Apresentação** com demonstração funcional ponta a ponta.

> **Independência entre projetos**
>
> Cada serviço é avaliado **isoladamente**. Toda entrada externa precisa ser demonstrável pelo Swagger, por `curl` ou por massa de teste própria. Integração com o projeto de colega, se houver, é **bônus opcional** e jamais pode ser pré-requisito da apresentação.

- Trabalho **individual**. Discussão entre colegas é bem-vinda; código compartilhado, não.
- Repositório Git com histórico distribuído ao longo do semestre. Commit único na véspera é penalizado.
- Uso de assistentes de IA é permitido, mas o aluno precisa **explicar qualquer trecho** do próprio código quando questionado na apresentação.
- Bibliotecas de terceiros são livres para a tarefa-fim (gerar comprovante, desenhar o mapa no cliente de demonstração). O que não pode é terceirizar a arquitetura do serviço nem o controle de concorrência.
- O serviço deve subir com um comando, a partir do README, em máquina limpa.

---

RFP WS-14 · API de Reserva de Assentos · Web Services (WS) — 4º semestre · CST em Análise e Desenvolvimento de Sistemas · IFRO Campus Vilhena · período letivo 2026/2
