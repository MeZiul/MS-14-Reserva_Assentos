/*
  Warnings:

  - A unique constraint covering the columns `[compradorId,chaveCriacao]` on the table `bloqueios` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bloqueios" ADD COLUMN     "assentosCriacao" JSONB,
ADD COLUMN     "chaveCriacao" TEXT,
ADD COLUMN     "hashRequisicao" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bloqueios_compradorId_chaveCriacao_key" ON "bloqueios"("compradorId", "chaveCriacao");
