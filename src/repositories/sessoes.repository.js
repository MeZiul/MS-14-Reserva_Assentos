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

  criarComLocal({ mapaId, inicioEm, situacao, prazoBloqueioSegundos, maxProrrogacoes, faixas }) {
    return this.db.create({
      data: {
        inicioEm,
        situacao,
        prazoBloqueioSegundos,
        maxProrrogacoes,

        mapa: {
          connect: {
            id: mapaId
          }
        },

        faixas: {
          create: faixas.map((faixa) => ({
            valor: faixa.valor,
            meiaEntrada: faixa.meiaEntrada ?? null,
            vigenteDe: faixa.vigenteDe,
            vigenteAte: faixa.vigenteAte ?? null,

            setor: {
              connect: {
                id: faixa.setorId
              }
            }
          }))
        }
      },

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

  atualizarComLocal(id, dados) {
    return this.atualizar(id, dados).then(() => { return this.buscarPorIdComLocal(id) });
  }
}

export const sessoesRepository = new SessoesRepository();