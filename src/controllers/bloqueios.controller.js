import { consultarDisponibilidade, criarBloqueio, consultarBloqueio, prorrogarBloqueio, liberarBloqueio } from "../services/bloqueios.service.js";

export async function consultarAssentosController(req, res, next) {
  try {
    const { id } = req.validated.params;

    const resultado = await consultarDisponibilidade(id);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function criarBloqueioController(req, res, next) {
  try {
    const { id } = req.validated.params;

    const compradorId = req.compradorId;

    const resultado = await criarBloqueio(id, compradorId, req.validated.body);

    return res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function consultarBloqueioController(req, res, next) {
  try {
    const resultado = await consultarBloqueio(req.validated.params.id, req.compradorId);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function prorrogarBloqueioController(req, res, next) {
  try {
    const resultado = await prorrogarBloqueio(req.validated.params.id, req.compradorId);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function liberarBloqueioController(req, res, next) {
  try {
    await liberarBloqueio(req.validated.params.id, req.compradorId);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
