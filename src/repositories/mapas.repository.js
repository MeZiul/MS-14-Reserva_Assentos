import BaseRepository from "./base/base.repository.js";

class MapasRepository extends BaseRepository {
  constructor() {
    super("mapa");
  }

  listarComLocal() {
    return this.listar({},
      {
        include: { local: true },
        orderBy: { nome: "asc" }
      }
    );
  }

  buscarPorIdComLocal(id) {
    return this.buscarPorId(id, {
      include: { local: true }
    });
  }

  buscarPorIdComSetores(id) {
    return this.buscarPorId(id, {
      include: {
        local: true,
        setores: { include: { assentos: true } }
      }
    });
  }

  criarComEstrutura({ localId, nome, capacidadeTotal, setores }) {
    return this.db.create({
      data: {
        nome,
        capacidadeTotal,

        local: { connect: { id: localId } },

        setores: {
          create: setores.map((setor) => ({
            nome: setor.nome,
            ordemExibicao: setor.ordemExibicao,
            categoria: setor.categoria ?? null,

            assentos: {
              create: setor.assentos.map((assento) => ({
                fileira: assento.fileira,
                numero: assento.numero,
                x: assento.x,
                y: assento.y,
                atributo: assento.atributo,
                ordemNaFileira: assento.ordemNaFileira,
              }))
            }
          }))
        }
      },

      include: {
        local: true,
        setores: { include: { assentos: true } }
      }
    });
  }

  atualizarComLocal(id, dados) {
    return this.atualizar(id, dados).then(() => {
      return this.buscarPorIdComLocal(id);
    });
  }
}

export const mapasRepository = new MapasRepository();