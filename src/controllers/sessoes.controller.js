// src/controllers/sessoes.controller.js

import { listar, buscarPorId, criar, atualizar, remover } from "../services/index.js";

export async function listarSessoes(req, res, next) {
  try {
    const sessoes = await listar();

    return res.json(sessoes);
  } catch (error) {
    next(error);
  }
}

export async function buscarSessaoPorId(req, res, next) {
  try {
    const { id } = req.params;

    const sessao = await buscarPorId(id);

    return res.json(sessao);
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
    const { id } = req.params;

    const sessao = await atualizar(id, req.body);

    return res.json(sessao);
  } catch (error) {
    next(error);
  }
}

export async function removerSessao(req, res, next) {
  try {
    const { id } = req.params;

    await remover(id);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}