import { mapasRepository, sessoesRepository } from "../repositories/index.js";
import { SITUACAO_SESSAO } from "../constants/session-status.js";

function erro(mensagem, status = 400) {
    const error = new Error(mensagem);
    error.status = status;
    return error;
}

// GET /v1/sessoes
// Consulta pública de sessões
export async function listar(filtros) {
    return sessoesRepository.listarComFiltros(filtros);
}

// GET /v1/sessoes/:id
// Consulta pública de uma sessão
export async function buscarPorId(id) {
    const sessao = await sessoesRepository.buscarPorIdComMapa(id);

    if (!sessao) {
        throw erro("Sessão não encontrada.", 404);
    }

    return sessao;
}

// POST /v1/sessoes
// Cria uma sessão somente em mapa pertencente ao promotor
export async function criar(dados, promotorId) {
    if (!promotorId) {
        throw erro("Promotor não autenticado.", 401);
    }

    const mapaPermitido = await mapasRepository.buscarMapaDoPromotor(dados.mapaId, promotorId);

    if (!mapaPermitido) {
        throw erro("Mapa informado não existe.", 404);
    }

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
        situacao: dados.situacao ?? SITUACAO_SESSAO.AGENDADA,
        prazoBloqueioSegundos:
            dados.prazoBloqueioSegundos ?? 600,
        maxProrrogacoes:
            dados.maxProrrogacoes ?? 2,
        faixas: dados.faixas
    });
}

// PUT /v1/sessoes/:id
// Atualiza somente sessões pertencentes ao promotor
export async function atualizar(id, dados, promotorId) {
    if (!promotorId) {
        throw erro("Promotor não autenticado.", 401);
    }

    const sessaoPermitida =
        await sessoesRepository.buscarSessaoDoPromotor(id, promotorId);

    if (!sessaoPermitida) {
        throw erro("Sessão não encontrada.", 404);
    }

    const sessao = await sessoesRepository.buscarPorIdComLocal(id);

    if (!sessao) {
        throw erro("Sessão não encontrada.", 404);
    }

    if (sessao.situacao === SITUACAO_SESSAO.CANCELADA || sessao.situacao === SITUACAO_SESSAO.REALIZADA) {
        throw erro("Sessões canceladas ou realizadas não podem ser alteradas.");
    }

    if (dados.inicioEm && dados.inicioEm <= new Date()) {
        throw erro("A sessão deve possuir uma data de início futura.");
    }

    // Se o mapa for alterado, o novo mapa também
    // deverá pertencer ao mesmo promotor.
    if (dados.mapaId) {
        const mapaPermitido = await mapasRepository.buscarMapaDoPromotor(dados.mapaId, promotorId);

        if (!mapaPermitido) {
            throw erro("Mapa informado não existe.", 404);
        }
    }

    return sessoesRepository.atualizarComLocal(id, dados);
}

// DELETE /v1/sessoes/:id
// Remove somente sessões pertencentes ao promotor
export async function remover(id, promotorId) {
    if (!promotorId) {
        throw erro("Promotor não autenticado.", 401);
    }

    const sessaoPermitida = await sessoesRepository.buscarSessaoDoPromotor(id, promotorId);

    if (!sessaoPermitida) {
        throw erro("Sessão não encontrada.", 404);
    }

    const sessao = await sessoesRepository.buscarPorIdComLocal(id);

    if (!sessao) {
        throw erro("Sessão não encontrada.", 404);
    }

    if (sessao.situacao !== SITUACAO_SESSAO.AGENDADA) {
        throw erro("Somente sessões agendadas podem ser excluídas.");
    }

    return sessoesRepository.deletar(id);
}