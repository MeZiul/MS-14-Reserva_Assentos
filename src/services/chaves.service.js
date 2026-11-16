
import { prisma } from "../lib/prisma.js";
import { gerarChaveApi } from "../utils/hash-api-key.js";
import { AppError } from "../utils/errors/app-error.js";

// Campos devolvidos ao usuário, hash não aparece
const camposPublicos = {
    id: true,
    nome: true,
    prefixo: true,
    escopo: true,
    ativa: true,
    criadoEm: true,
    ultimoUsoEm: true,
    revogadaEm: true
};

// Cria uma nova chave de API para o usuário autenticado
export async function criarChaveApi(usuarioId, dados) {
    const { chave, hash, prefixo } = gerarChaveApi();

    const registro = await prisma.chaveApi.create({
        data: {
            donoId: usuarioId,
            nome: dados.nome,
            escopo: dados.escopo ?? "LEITURA",
            hash,
            prefixo
        },
        select: camposPublicos
    });

    // O segredo completo aparece somente nesta resposta.
    return {
        ...registro,
        chave
    };
}

// Lista somente as chaves pertencentes ao usuário
export async function listarChavesApi(usuarioId) {
    return prisma.chaveApi.findMany({
        where: {
            donoId: usuarioId,
        },
        select: camposPublicos,
        orderBy: {
            criadoEm: "desc"
        }
    });
}

// Revoga uma chave pertencente ao usuário autenticado
export async function revogarChaveApi(chaveId, usuarioId) {
    const resultado = await prisma.chaveApi.updateMany({
        where: {
            id: chaveId,
            donoId: usuarioId,
            ativa: true
        },
        data: {
            ativa: false,
            revogadaEm: new Date(),
            revogadaPorId: usuarioId
        }
    });

    if (resultado.count === 0) {
        throw new AppError("Chave não encontrada ou já revogada", 404, "CHAVE_NAO_ENCONTRADA");
    }

    return null;
}
