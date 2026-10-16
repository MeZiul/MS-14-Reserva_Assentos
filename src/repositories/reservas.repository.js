import { prisma } from "../lib/prisma.js";
import { ESTADO_ASSENTO } from "../constants/seat-status.js";
import { SITUACAO_BLOQUEIO } from "../constants/lock-status.js";

const incluirReserva = {
    bloqueioOrigem: {
        select: {
            id: true,
            sessaoId: true,
            situacao: true
        }
    },
    assentosAtuais: {
        include: {
            assento: {
                include: {
                    setor: true
                }
            }
        }
    }
};

export const reservasRepository = {
    executarTransacao(callback) {
        return prisma.$transaction(callback, {
            maxWait: 30000,
            timeout: 60000
        });
    },

    buscarBloqueio(tx, bloqueioId, compradorId) {
        return tx.bloqueio.findFirst({
            where: {
                id: bloqueioId,
                compradorId
            },
            include: {
                assentosAtuais: {
                    include: {
                        assento: true
                    }
                },
                reserva: true
            }
        });
    },

    buscarReserva(tx, id, compradorId) {
        return tx.reserva.findFirst({
            where: {
                id,
                compradorId
            },
            include: incluirReserva
        });
    },

    buscarReservaPorBloqueio(tx, bloqueioId) {
        return tx.reserva.findUnique({
            where: {
                bloqueioOrigemId: bloqueioId
            },
            include: incluirReserva
        });
    },

    buscarFaixasPreco(tx, sessaoId) {
        return tx.faixaPreco.findMany({
            where: { sessaoId }
        });
    },

    criar(tx, dados) {
        return tx.reserva.create({
            data: {
                bloqueioOrigemId: dados.bloqueioId,
                compradorId: dados.compradorId,
                valorTotal: dados.valorTotal,
                referenciaPagamento: dados.referenciaPagamento
            }
        });
    },

    confirmarBloqueio(tx, bloqueioId, chave) {
        return tx.bloqueio.update({
            where: { id: bloqueioId },
            data: {
                situacao: SITUACAO_BLOQUEIO.CONFIRMADO,
                chaveIdempotencia: chave
            }
        });
    },

    venderAssentos(tx, sessaoId, bloqueioId, reservaId) {
        return tx.assentoSessao.updateMany({
            where: {
                sessaoId,
                bloqueioAtualId: bloqueioId,
                estado: ESTADO_ASSENTO.BLOQUEADO
            },
            data: {
                estado: ESTADO_ASSENTO.VENDIDO,
                bloqueioAtualId: null,
                reservaAtualId: reservaId,
                versao: { increment: 1 }
            }
        });
    },

    marcarCancelada(tx, reservaId) {
        return tx.reserva.update({
            where: { id: reservaId },
            data: {
                canceladaEm: new Date()
            }
        });
    },

    liberarAssentos(tx, sessaoId, reservaId) {
        return tx.assentoSessao.updateMany({
            where: {
                sessaoId,
                reservaAtualId: reservaId,
                estado: ESTADO_ASSENTO.VENDIDO
            },
            data: {
                estado: ESTADO_ASSENTO.LIVRE,
                reservaAtualId: null,
                versao: { increment: 1 }
            }
        });
    },

    incrementarVersaoSessao(tx, sessaoId) {
        return tx.sessao.update({
            where: { id: sessaoId },
            data: {
                versao: { increment: 1 }
            }
        });
    },

    async bloquearSessao(tx, sessaoId) {
        const registros = await tx.$queryRaw`
      SELECT id
      FROM sessoes
      WHERE id = ${sessaoId}::uuid
      FOR UPDATE
    `;

        return registros.length > 0;
    }
};
