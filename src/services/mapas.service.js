import { locaisRepository } from "../repositories/locais.repository.js";
import { mapasRepository } from "../repositories/mapas.repository.js";

function erro(mensagem, status = 400) {
    const error = new Error(mensagem);
    error.status = status;
    return error;
}

export async function criarMapa(localId, dados, promotorId) {
    const local = await locaisRepository.pertenceAoPromotor(localId, promotorId);

    if (!local) {
        throw erro("Local não encontrado.", 404);
    }

    const capacidadeTotal = dados.setores.reduce((total, setor) => total + setor.assentos.length, 0);

    return mapasRepository.criarComEstrutura({
        localId,
        nome: dados.nome,
        capacidadeTotal,
        setores: dados.setores
    });
}

export async function buscarMapaDoLocal(localId, mapaId) {
    const mapa = await mapasRepository.buscarPorIdComSetores(mapaId);

    if (!mapa || mapa.localId !== localId) {
        throw erro("Mapa não encontrado neste local.", 404);
    }

    return mapa;
}