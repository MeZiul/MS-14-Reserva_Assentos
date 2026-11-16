import { criarChaveApi, listarChavesApi, revogarChaveApi } from "../services/chaves.service.js";

//Cria uma chave de API para o usuário autenticado, o segredo é retornado somente nesta operação
export async function criarChaveController(req, res) {
    const usuarioId = req.usuario.id;
    const chave = await criarChaveApi(usuarioId, req.body);

    return res.status(201).json(chave);
}

// Lista as chaves pertencentes ao usuário autenticado, não retorna os hashes nem os segredos
export async function listarChavesController(req, res) {
    const usuarioId = req.usuario.id;
    const chaves = await listarChavesApi(usuarioId);

    return res.status(200).json(chaves);
}

// Revoga uma chave pertencente ao usuário autenticado
export async function revogarChaveController(req, res) {
    const usuarioId = req.usuario.id;
    const chaveId = req.params.id;

    await revogarChaveApi(chaveId, usuarioId);

    return res.status(204).send();
}