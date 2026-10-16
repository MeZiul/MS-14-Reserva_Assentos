import { listar, buscarPorId, criar, atualizar, remover } from "../services/sessoes.service.js";

export async function listarSessoes(req, res, next) {
  try {
    const resultado = await listar(req.validated.query);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function buscarSessaoPorId(req, res, next) {
  try {
    const sessao = await buscarPorId(req.validated.params.id);

    return res.status(200).json(sessao);
  } catch (error) {
    next(error);
  }
}

export async function criarSessao(req, res, next) {
  try {
    const sessao = await criar(req.validated.body);

    return res.status(201).json(sessao);
  } catch (error) {
    next(error);
  }
}

export async function atualizarSessao(req, res, next) {
  try {
    const sessao = await atualizar(req.validated.params.id, req.validated.body);

    return res.status(200).json(sessao);
  } catch (error) {
    next(error);
  }
}

export async function removerSessao(req, res, next) {
  try {
    await remover(req.validated.params.id);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}