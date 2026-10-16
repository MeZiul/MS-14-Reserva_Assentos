import { locaisRepository } from "../repositories/locais.repository.js";

function erro(mensagem, status = 400) {
    const error = new Error(mensagem);
    error.status = status;
    return error;
}

export async function criarLocal(dados, promotorId) {
    if (!promotorId) {
        throw erro("Promotor não identificado.", 401);
    }

    return locaisRepository.criar({
        nome: dados.nome,
        endereco: dados.endereco ?? null,
        donoId: promotorId
    });
}
