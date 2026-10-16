import { listar, buscarPorId, criar, atualizar, remover } from "../services/sessoes.service.js";

// GET /v1/sessoes
// Lista sessões disponíveis (consulta pública)
export async function listarSessoes(req, res, next) {
  try {
    const resultado = await listar(req.validated.query);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// GET /v1/sessoes/:id
// Consulta uma sessão específica (consulta pública)
export async function buscarSessaoPorId(req, res, next) {
  try {
    const sessao = await buscarPorId(req.validated.params.id);

    return res.status(200).json(sessao);
  } catch (error) {
    next(error);
  }
}

// POST /v1/sessoes
// Cria uma sessão vinculada a um mapa do promotor
export async function criarSessao(req, res, next) {
  try {
    const promotorId = req.usuario.id;

    const sessao = await criar(req.validated.body, promotorId);

    return res.status(201).json(sessao);
  } catch (error) {
    next(error);
  }
}

// PUT /v1/sessoes/:id
// Atualiza uma sessão pertencente ao promotor
export async function atualizarSessao(req, res, next) {
  try {
    const promotorId = req.usuario.id;

    const sessao = await atualizar(req.validated.params.id, req.validated.body, promotorId);

    return res.status(200).json(sessao);
  } catch (error) {
    next(error);
  }
}

// DELETE /v1/sessoes/:id
// Remove uma sessão pertencente ao promotor
export async function removerSessao(req, res, next) {
  try {
    const promotorId = req.usuario.id;

    await remover(req.validated.params.id, promotorId);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}