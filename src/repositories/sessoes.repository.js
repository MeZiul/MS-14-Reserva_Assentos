// src/repositories/SessoesRepository.js

import BaseRepository from "./base/base.repository.js";

class SessoesRepository extends BaseRepository {
  constructor() {
    super("sessao");
  }

  listarComLocal() {
    return this.listar(
      {},
      {
        include: {
          mapa: {
            include: {
              local: true,
            },
          },
        },

        orderBy: {
          inicioEm: "asc",
        },
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
              setores: {
                include: {
                  assentos: true,
                },
              },
            },
          },
        },
      }
    );
  }
}

export const sessoesRepository =
  new SessoesRepository();