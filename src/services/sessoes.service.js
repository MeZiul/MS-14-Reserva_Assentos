// src/services/sessoes.service.js

import { sessoesRepository } from "../repositories/index.js";

export async function listar() {
    return sessoesRepository.listarComLocal();
}