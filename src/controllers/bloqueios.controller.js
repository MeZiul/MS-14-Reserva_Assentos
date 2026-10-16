import { consultarDisponibilidade, criarBloqueio } from "../services/bloqueios.service.js";

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