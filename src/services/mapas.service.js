import { z } from "zod";

import { locaisRepository, mapasRepository } from "../repositories/index.js";

import { criarMapaSchema } from "../schemas/mapas.schema.js";

function erro(mensagem, status = 400) {
    const error = new Error(mensagem);
    error.status = status;
    return error;
}

export async function criarMapa(localId, dados) {
    z.uuid().parse(localId);

    const dadosValidados = criarMapaSchema.parse(dados);

    const localExiste = await locaisRepository.existe(localId);

    if (!localExiste) throw erro("Local não encontrado.", 404);

    const capacidadeTotal = dadosValidados.setores.reduce(
        (total, setor) => total + setor.assentos.length,
        0
    );

    return mapasRepository.criarComEstrutura({
        localId,
        nome: dadosValidados.nome,
        capacidadeTotal,
        setores: dadosValidados.setores
    });
}

export async function buscarMapaDoLocal(localId, mapaId) {
    z.uuid().parse(localId);
    z.uuid().parse(mapaId);

    const mapa = await mapasRepository.buscarPorIdComSetores(mapaId);

    // Não retornar um mapa pertencente a outro local.
    if (!mapa || mapa.localId !== localId) throw erro("Mapa não encontrado neste local.", 404);

    return mapa;
}