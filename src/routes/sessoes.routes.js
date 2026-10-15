import { Router } from "express";

import { listarSessoes, buscarSessaoPorId, criarSessao, atualizarSessao, removerSessao, bloqueiosRoutes } from "../controllers/index.js";

import { bloqueiosRoutes } from "./bloqueios.routes.js";

const sessoesRoutes = Router();

sessoesRoutes.get("/", listarSessoes);
sessoesRoutes.post("/", criarSessao);

// Rotas de assentos e bloqueios
sessoesRoutes.use("/:id", bloqueiosRoutes);
sessoesRoutes.get("/:id", buscarSessaoPorId);
sessoesRoutes.put("/:id", atualizarSessao);
sessoesRoutes.delete("/:id", removerSessao);

export { sessoesRoutes };
