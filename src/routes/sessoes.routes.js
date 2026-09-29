import { Router } from "express";
import { listarSessoes } from "../controllers/index.js";

const sessoesRoutes = Router();

sessoesRoutes.get("/", listarSessoes);

export { sessoesRoutes };