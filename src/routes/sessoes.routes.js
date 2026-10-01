// src/routes/sessoes.routes.js

import { Router } from "express";

import { listarSessoes, buscarSessaoPorId, criarSessao, atualizarSessao, removerSessao } from "../controllers/index.js";

const sessoesRoutes = Router();

sessoesRoutes.get("/",listarSessoes);

sessoesRoutes.post("/",criarSessao);

sessoesRoutes.get( "/:id",buscarSessaoPorId);

sessoesRoutes.put( "/:id",atualizarSessao);

sessoesRoutes.delete( "/:id",removerSessao);

export { sessoesRoutes };