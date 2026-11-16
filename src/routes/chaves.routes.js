import { Router } from "express";
import { criarChaveController, listarChavesController, revogarChaveController } from "../controllers/chaves.controller.js";
import { autenticar } from "../middlewares/auth.middleware.js";
import { validar } from "../middlewares/validate.middleware.js";
import { criarChaveSchema, chaveIdParamsSchema } from "../schemas/chaves.schema.js";

const chavesRoutes = Router();

// Todas as rotas exigem uma sessão BetterAuth válida.
chavesRoutes.use(autenticar);

// Criar uma nova chave de API.
chavesRoutes.post("/", validar({ body: criarChaveSchema }), criarChaveController);

// Listar as chaves do usuário autenticado.
chavesRoutes.get("/", listarChavesController);

// Revogar uma chave existente.
chavesRoutes.delete("/:id", validar({ params: chaveIdParamsSchema }), revogarChaveController);

export { chavesRoutes };