import { Router } from "express";

import { consultarBloqueioController, prorrogarBloqueioController, liberarBloqueioController } from "../controllers/bloqueios.controller.js";
import { validar } from "../middlewares/validate.middleware.js";
import { bloqueioIdParamsSchema } from "../schemas/bloqueios.schema.js";
import { compradorAutenticadoLeitura, compradorAutenticadoEscrita } from "../middlewares/comprador-autenticado.middleware.js";

const bloqueiosIndividuaisRoutes = Router();

/** Autenticação:
 * - Sessão BetterAuth;
 * - API Key com escopo LEITURA;
 * - API Key com escopo LEITURA_ESCRITA.
 */
bloqueiosIndividuaisRoutes.get(
    "/:id",
    compradorAutenticadoLeitura,
    validar({
        params: bloqueioIdParamsSchema
    }),
    consultarBloqueioController
);

// Prorroga um bloqueio pertencente ao comprador e exige permissão de escrita
bloqueiosIndividuaisRoutes.post(
    "/:id/prorrogar",
    compradorAutenticadoEscrita,
    validar({
        params: bloqueioIdParamsSchema
    }),
    prorrogarBloqueioController
);

// Libera um bloqueio pertencente ao comprador e exige permissão de escrita
bloqueiosIndividuaisRoutes.delete(
    "/:id",
    compradorAutenticadoEscrita,
    validar({
        params: bloqueioIdParamsSchema
    }),
    liberarBloqueioController
);

export { bloqueiosIndividuaisRoutes };
