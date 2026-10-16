import BaseRepository from "./base/base.repository.js";

const camposPublicos = {
    id: true,
    nome: true,
    email: true,
    papel: true,
    imagem: true,
    emailVerificado: true,
    criadoEm: true,
    atualizadoEm: true,
};

class UsuariosRepository extends BaseRepository {
    constructor() {
        super("usuario");
    }

    buscarPapelPorId(id) {
        return this.db.findUnique({
            where: { id },
            select: {
                id: true,
                papel: true
            }
        });
    }

    listarPaginado(page, limit) {
        return this.listarComPaginacao({},
            {
                page,
                limit,
                orderBy: { criadoEm: "desc" },
                select: camposPublicos
            }
        );
    }

    buscarPorIdPublico(id) {
        return this.buscarPorId(id, { select: camposPublicos });
    }

    criarUsuario(dados) {
        return this.db.create({ data: dados, select: camposPublicos });
    }

    atualizarUsuario(id, dados) {
        return this.db.update({ where: { id }, data: dados, select: camposPublicos });
    }

    removerUsuario(id) {
        return this.deletar(id);
    }
}

export const usuariosRepository = new UsuariosRepository();
