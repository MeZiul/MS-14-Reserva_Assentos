import { prisma } from "../lib/prisma.js";
import { ESTADO_ASSENTO } from "../constants/seat-status.js";
import { SITUACAO_BLOQUEIO } from "../constants/lock-status.js";

export const bloqueiosRepository = {

  async bloquearSessao(tx, sessaoId) {
    const resultado = await tx.$queryRaw`
      SELECT id
      FROM sessoes
      WHERE id = ${sessaoId}::uuid
      FOR UPDATE
    `;

    return resultado.length > 0;
  },

  buscarSessao(tx, sessaoId) {
    return tx.sessao.findUnique({
      where: { id: sessaoId },
      include: {
        mapa: true,
        faixas: true
      }
    });
  },

  listarAssentos(tx, sessaoId) {
    return tx.assentoSessao.findMany({
      where: { sessaoId },
      include: {
        assento: {
          include: { setor: true }
        },
        bloqueioAtual: true
      },
      orderBy: [
        { assento: { setorId: "asc" } },
        { assento: { fileira: "asc" } },
        { assento: { ordemNaFileira: "asc" } }
      ]
    });
  },

  buscarBloqueio(tx, bloqueioId, compradorId) {
    return tx.bloqueio.findFirst({
      where: {
        id: bloqueioId,
        compradorId
      },
      include: {
        assentosAtuais: true
      }
    });
  },

  criar(tx, dados) {
    return tx.bloqueio.create({
      data: {
        sessaoId: dados.sessaoId,
        compradorId: dados.compradorId,
        expiraEm: dados.expiraEm,
        situacao: SITUACAO_BLOQUEIO.ATIVO
      }
    });
  },

  async marcarAssentos(tx, sessaoId, ids, bloqueioId) {
    const resultado = await tx.assentoSessao.updateMany({
      where: {
        sessaoId,
        assentoId: { in: ids },
        estado: ESTADO_ASSENTO.LIVRE,
        bloqueioAtualId: null
      },
      data: {
        estado: ESTADO_ASSENTO.BLOQUEADO,
        bloqueioAtualId: bloqueioId,
        versao: { increment: 1 }
      }
    });

    return resultado.count;
  },

  async liberarExpirados(tx, sessaoId, agora) {
    const expirados = await tx.bloqueio.findMany({
      where: {
        sessaoId,
        situacao: SITUACAO_BLOQUEIO.ATIVO,
        expiraEm: { lte: agora }
      },
      select: { id: true }
    });

    if (expirados.length === 0) return 0;

    const ids = expirados.map((item) => item.id);

    await tx.assentoSessao.updateMany({
      where: {
        sessaoId,
        estado: ESTADO_ASSENTO.BLOQUEADO,
        bloqueioAtualId: { in: ids }
      },
      data: {
        estado: ESTADO_ASSENTO.LIVRE,
        bloqueioAtualId: null,
        versao: { increment: 1 }
      }
    });

    await tx.bloqueio.updateMany({
      where: {
        id: { in: ids },
        situacao: SITUACAO_BLOQUEIO.ATIVO
      },
      data: {
        situacao: SITUACAO_BLOQUEIO.EXPIRADO
      }
    });

    return ids.length;
  },

  async executarTransacao(callback) {
    return prisma.$transaction(callback, {
      maxWait: 30000,
      timeout: 60000
    });
  },

  buscarBloqueioComSessao(tx, bloqueioId, compradorId) {
    return tx.bloqueio.findFirst({
      where: {
        id: bloqueioId,
        compradorId
      },
      include: {
        sessao: {
          select: {
            id: true,
            inicioEm: true,
            situacao: true,
            prazoBloqueioSegundos: true,
            maxProrrogacoes: true
          }
        },
        assentosAtuais: {
          include: {
            assento: {
              select: {
                id: true,
                setorId: true,
                fileira: true,
                numero: true
              }
            }
          }
        }
      }
    });
  },

  buscarIdentificacaoBloqueio(tx, bloqueioId, compradorId) {
    return tx.bloqueio.findFirst({
      where: {
        id: bloqueioId,
        compradorId
      },
      select: {
        id: true,
        sessaoId: true
      }
    });
  },

  atualizarProrrogacao(tx, bloqueioId, novaExpiracao) {
    return tx.bloqueio.update({
      where: { id: bloqueioId },
      data: {
        expiraEm: novaExpiracao,
        prorrogacoes: { increment: 1 }
      }
    });
  },

  marcarLiberado(tx, bloqueioId) {
    return tx.bloqueio.update({
      where: { id: bloqueioId },
      data: {
        situacao: SITUACAO_BLOQUEIO.LIBERADO
      }
    });
  },

  liberarAssentosDoBloqueio(tx, sessaoId, bloqueioId) {
    return tx.assentoSessao.updateMany({
      where: {
        sessaoId,
        bloqueioAtualId: bloqueioId,
        estado: ESTADO_ASSENTO.BLOQUEADO
      },
      data: {
        estado: ESTADO_ASSENTO.LIVRE,
        bloqueioAtualId: null,
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

};
