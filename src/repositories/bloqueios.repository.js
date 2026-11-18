import { prisma } from "../lib/prisma.js";
import { ESTADO_ASSENTO } from "../constants/seat-status.js";
import { SITUACAO_BLOQUEIO } from "../constants/lock-status.js";

export const bloqueiosRepository = {

  // Serializa as operações de uma mesma sessão
  async bloquearSessao(tx, sessaoId) {
    const resultado = await tx.$queryRaw`
      SELECT id
      FROM sessoes
      WHERE id = ${sessaoId}::uuid
      FOR UPDATE
    `;

    return resultado.length > 0;
  },

  // Consulta a sessão e suas faixas de preço
  buscarSessao(tx, sessaoId) {
    return tx.sessao.findUnique({
      where: { id: sessaoId },
      include: {
        mapa: true,
        faixas: true
      }
    });
  },

  // Lista os assentos e seus estados na sessão
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

  // Consulta um bloqueio pertencente ao comprador
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

  // Busca um bloqueio pela chave de criação
  // Pode receber tanto o Prisma Client quanto o cliente de uma transação
  buscarPorChaveCriacao(db, compradorId, chaveCriacao) {
    return db.bloqueio.findUnique({
      where: {
        compradorId_chaveCriacao: {
          compradorId,
          chaveCriacao
        }
      }
    });
  },

  // Cria um bloqueio preservando os dados necessários à idempotência
  criar(tx, dados) {
    return tx.bloqueio.create({
      data: {
        sessaoId: dados.sessaoId,
        compradorId: dados.compradorId,
        expiraEm: dados.expiraEm,
        situacao: SITUACAO_BLOQUEIO.ATIVO,

        chaveCriacao: dados.chaveCriacao,
        hashRequisicao: dados.hashRequisicao,
        assentosCriacao: dados.assentosCriacao
      }
    });
  },

  //Bloqueia somente assentos que continuam livres
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

  // Libera bloqueios que ultrapassaram o prazo de expiração
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

  // Executa operações em uma transação Prisma 

  async executarTransacao(callback) {
    const MAX_TENTATIVAS = 3;

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      try {
        return await prisma.$transaction(callback, {
          maxWait: 30000,
          timeout: 60000
        });
      } catch (error) {
        const falhaAoIniciar =
          error.code === "P2028" &&
          error.message?.includes("Unable to start a transaction");

        // Não repete erros de negócio, transações expiradas ou falhas de outra natureza
        if (!falhaAoIniciar || tentativa === MAX_TENTATIVAS) throw error;

        // Pequeno intervalo antes de tentar adquirir uma nova transação
        const atraso = 200 * tentativa;

        console.warn(`Transação indisponível ` + `Tentativa ${tentativa}/${MAX_TENTATIVAS}`);

        await new Promise((resolve) =>
          setTimeout(resolve, atraso)
        );
      }
    }
  },

  // Consulta os detalhes de um bloqueio 
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

  // Identifica o bloqueio e a sessão vinculada
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

  // Prorroga o prazo de um bloqueio
  atualizarProrrogacao(tx, bloqueioId, novaExpiracao) {
    return tx.bloqueio.update({
      where: { id: bloqueioId },
      data: {
        expiraEm: novaExpiracao,
        prorrogacoes: { increment: 1 }
      }
    });
  },

  // Marca um bloqueio como liberado
  marcarLiberado(tx, bloqueioId) {
    return tx.bloqueio.update({
      where: { id: bloqueioId },
      data: {
        situacao: SITUACAO_BLOQUEIO.LIBERADO
      }
    });
  },

  // Libera os assentos associados ao bloqueio
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

  // Incrementa a versão lógica da sessão
  incrementarVersaoSessao(tx, sessaoId) {
    return tx.sessao.update({
      where: { id: sessaoId },
      data: {
        versao: { increment: 1 }
      }
    });
  }
};