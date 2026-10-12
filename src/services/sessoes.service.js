import { z } from "zod";

import { mapasRepository, sessoesRepository } from "../repositories/index.js";

import { criarSessaoSchema, atualizarSessaoSchema, listarSessoesQuerySchema } from "../schemas/sessoes.schema.js";

function erro(mensagem, status = 400) {
    const error = new Error(mensagem);
    error.status = status;
    return error;
}

export async function listar(query = {}) {
    const filtros = listarSessoesQuerySchema.parse(query);

    return sessoesRepository.listarComFiltros(filtros);
}

export async function buscarPorId(id) {
    z.uuid().parse(id);

    const sessao = await sessoesRepository.buscarPorIdComMapa(id);

    if (!sessao) throw erro("Sessão não encontrada.", 404);

    return sessao;
}

export async function criar(dados) {
    const dadosValidados = criarSessaoSchema.parse(dados);

    if (dadosValidados.inicioEm <= new Date()) throw erro("A sessão deve possuir uma data de início futura.");

    const mapa = await mapasRepository.buscarPorIdComSetores(dadosValidados.mapaId);

    if (!mapa) throw erro("Mapa informado não existe.", 404);

    const setoresMapa = new Set(mapa.setores.map((setor) => setor.id));

    const setoresComPreco = new Set(dadosValidados.faixas.map((faixa) => faixa.setorId));

    // Todas as faixas precisam referenciar setores do mapa escolhido.
    for (const setorId of setoresComPreco) {
        if (!setoresMapa.has(setorId)) throw erro(`O setor ${setorId} não pertence ao mapa informado.`);
    }

    // Cada setor do mapa deve possuir uma faixa de preço.
    for (const setorId of setoresMapa) {
        if (!setoresComPreco.has(setorId)) throw erro(`O setor ${setorId} não possui faixa de preço para esta sessão.`);
    }

    return sessoesRepository.criarComLocal({
        mapaId: dadosValidados.mapaId,
        inicioEm: dadosValidados.inicioEm,
        situacao: dadosValidados.situacao ?? "AGENDADA",
        prazoBloqueioSegundos: dadosValidados.prazoBloqueioSegundos ?? 600,
        maxProrrogacoes: dadosValidados.maxProrrogacoes ?? 2,
        faixas: dadosValidados.faixas,
    });
}

export async function atualizar(id, dados) {
    z.uuid().parse(id);

    const dadosValidados = atualizarSessaoSchema.parse(dados);

    const sessao = await sessoesRepository.buscarPorIdComLocal(id);

    if (!sessao) throw erro("Sessão não encontrada.", 404);

    if (sessao.situacao === "CANCELADA" || sessao.situacao === "REALIZADA") {
        throw erro("Sessões canceladas ou realizadas não podem ser alteradas.");
    }

    if (dadosValidados.inicioEm && dadosValidados.inicioEm <= new Date()) {
        throw erro("A sessão deve possuir uma data de início futura.");
    }

    if (dadosValidados.mapaId) {
        const mapaExiste = await mapasRepository.existe(dadosValidados.mapaId);

        if (!mapaExiste) throw erro("Mapa informado não existe.", 404);
    }

    return sessoesRepository.atualizarComLocal(id, dadosValidados);
}

export async function remover(id) {
    z.uuid().parse(id);

    const sessao = await sessoesRepository.buscarPorIdComLocal(id);

    if (!sessao) throw erro("Sessão não encontrada.", 404);

    if (sessao.situacao !== "AGENDADA") throw erro("Somente sessões agendadas podem ser excluídas.");

    return sessoesRepository.deletar(id);
}