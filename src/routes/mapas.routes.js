import { Router } from "express";

import { criarMapaController, buscarMapaController } from "../controllers/mapas.controller.js";
import { validar } from "../middlewares/validate.middleware.js";
import { criarMapaSchema, mapaLocalParamsSchema, mapaDetalheParamsSchema } from "../schemas/mapas.schema.js";

const mapasRoutes = Router();

mapasRoutes.post("/:id/mapas", validar({ params: mapaLocalParamsSchema, body: criarMapaSchema }), criarMapaController);
mapasRoutes.get("/:id/mapas/:mapaId", validar({ params: mapaDetalheParamsSchema }), buscarMapaController);

export { mapasRoutes };