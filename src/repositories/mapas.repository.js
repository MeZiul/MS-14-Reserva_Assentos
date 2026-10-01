import BaseRepository from "./base/base.repository.js";

class MapasRepository extends BaseRepository {
  constructor() {
    super("mapa");
  }

  listarComLocal() {
    return this.listar(
      {},
      {
        include: { local: true },
        orderBy: { nome: "asc" }
      }
    );
  }

  buscarPorIdComLocal(id) {
    return this.buscarPorId(id, {
      include: { local: true },
    });
  }

  buscarPorIdComSetores(id) {
    return this.buscarPorId(id, {
      include: {
        local: true,
        setores: {
          include: { assentos: true }
        }
      }
    });
  }

  criarComLocal(dados) {
    return this.criar(dados).then((mapa) => {
      return this.buscarPorIdComLocal(mapa.id);
    });
  }

  atualizarComLocal(id, dados) {
    return this.atualizar(id, dados).then(() => {
      return this.buscarPorIdComLocal(id);
    });
  }
}

export const mapasRepository = new MapasRepository();