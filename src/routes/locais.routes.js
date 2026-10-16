import { Router } from "express";

import { criarLocalController } from "../controllers/locais.controller.js";
import { validar } from "../middlewares/validate.middleware.js";
import { criarLocalSchema } from "../schemas/locais.schema.js";
import { autenticarPromotor } from "../middlewares/auth.middleware.js";

const locaisRoutes = Router();

locaisRoutes.post("/", autenticarPromotor, validar({ body: criarLocalSchema }), criarLocalController);

export { locaisRoutes };