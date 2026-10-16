import { Router } from "express";

import { listarSessoes, buscarSessaoPorId, criarSessao, atualizarSessao, removerSessao } from "../controllers/index.js";
import { bloqueiosRoutes } from "./bloqueios.routes.js";
import { validar } from "../middlewares/validate.middleware.js";
import { criarSessaoSchema, atualizarSessaoSchema, listarSessoesQuerySchema, sessaoIdParamsSchema } from "../schemas/sessoes.schema.js";
import { autenticarPromotor } from "../middlewares/auth.middleware.js";

const sessoesRoutes = Router();

sessoesRoutes.get("/", validar({ query: listarSessoesQuerySchema }), listarSessoes);
sessoesRoutes.post("/", autenticarPromotor, validar({ body: criarSessaoSchema }), criarSessao);
sessoesRoutes.use("/:id", bloqueiosRoutes);
sessoesRoutes.get("/:id", validar({ params: sessaoIdParamsSchema }), buscarSessaoPorId);
sessoesRoutes.put("/:id", autenticarPromotor, validar({ params: sessaoIdParamsSchema, body: atualizarSessaoSchema }), atualizarSessao);
sessoesRoutes.delete("/:id", autenticarPromotor, validar({ params: sessaoIdParamsSchema }), removerSessao);

export { sessoesRoutes };
