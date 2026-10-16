/*
  Warnings:

  - A unique constraint covering the columns `[provedorId,idNaConta]` on the table `contas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `atualizadoEm` to the `verificacoes` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "contas_usuarioId_key";

-- AlterTable
ALTER TABLE "contas" ADD COLUMN     "escopo" TEXT,
ADD COLUMN     "tokenIdentidade" TEXT;

-- AlterTable
ALTER TABLE "verificacoes" ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "contas_usuarioId_idx" ON "contas"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "contas_provedorId_idNaConta_key" ON "contas"("provedorId", "idNaConta");

-- CreateIndex
CREATE INDEX "verificacoes_identificador_idx" ON "verificacoes"("identificador");
