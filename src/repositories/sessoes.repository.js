import BaseRepository from "./base/base.repository.js";

class SessoesRepository extends BaseRepository {
  constructor() {
    super("sessao");
  }

  listarComLocal() {
    return this.listar({},
      {
        include: {
          mapa: { include: { local: true } },
          faixas: { include: { setor: true } }
        },
        orderBy: { inicioEm: "asc" }
      }
    );
  }

  async listarComFiltros(filtros) {
    const { localId, de, ate, situacao, pagina, limite } = filtros;

    const where = {};

    if (localId) where.mapa = { is: { localId } };

    if (situacao) where.situacao = situacao;

    if (de || ate) {
      where.inicioEm = {
        ...(de ? { gte: de } : {}),
        ...(ate ? { lte: ate } : {})
      };
    }

    const skip = (pagina - 1) * limite;

    const [totalDocs, docs] = await this.prisma.$transaction([
      this.db.count({ where }),

      this.db.findMany({
        where,
        skip,
        take: limite,

        orderBy: { inicioEm: "asc" },

        include: {
          mapa: { include: { local: true } },
          faixas: { include: { setor: true } },
        }
      })
    ]);

    const totalPages = Math.ceil(totalDocs / limite);

    return {
      docs,
      totalDocs,
      limite,
      totalPages,
      pagina,
      hasPrevPage: pagina > 1,
      hasNextPage: pagina < totalPages,
      prevPage: pagina > 1 ? pagina - 1 : null,
      nextPage: pagina < totalPages ? pagina + 1 : null,
    };
  }

  buscarPorIdComMapa(id) {
    return this.buscarPorId(id, {
      include: {
        mapa: {
          include: {
            local: true,
            setores: {
              include: {
                assentos: true
              }
            }
          }
        },

        faixas: {
          include: {
            setor: true
          }
        }
      }
    });
  }

  buscarPorIdComLocal(id) {
    return this.buscarPorId(id, {
      include: {
        mapa: {
          include: {
            local: true
          }
        },

        faixas: {
          include: {
            setor: true
          }
        }
      }
    });
  }


  async criarComLocal({ mapaId, inicioEm, situacao, prazoBloqueioSegundos, maxProrrogacoes, faixas }) {
    return this.prisma.$transaction(async (tx) => {
      const mapa = await tx.mapa.findUnique({
        where: { id: mapaId },
        include: {
          setores: {
            include: { assentos: true }
          }
        }
      });

      if (!mapa) {
        const error = new Error("Mapa não encontrado.");
        error.status = 404;
        throw error;
      }

      const assentosIds = mapa.setores.flatMap(
        (setor) => setor.assentos.map((assento) => assento.id)
      );

      if (assentosIds.length === 0) {
        const error = new Error("O mapa não possui assentos.");
        error.status = 422;
        throw error;
      }

      const sessao = await tx.sessao.create({
        data: {
          mapaId,
          inicioEm,
          situacao,
          prazoBloqueioSegundos,
          maxProrrogacoes,
          faixas: {
            create: faixas.map((faixa) => ({
              setorId: faixa.setorId,
              valor: faixa.valor,
              meiaEntrada: faixa.meiaEntrada ?? null,
              vigenteDe: faixa.vigenteDe,
              vigenteAte: faixa.vigenteAte ?? null
            }))
          }
        }
      });

      await tx.assentoSessao.createMany({
        data: assentosIds.map((assentoId) => ({
          sessaoId: sessao.id,
          assentoId,
          estado: "LIVRE"
        }))
      });

      return tx.sessao.findUnique({
        where: { id: sessao.id },
        include: {
          mapa: {
            include: { local: true }
          },
          faixas: {
            include: { setor: true }
          }
        }
      });
    });
  }

  atualizarComLocal(id, dados) {
    return this.atualizar(id, dados).then(() => { return this.buscarPorIdComLocal(id) });
  }
}

export const sessoesRepository = new SessoesRepository();