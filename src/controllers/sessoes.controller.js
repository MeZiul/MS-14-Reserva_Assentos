import { listar, buscarPorId, criar, atualizar, remover } from "../services/index.js";

export async function listarSessoes(req, res, next) {
  try {
    const resultado = await listar(req.query);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function buscarSessaoPorId(req, res, next) {
  try {
    const sessao = await buscarPorId(req.params.id);

    return res.status(200).json(sessao);
  } catch (error) {
    next(error);
  }
}

export async function criarSessao(req, res, next) {
  try {
    const sessao = await criar(req.body);

    return res.status(201).json(sessao);
  } catch (error) {
    next(error);
  }
}

export async function atualizarSessao(req, res, next) {
  try {
    const sessao = await atualizar(req.params.id, req.body);

    return res.status(200).json(sessao);
  } catch (error) {
    next(error);
  }
}

export async function removerSessao(req, res, next) {
  try {
    await remover(req.params.id);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}