import { criarMapa, buscarMapaDoLocal } from "../services/mapas.service.js";

export async function criarMapaController(req, res, next) {
    try {
        const { id } = req.validated.params;
        const dados = req.validated.body;

        // Identifica o promotor autenticado pelo BetterAuth
        const promotorId = req.usuario.id;

        // O service verificará se o local pertence ao promotor
        const mapa = await criarMapa(id, dados, promotorId);

        return res.status(201).json(mapa);
    } catch (error) {
        next(error);
    }
}

export async function buscarMapaController(req, res, next) {
    try {
        const { id, mapaId } = req.validated.params;

        const mapa = await buscarMapaDoLocal(id, mapaId);

        return res.status(200).json(mapa);
    } catch (error) {
        next(error);
    }
}