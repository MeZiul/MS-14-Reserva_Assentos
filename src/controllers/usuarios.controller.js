
import {
    listarUsuarios as listar,
    buscarUsuarioPorId as buscarPorId,
    criarUsuario as criar,
    atualizarUsuario as atualizar,
    removerUsuario as remover
} from "../services/usuarios.service.js";

export async function listarUsuarios(req, res, next) {
    try {
        return res.json(await listar(req.query));
    } catch (error) {
        next(error);
    }
}

export async function buscarUsuario(req, res, next) {
    try {
        return res.json(await buscarPorId(req.params.id));
    } catch (error) {
        next(error);
    }
}

export async function criarUsuario(req, res, next) {
    try {
        const usuario = await criar(req.body);
        return res.status(201).json(usuario);
    } catch (error) {
        next(error);
    }
}

export async function atualizarUsuario(req, res, next) {
    try {
        const usuario = await atualizar(req.params.id, req.body);
        return res.json(usuario);
    } catch (error) {
        next(error);
    }
}

export async function removerUsuario(req, res, next) {
    try {
        await remover(req.params.id);
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}
