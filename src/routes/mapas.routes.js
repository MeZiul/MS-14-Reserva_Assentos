import { Router } from "express";

import { criarMapaController, buscarMapaController } from "../controllers/index.js";

const mapasRoutes = Router();

mapasRoutes.post("/:id/mapas", criarMapaController);

mapasRoutes.get("/:id/mapas/:mapaId", buscarMapaController);

export { mapasRoutes };