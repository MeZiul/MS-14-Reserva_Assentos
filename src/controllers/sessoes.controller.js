import { listar } from "../services/index.js";

export async function listarSessoes(req, res, next) {
  try {
    const sessoes = await listar();

    return res.json(sessoes);
  } catch (error) {
    next(error);
  }
}