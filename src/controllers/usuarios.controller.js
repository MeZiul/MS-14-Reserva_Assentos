import { listarUsuarios as listar, buscarUsuarioPorId as buscarPorId, criarUsuario as criar, atualizarUsuario as atualizar, removerUsuario as remover } from "../services/usuarios.service.js";

export async function listarUsuarios(req, res, next) {
    try {
        const resultado = await listar(req.validated.query);

        return res.status(200).json(resultado);
    } catch (error) {
        next(error);
    }
}

export async function buscarUsuario(req, res, next) {
    try {
        const usuario = await buscarPorId(
            req.validated.params.id
        );

        return res.status(200).json(usuario);
    } catch (error) {
        next(error);
    }
}

export async function criarUsuario(req, res, next) {
    try {
        const usuario = await criar(req.validated.body);

        return res.status(201).json(usuario);
    } catch (error) {
        next(error);
    }
}

export async function atualizarUsuario(req, res, next) {
    try {
        const usuario = await atualizar(
            req.validated.params.id,
            req.validated.body
        );

        return res.status(200).json(usuario);
    } catch (error) {
        next(error);
    }
}

export async function removerUsuario(req, res, next) {
    try {
        await remover(req.validated.params.id);

        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}