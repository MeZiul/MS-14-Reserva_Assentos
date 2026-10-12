import { Router } from "express";

import { criarLocalController } from "../controllers/index.js";

const locaisRoutes = Router();

locaisRoutes.post("/", criarLocalController);

export { locaisRoutes };