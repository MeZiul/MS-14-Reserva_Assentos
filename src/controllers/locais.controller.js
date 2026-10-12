import { criarLocal } from "../services/index.js";

export async function criarLocalController(req, res, next) {
    try {
        const local = await criarLocal(req.body);

        return res.status(201).json(local);
    } catch (error) {
        next(error);
    }
}