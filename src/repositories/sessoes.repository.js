// src/repositories/sessoes.repository.js

import BaseRepository from "./base/base.repository.js";

class SessoesRepository extends BaseRepository {
  constructor() {
    super("sessao");
  }

  listarComLocal() {
    return this.listar(
      {},
      {
        include: { mapa: { include: { local: true }, }, },

        orderBy: { inicioEm: "asc" },
      }
    );
  }

  buscarPorIdComMapa(id) {
    return this.buscarPorId(
      id,
      {
        include: {
          mapa: {
            include: {
              local: true,
              setores: { include: { assentos: true } }
            }
          }
        }
      }
    );
  }

  buscarPorIdComLocal(id) {
    return this.buscarPorId(
      id,
      {
        include: { mapa: { include: { local: true } } }
      }
    );
  }

  criarComLocal(dados) {
    return this.criar(dados).then((sessao) => {
      return this.buscarPorIdComLocal(sessao.id);
    });
  }

  atualizarComLocal(id, dados) {
    return this.atualizar(id, dados).then(() => {
      return this.buscarPorIdComLocal(id);
    });
  }
}

export const sessoesRepository = new SessoesRepository();