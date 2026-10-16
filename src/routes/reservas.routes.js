import { Router } from "express";

import { confirmarReservaController, consultarReservaController, cancelarReservaController } from "../controllers/reservas.controller.js";
import { reservaIdParamsSchema, confirmarReservaSchema, idempotenciaHeadersSchema } from "../schemas/reservas.schema.js";
import { validar } from "../middlewares/validate.middleware.js";
import { compradorAutenticado } from "../middlewares/comprador-autenticado.middleware.js";

const reservasRoutes = Router();
const confirmacoesRoutes = Router();

confirmacoesRoutes.post("/:id/confirmar",
    compradorAutenticado,
    validar({
        params: reservaIdParamsSchema,
        body: confirmarReservaSchema,
        headers: idempotenciaHeadersSchema
    }),
    confirmarReservaController
);

reservasRoutes.get("/:id",
    compradorAutenticado,
    validar({ params: reservaIdParamsSchema }),
    consultarReservaController
);

reservasRoutes.delete("/:id",
    compradorAutenticado,
    validar({ params: reservaIdParamsSchema }),
    cancelarReservaController
);

export { reservasRoutes, confirmacoesRoutes };
