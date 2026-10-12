import { criarMapa, buscarMapaDoLocal } from "../services/index.js";

export async function criarMapaController(req, res, next) {
    try {
        const mapa = await criarMapa(req.params.id, req.body);

        return res.status(201).json(mapa);
    } catch (error) {
        next(error);
    }
}

export async function buscarMapaController(req, res, next) {
    try {
        const mapa = await buscarMapaDoLocal(req.params.id, req.params.mapaId);

        return res.status(200).json(mapa);
    } catch (error) {
        next(error);
    }
}