import { criarLocal } from "../services/locais.service.js";

export async function criarLocalController(req, res, next) {
    try {
        const local = await criarLocal(req.validated.body, req.usuario.id);

        return res.status(201).json(local);
    } catch (error) {
        next(error);
    }
}