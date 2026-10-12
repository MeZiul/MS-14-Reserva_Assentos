import { z } from "zod";
import { usuariosRepository } from "../repositories/usuarios.repository.js";
import { criarUsuarioSchema, atualizarUsuarioSchema } from "../schemas/usuarios.schema.js";

function erro(mensagem, status = 400) {
    const error = new Error(mensagem);
    error.status = status;
    return error;
}

function validar(schema, dados) {
    const resultado = schema.safeParse(dados);

    if (!resultado.success) {
        const error = erro("Dados inválidos.");
        error.detalhes = z.treeifyError(resultado.error);
        throw error;
    }

    return resultado.data;
}

function validarId(id) {
    if (!z.uuid().safeParse(id).success) throw erro("ID de usuário inválido.");
}

function tratarErroBanco(error) {
    if (error.code === "P2002") throw erro("Já existe um usuário com esse e-mail.", 409);

    if (error.code === "P2003") throw erro("Não é possível excluir o usuário porque existem registros relacionados.", 409);

    throw error;
}

export async function listarUsuarios(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    return usuariosRepository.listarPaginado(page, limit);
}

export async function buscarUsuarioPorId(id) {
    validarId(id);

    const usuario = await usuariosRepository.buscarPorIdPublico(id);

    if (!usuario) throw erro("Usuário não encontrado.", 404);

    return usuario;
}

export async function criarUsuario(dados) {
    const dadosValidados = validar(criarUsuarioSchema, dados);

    try {
        return await usuariosRepository.criarUsuario(dadosValidados);
    } catch (error) {
        tratarErroBanco(error);
    }
}

export async function atualizarUsuario(id, dados) {
    validarId(id);

    const dadosValidados = validar(atualizarUsuarioSchema, dados);

    try {
        return await usuariosRepository.atualizarUsuario(id, dadosValidados);
    } catch (error) {
        if (error.code === "P2025") throw erro("Usuário não encontrado.", 404);

        tratarErroBanco(error);
    }
}

export async function removerUsuario(id) {
    validarId(id);

    const usuario = await usuariosRepository.buscarPorIdPublico(id);

    if (!usuario) throw erro("Usuário não encontrado.", 404);

    try {
        await usuariosRepository.removerUsuario(id);
    } catch (error) {
        tratarErroBanco(error);
    }
}
