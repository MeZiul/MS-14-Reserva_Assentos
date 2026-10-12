import { locaisRepository } from "../repositories/index.js";
import { criarLocalSchema } from "../schemas/locais.schema.js";

export async function criarLocal(dados) {
    const dadosValidados = criarLocalSchema.parse(dados);

    const donoExiste = await locaisRepository.prisma.usuario.count({
        where: { id: dadosValidados.donoId }
    });

    if (!donoExiste) {
        const error = new Error("Usuário responsável não encontrado.");
        error.status = 404;
        throw error;
    }

    return locaisRepository.criar({
        nome: dadosValidados.nome,
        endereco: dadosValidados.endereco ?? null,
        donoId: dadosValidados.donoId
    });
}