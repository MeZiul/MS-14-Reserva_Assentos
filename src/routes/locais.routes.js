import { Router } from "express";

import { criarLocalController } from "../controllers/locais.controller.js";
import { validar } from "../middlewares/validate.middleware.js";
import { criarLocalSchema } from "../schemas/locais.schema.js";

const locaisRoutes = Router();

locaisRoutes.post("/", validar({ body: criarLocalSchema }), criarLocalController);

export { locaisRoutes };