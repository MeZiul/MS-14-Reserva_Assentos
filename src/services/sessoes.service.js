// src/services/sessoes.service.js

import { mapasRepository, sessoesRepository } from "../repositories/index.js";

import { criarSessaoSchema, atualizarSessaoSchema } from "../schemas/sessoes.schema.js";

function erro(mensagem, status = 400) {
    const error = new Error(mensagem);

    error.status = status;

    return error;
}

export async function listar() {
    return sessoesRepository.listarComLocal();
}

export async function buscarPorId(id) {
    const sessao = await sessoesRepository.buscarPorIdComMapa(id);

    if (!sessao) {
        throw erro("Sessão não encontrada.", 404);
    }

    return sessao;
}

export async function criar(dados) {
    const dadosValidados = criarSessaoSchema.parse(dados);

    if (dadosValidados.inicioEm <= new Date()) {
        throw erro("A sessão deve possuir uma data de início futura.");
    }

    const mapaExiste = await mapasRepository.existe(dadosValidados.mapaId);

    if (!mapaExiste) {
        throw erro("Mapa informado não existe.", 404);
    }

    const sessao = await sessoesRepository.criarComLocal({
        mapaId: dadosValidados.mapaId,

        inicioEm: dadosValidados.inicioEm,

        situacao: dadosValidados.situacao ?? "AGENDADA",

        prazoBloqueioSegundos: dadosValidados.prazoBloqueioSegundos ?? 600,

        maxProrrogacoes: dadosValidados.maxProrrogacoes ?? 2,
    });

    return sessao;
}

export async function atualizar(id, dados) {
    const dadosValidados =
        atualizarSessaoSchema.parse(dados);

    const sessao =
        await sessoesRepository.buscarPorIdComLocal(id);

    if (!sessao) {
        throw erro(
            "Sessão não encontrada.",
            404
        );
    }

    if (
        sessao.situacao === "CANCELADA" ||
        sessao.situacao === "REALIZADA"
    ) {
        throw erro(
            "Sessões canceladas ou realizadas não podem ser alteradas."
        );
    }

    if (
        dadosValidados.inicioEm &&
        dadosValidados.inicioEm <= new Date()
    ) {
        throw erro(
            "A sessão deve possuir uma data de início futura."
        );
    }

    if (dadosValidados.mapaId) {
        const mapaExiste =
            await sessoesRepository.existe(
                dadosValidados.mapaId
            );

        if (!mapaExiste) {
            throw erro(
                "Mapa informado não existe.",
                404
            );
        }
    }

    return sessoesRepository.atualizarComLocal(
        id,
        dadosValidados
    );
}

export async function remover(id) {
    const sessao =
        await sessoesRepository.buscarPorIdComLocal(id);

    if (!sessao) {
        throw erro(
            "Sessão não encontrada.",
            404
        );
    }

    if (sessao.situacao !== "AGENDADA") {
        throw erro(
            "Somente sessões agendadas podem ser excluídas."
        );
    }

    return sessoesRepository.deletar(id);
}