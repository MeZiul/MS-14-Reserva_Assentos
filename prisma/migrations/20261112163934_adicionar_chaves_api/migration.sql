-- CreateEnum
CREATE TYPE "EscopoChaveApi" AS ENUM ('LEITURA', 'LEITURA_ESCRITA');

-- CreateTable
CREATE TABLE "chaves_api" (
    "id" UUID NOT NULL,
    "donoId" UUID NOT NULL,
    "hash" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "escopo" "EscopoChaveApi" NOT NULL DEFAULT 'LEITURA',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUsoEm" TIMESTAMP(3),
    "revogadaEm" TIMESTAMP(3),
    "revogadaPorId" UUID,

    CONSTRAINT "chaves_api_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chaves_api_hash_key" ON "chaves_api"("hash");

-- CreateIndex
CREATE INDEX "chaves_api_donoId_idx" ON "chaves_api"("donoId");

-- CreateIndex
CREATE INDEX "chaves_api_revogadaPorId_idx" ON "chaves_api"("revogadaPorId");

-- AddForeignKey
ALTER TABLE "chaves_api" ADD CONSTRAINT "chaves_api_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chaves_api" ADD CONSTRAINT "chaves_api_revogadaPorId_fkey" FOREIGN KEY ("revogadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
