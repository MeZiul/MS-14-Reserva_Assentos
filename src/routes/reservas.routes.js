import { Router } from "express";

import { confirmarReservaController, consultarReservaController, cancelarReservaController } from "../controllers/reservas.controller.js";
import { reservaIdParamsSchema, confirmarReservaSchema, idempotenciaHeadersSchema } from "../schemas/reservas.schema.js";
import { validar } from "../middlewares/validate.middleware.js";
import { compradorAutenticadoLeitura, compradorAutenticadoEscrita } from "../middlewares/comprador-autenticado.middleware.js";

const reservasRoutes = Router();
const confirmacoesRoutes = Router();

/** Exige:
 * - Comprador autenticado;
 * - API Key com escopo LEITURA_ESCRITA, quando utilizada;
 * - Validação da chave de idempotência.
 */
confirmacoesRoutes.post("/:id/confirmar",
    compradorAutenticadoEscrita,
    validar({
        params: reservaIdParamsSchema,
        body: confirmarReservaSchema,
        headers: idempotenciaHeadersSchema
    }),
    confirmarReservaController
);

/** Aceita:
 * - Sessão BetterAuth;
 * - API Key LEITURA;
 * - API Key LEITURA_ESCRITA.
 */
reservasRoutes.get("/:id",
    compradorAutenticadoLeitura,
    validar({
        params: reservaIdParamsSchema
    }),
    consultarReservaController
);

// Cancela uma reserva pertencente ao comprador e exige permissão de escrita
reservasRoutes.delete("/:id",
    compradorAutenticadoEscrita,
    validar({
        params: reservaIdParamsSchema
    }),
    cancelarReservaController
);

export { reservasRoutes, confirmacoesRoutes };
