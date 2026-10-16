import { prisma } from "../lib/prisma.js";

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
        situacao: "ATIVO"
      }
    });
  },

  async marcarAssentos(tx, sessaoId, ids, bloqueioId) {
    const resultado = await tx.assentoSessao.updateMany({
      where: {
        sessaoId,
        assentoId: { in: ids },
        estado: "LIVRE",
        bloqueioAtualId: null
      },
      data: {
        estado: "BLOQUEADO",
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
        situacao: "ATIVO",
        expiraEm: { lte: agora }
      },
      select: { id: true }
    });

    if (expirados.length === 0) return 0;

    const ids = expirados.map((item) => item.id);

    await tx.assentoSessao.updateMany({
      where: {
        sessaoId,
        estado: "BLOQUEADO",
        bloqueioAtualId: { in: ids }
      },
      data: {
        estado: "LIVRE",
        bloqueioAtualId: null,
        versao: { increment: 1 }
      }
    });

    await tx.bloqueio.updateMany({
      where: {
        id: { in: ids },
        situacao: "ATIVO"
      },
      data: {
        situacao: "EXPIRADO"
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
        situacao: "LIBERADO"
      }
    });
  },

  liberarAssentosDoBloqueio(tx, sessaoId, bloqueioId) {
    return tx.assentoSessao.updateMany({
      where: {
        sessaoId,
        bloqueioAtualId: bloqueioId,
        estado: "BLOQUEADO"
      },
      data: {
        estado: "LIVRE",
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
