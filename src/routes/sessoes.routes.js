import { Router } from "express";

import { listarSessoes, buscarSessaoPorId, criarSessao, atualizarSessao, removerSessao } from "../controllers/index.js";
import { bloqueiosRoutes } from "./bloqueios.routes.js";
import { validar } from "../middlewares/validate.middleware.js";
import { criarSessaoSchema, atualizarSessaoSchema, listarSessoesQuerySchema, sessaoIdParamsSchema } from "../schemas/sessoes.schema.js";
import { autenticarPromotorEscrita } from "../middlewares/auth.middleware.js";

const sessoesRoutes = Router();

//Consulta pública de sessões
sessoesRoutes.get("/", validar({ query: listarSessoesQuerySchema }), listarSessoes);

// cria uma sessão e exige PROMOTOR e permissão de escrita
sessoesRoutes.post("/", autenticarPromotorEscrita, validar({ body: criarSessaoSchema }), criarSessao);

//Rotas de bloqueio associadas à sessão, preserva os middlewares próprios dessas rotas
sessoesRoutes.use("/:id", bloqueiosRoutes);

//Consulta pública de uma sessão
sessoesRoutes.get("/:id", validar({ params: sessaoIdParamsSchema }), buscarSessaoPorId);

//Atualiza uma sessão do promotor autenticado
sessoesRoutes.put("/:id", autenticarPromotorEscrita, validar({ params: sessaoIdParamsSchema, body: atualizarSessaoSchema }), atualizarSessao);

//Remove uma sessão do promotor autenticado
sessoesRoutes.delete("/:id", autenticarPromotorEscrita, validar({ params: sessaoIdParamsSchema }), removerSessao);

export { sessoesRoutes };
