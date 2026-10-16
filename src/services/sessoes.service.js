import { mapasRepository, sessoesRepository } from "../repositories/index.js";

function erro(mensagem, status = 400) {
    const error = new Error(mensagem);
    error.status = status;
    return error;
}

export async function listar(filtros) {
    return sessoesRepository.listarComFiltros(filtros);
}

export async function buscarPorId(id) {
    const sessao = await sessoesRepository.buscarPorIdComMapa(id);

    if (!sessao) {
        throw erro("Sessão não encontrada.", 404);
    }

    return sessao;
}

export async function criar(dados) {
    if (dados.inicioEm <= new Date()) {
        throw erro("A sessão deve possuir uma data de início futura.");
    }

    const mapa = await mapasRepository.buscarPorIdComSetores(dados.mapaId);

    if (!mapa) {
        throw erro("Mapa informado não existe.", 404);
    }

    const setoresMapa = new Set(mapa.setores.map((setor) => setor.id));

    const setoresComPreco = new Set(dados.faixas.map((faixa) => faixa.setorId));

    for (const setorId of setoresComPreco) {
        if (!setoresMapa.has(setorId)) {
            throw erro(`O setor ${setorId} não pertence ao mapa informado.`);
        }
    }

    for (const setorId of setoresMapa) {
        if (!setoresComPreco.has(setorId)) {
            throw erro(`O setor ${setorId} não possui faixa de preço para esta sessão.`);
        }
    }

    return sessoesRepository.criarComLocal({
        mapaId: dados.mapaId,
        inicioEm: dados.inicioEm,
        situacao: dados.situacao ?? "AGENDADA",
        prazoBloqueioSegundos: dados.prazoBloqueioSegundos ?? 600,
        maxProrrogacoes: dados.maxProrrogacoes ?? 2,
        faixas: dados.faixas
    });
}

export async function atualizar(id, dados) {
    const sessao = await sessoesRepository.buscarPorIdComLocal(id);

    if (!sessao) {
        throw erro("Sessão não encontrada.", 404);
    }

    if (sessao.situacao === "CANCELADA" || sessao.situacao === "REALIZADA") {
        throw erro("Sessões canceladas ou realizadas não podem ser alteradas.");
    }

    if (dados.inicioEm && dados.inicioEm <= new Date()) {
        throw erro("A sessão deve possuir uma data de início futura.");
    }

    if (dados.mapaId) {
        const mapaExiste = await mapasRepository.existe(dados.mapaId);

        if (!mapaExiste) {
            throw erro("Mapa informado não existe.", 404);
        }
    }

    return sessoesRepository.atualizarComLocal(id, dados);
}

export async function remover(id) {
    const sessao = await sessoesRepository.buscarPorIdComLocal(id);

    if (!sessao) {
        throw erro("Sessão não encontrada.", 404);
    }

    if (sessao.situacao !== "AGENDADA") {
        throw erro("Somente sessões agendadas podem ser excluídas.");
    }

    return sessoesRepository.deletar(id);
}