-- DropIndex
DROP INDEX "assentos_sessao_bloqueioAtualId_key";

-- DropIndex
DROP INDEX "assentos_sessao_reservaAtualId_key";

-- AlterTable
ALTER TABLE "assentos" ADD COLUMN     "grupoContiguo" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "assentos_sessao_bloqueioAtualId_idx" ON "assentos_sessao"("bloqueioAtualId");

-- CreateIndex
CREATE INDEX "assentos_sessao_reservaAtualId_idx" ON "assentos_sessao"("reservaAtualId");
