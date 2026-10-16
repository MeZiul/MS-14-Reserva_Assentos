import { locaisRepository } from "../repositories/locais.repository.js";
import { usuariosRepository } from "../repositories/usuarios.repository.js";

function erro(mensagem, status = 400) {
    const error = new Error(mensagem);
    error.status = status;
    return error;
}

export async function criarLocal(dados) {
    const dono = await usuariosRepository.buscarPapelPorId(dados.donoId);

    if (!dono) {
        throw erro("Usuário responsável não encontrado.", 404);
    }

    if (dono.papel !== "PROMOTOR") {
        throw erro("O responsável pelo local deve ser um promotor.", 422);
    }

    return locaisRepository.criar({
        nome: dados.nome,
        endereco: dados.endereco ?? null,
        donoId: dono.id
    });
}
