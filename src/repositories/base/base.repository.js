// src/repositories/base/base.repository.js

import { prisma } from "../../lib/prisma.js";

class BaseRepository {
  /**
   * @param {string} delegate
   * Nome do model no Prisma Client.
   *
   * Exemplos do seu projeto:
   * 'local'
   * 'mapa'
   * 'sessao'
   * 'bloqueio'
   * 'reserva'
   * 'usuario'
   */
  constructor(delegate) {
    if (typeof delegate !== "string" || !prisma[delegate]) {
      throw new Error(
        `BaseRepository: delegate Prisma inválido: "${delegate}"`
      );
    }

    this.delegate = delegate;
    this.prisma = prisma;
  }

  /**
   * Delegate Prisma do model.
   *
   * Exemplo:
   * this.db === prisma.sessao
   */
  get db() {
    return this.prisma[this.delegate];
  }

  buscarPorId(id, options = {}) {
    return this.db.findUnique({
      where: { id },

      ...(options.select
        ? { select: options.select }
        : {}),

      ...(options.include
        ? { include: options.include }
        : {}),
    });
  }

  buscarPrimeiro(where = {}, options = {}) {
    return this.db.findFirst({
      where,

      ...(options.orderBy
        ? { orderBy: options.orderBy }
        : {}),

      ...(options.select
        ? { select: options.select }
        : {}),

      ...(options.include
        ? { include: options.include }
        : {}),
    });
  }

  listar(where = {}, options = {}) {
    return this.db.findMany({
      where,

      ...(options.orderBy
        ? { orderBy: options.orderBy }
        : {}),

      ...(options.select
        ? { select: options.select }
        : {}),

      ...(options.include
        ? { include: options.include }
        : {}),
    });
  }

  /**
   * Paginação.
   *
   * Mantém o formato compatível com mongoose-paginate-v2:
   *
   * {
   *   docs,
   *   totalDocs,
   *   limit,
   *   totalPages,
   *   page,
   *   pagingCounter,
   *   hasPrevPage,
   *   hasNextPage,
   *   prevPage,
   *   nextPage
   * }
   */
  async listarComPaginacao(where = {}, options = {}) {
    const page = Math.max(
      1,
      Number(options.page) || 1
    );

    const limit = Math.max(
      1,
      Number(options.limit) || 20
    );

    const skip = (page - 1) * limit;

    const consulta = {
      where,
      skip,
      take: limit,

      ...(options.orderBy
        ? { orderBy: options.orderBy }
        : {}),

      ...(options.select
        ? { select: options.select }
        : {}),

      ...(options.include
        ? { include: options.include }
        : {}),
    };

    const [totalDocs, docs] =
      await this.prisma.$transaction([
        this.db.count({ where }),
        this.db.findMany(consulta),
      ]);

    const totalPages = Math.max(
      1,
      Math.ceil(totalDocs / limit)
    );

    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    return {
      docs,
      totalDocs,
      limit,
      totalPages,
      page,
      pagingCounter: skip + 1,
      hasPrevPage,
      hasNextPage,
      prevPage: hasPrevPage
        ? page - 1
        : null,
      nextPage: hasNextPage
        ? page + 1
        : null,
    };
  }

  criar(dados) {
    return this.db.create({
      data: dados,
    });
  }

  atualizar(id, dados) {
    return this.db.update({
      where: { id },
      data: dados,
    });
  }

  deletar(id) {
    return this.db.delete({
      where: { id },
    });
  }

  contar(where = {}) {
    return this.db.count({
      where,
    });
  }

  async existe(id) {
    const total = await this.db.count({
      where: { id },
    });

    return total > 0;
  }

  async existeOnde(where = {}) {
    const total = await this.db.count({
      where,
    });

    return total > 0;
  }
}

export default BaseRepository;