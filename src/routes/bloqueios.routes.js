import { Router } from "express";
import { consultarAssentosController, criarBloqueioController } from "../controllers/bloqueios.controller.js";
import { autenticarComprador } from "../middlewares/auth.middleware.js";

const bloqueiosRoutes = Router({ mergeParams: true });

bloqueiosRoutes.get("/assentos", consultarAssentosController);

bloqueiosRoutes.post("/bloqueios", autenticarComprador, criarBloqueioController);

export { bloqueiosRoutes };
