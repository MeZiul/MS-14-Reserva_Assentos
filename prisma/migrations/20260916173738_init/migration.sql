-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('COMPRADOR', 'PROMOTOR');

-- CreateEnum
CREATE TYPE "AtributoAssento" AS ENUM ('PADRAO', 'CADEIRANTE', 'ACOMPANHANTE', 'VISAO_OBSTRUIDA', 'CAMAROTE');

-- CreateEnum
CREATE TYPE "SituacaoSessao" AS ENUM ('AGENDADA', 'VENDAS_ABERTAS', 'ESGOTADA', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoAssento" AS ENUM ('LIVRE', 'BLOQUEADO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "SituacaoBloqueio" AS ENUM ('ATIVO', 'CONFIRMADO', 'EXPIRADO', 'LIBERADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "imagem" TEXT,
    "papel" "Papel" NOT NULL DEFAULT 'COMPRADOR',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes_autenticacao" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "enderecoIp" TEXT,
    "userAgent" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessoes_autenticacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "idNaConta" TEXT NOT NULL,
    "provedorId" TEXT NOT NULL,
    "tokenAcesso" TEXT,
    "tokenAtualizacao" TEXT,
    "tokenAcessoExpiraEm" TIMESTAMP(3),
    "tokenAtualizacaoExpiraEm" TIMESTAMP(3),
    "senha" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificacoes" (
    "id" UUID NOT NULL,
    "identificador" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locais" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "donoId" UUID NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapas" (
    "id" UUID NOT NULL,
    "localId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "capacidadeTotal" INTEGER NOT NULL,
    "versaoLayout" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setores" (
    "id" UUID NOT NULL,
    "mapaId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ordemExibicao" INTEGER NOT NULL,
    "categoria" TEXT,

    CONSTRAINT "setores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assentos" (
    "id" UUID NOT NULL,
    "setorId" UUID NOT NULL,
    "fileira" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "atributo" "AtributoAssento" NOT NULL DEFAULT 'PADRAO',
    "ordemNaFileira" INTEGER NOT NULL,

    CONSTRAINT "assentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" UUID NOT NULL,
    "mapaId" UUID NOT NULL,
    "inicioEm" TIMESTAMP(3) NOT NULL,
    "situacao" "SituacaoSessao" NOT NULL DEFAULT 'AGENDADA',
    "prazoBloqueioSegundos" INTEGER NOT NULL DEFAULT 600,
    "maxProrrogacoes" INTEGER NOT NULL DEFAULT 2,
    "versao" INTEGER NOT NULL DEFAULT 0,
    "esgotadaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faixas_preco" (
    "id" UUID NOT NULL,
    "sessaoId" UUID NOT NULL,
    "setorId" UUID NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "meiaEntrada" DECIMAL(10,2),
    "vigenteDe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenteAte" TIMESTAMP(3),

    CONSTRAINT "faixas_preco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assentos_sessao" (
    "id" UUID NOT NULL,
    "sessaoId" UUID NOT NULL,
    "assentoId" UUID NOT NULL,
    "estado" "EstadoAssento" NOT NULL DEFAULT 'LIVRE',
    "bloqueioAtualId" UUID,
    "reservaAtualId" UUID,
    "versao" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assentos_sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueios" (
    "id" UUID NOT NULL,
    "sessaoId" UUID NOT NULL,
    "compradorId" UUID NOT NULL,
    "chaveIdempotencia" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "prorrogacoes" INTEGER NOT NULL DEFAULT 0,
    "situacao" "SituacaoBloqueio" NOT NULL DEFAULT 'ATIVO',

    CONSTRAINT "bloqueios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" UUID NOT NULL,
    "bloqueioOrigemId" UUID NOT NULL,
    "compradorId" UUID NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "referenciaPagamento" TEXT NOT NULL,
    "confirmadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladaEm" TIMESTAMP(3),

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_autenticacao_token_key" ON "sessoes_autenticacao"("token");

-- CreateIndex
CREATE UNIQUE INDEX "contas_usuarioId_key" ON "contas"("usuarioId");

-- CreateIndex
CREATE INDEX "locais_donoId_idx" ON "locais"("donoId");

-- CreateIndex
CREATE INDEX "mapas_localId_idx" ON "mapas"("localId");

-- CreateIndex
CREATE INDEX "setores_mapaId_idx" ON "setores"("mapaId");

-- CreateIndex
CREATE INDEX "assentos_setorId_fileira_ordemNaFileira_idx" ON "assentos"("setorId", "fileira", "ordemNaFileira");

-- CreateIndex
CREATE UNIQUE INDEX "assentos_setorId_fileira_numero_key" ON "assentos"("setorId", "fileira", "numero");

-- CreateIndex
CREATE INDEX "sessoes_mapaId_situacao_idx" ON "sessoes"("mapaId", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "faixas_preco_sessaoId_setorId_key" ON "faixas_preco"("sessaoId", "setorId");

-- CreateIndex
CREATE UNIQUE INDEX "assentos_sessao_bloqueioAtualId_key" ON "assentos_sessao"("bloqueioAtualId");

-- CreateIndex
CREATE UNIQUE INDEX "assentos_sessao_reservaAtualId_key" ON "assentos_sessao"("reservaAtualId");

-- CreateIndex
CREATE INDEX "assentos_sessao_sessaoId_estado_idx" ON "assentos_sessao"("sessaoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "assentos_sessao_sessaoId_assentoId_key" ON "assentos_sessao"("sessaoId", "assentoId");

-- CreateIndex
CREATE UNIQUE INDEX "bloqueios_chaveIdempotencia_key" ON "bloqueios"("chaveIdempotencia");

-- CreateIndex
CREATE INDEX "bloqueios_sessaoId_situacao_idx" ON "bloqueios"("sessaoId", "situacao");

-- CreateIndex
CREATE INDEX "bloqueios_compradorId_situacao_idx" ON "bloqueios"("compradorId", "situacao");

-- CreateIndex
CREATE INDEX "bloqueios_expiraEm_idx" ON "bloqueios"("expiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_bloqueioOrigemId_key" ON "reservas"("bloqueioOrigemId");

-- CreateIndex
CREATE INDEX "reservas_compradorId_idx" ON "reservas"("compradorId");

-- AddForeignKey
ALTER TABLE "sessoes_autenticacao" ADD CONSTRAINT "sessoes_autenticacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas" ADD CONSTRAINT "contas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locais" ADD CONSTRAINT "locais_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapas" ADD CONSTRAINT "mapas_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setores" ADD CONSTRAINT "setores_mapaId_fkey" FOREIGN KEY ("mapaId") REFERENCES "mapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assentos" ADD CONSTRAINT "assentos_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "setores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_mapaId_fkey" FOREIGN KEY ("mapaId") REFERENCES "mapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faixas_preco" ADD CONSTRAINT "faixas_preco_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "sessoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faixas_preco" ADD CONSTRAINT "faixas_preco_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "setores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assentos_sessao" ADD CONSTRAINT "assentos_sessao_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "sessoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assentos_sessao" ADD CONSTRAINT "assentos_sessao_assentoId_fkey" FOREIGN KEY ("assentoId") REFERENCES "assentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assentos_sessao" ADD CONSTRAINT "assentos_sessao_bloqueioAtualId_fkey" FOREIGN KEY ("bloqueioAtualId") REFERENCES "bloqueios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assentos_sessao" ADD CONSTRAINT "assentos_sessao_reservaAtualId_fkey" FOREIGN KEY ("reservaAtualId") REFERENCES "reservas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "sessoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_bloqueioOrigemId_fkey" FOREIGN KEY ("bloqueioOrigemId") REFERENCES "bloqueios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
