import { consultarDisponibilidade, criarBloqueio } from "../services/bloqueios.service.js";

import { validarSessaoId, validarCriacaoBloqueio } from "../schemas/bloqueios.schema.js";

export async function consultarAssentosController(req, res, next) {
  try {
    const { id } = validarSessaoId(req.params);

    const resultado = await consultarDisponibilidade(id);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

export async function criarBloqueioController(req, res, next) {
  try {
    const { id } = validarSessaoId(req.params);
    const dados = validarCriacaoBloqueio(req.body);

    const resultado = await criarBloqueio(id, req.usuario.id, dados);

    return res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}
