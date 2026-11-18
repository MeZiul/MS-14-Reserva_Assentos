import { consultarDisponibilidade, criarBloqueio, consultarBloqueio, prorrogarBloqueio, liberarBloqueio } from "../services/bloqueios.service.js";

// Consulta a disponibilidade dos assentos
export async function consultarAssentosController(req, res, next) {
  try {
    const { id } = req.validated.params;

    const resultado = await consultarDisponibilidade(id);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// Cria um bloqueio com chave de idempotência
export async function criarBloqueioController(req, res, next) {
  try {
    const { id } = req.validated.params;

    // Obtido da autenticação BetterAuth ou API Key
    const compradorId = req.compradorId;

    // Obtido da validação Zod
    const chaveCriacao = req.validated.headers["idempotency-key"];
    const resultado = await criarBloqueio(id, compradorId, req.validated.body, chaveCriacao);

    return res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

// Consulta um bloqueio pertencente ao comprador
export async function consultarBloqueioController(req, res, next) {
  try {
    const resultado = await consultarBloqueio(req.validated.params.id, req.compradorId);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

//Prorroga um bloqueio ativo
export async function prorrogarBloqueioController(req, res, next) {
  try {
    const resultado = await prorrogarBloqueio(req.validated.params.id, req.compradorId);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// Libera antecipadamente um bloqueio
export async function liberarBloqueioController(req, res, next) {
  try {
    await liberarBloqueio(req.validated.params.id, req.compradorId);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}