import { usuariosRepository } from "../repositories/usuarios.repository.js";

function erro(mensagem, status = 400) {
    const error = new Error(mensagem);
    error.status = status;
    return error;
}

export async function listarUsuarios(filtros) {
    return usuariosRepository.listarPaginado(filtros.page, filtros.limit);
}

export async function buscarUsuarioPorId(id) {
    const usuario = await usuariosRepository.buscarPorIdPublico(id);

    if (!usuario) {
        throw erro("Usuário não encontrado.", 404);
    }

    return usuario;
}

export async function criarUsuario(dados) {
    return usuariosRepository.criarUsuario(dados);
}

export async function atualizarUsuario(id, dados) {
    const usuario = await usuariosRepository.buscarPorIdPublico(id);

    if (!usuario) {
        throw erro("Usuário não encontrado.", 404);
    }

    return usuariosRepository.atualizarUsuario(id, dados);
}

export async function removerUsuario(id) {
    const usuario = await usuariosRepository.buscarPorIdPublico(id);

    if (!usuario) {
        throw erro("Usuário não encontrado.", 404);
    }

    await usuariosRepository.removerUsuario(id);
}
