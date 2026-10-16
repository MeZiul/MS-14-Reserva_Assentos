import { Router } from "express";

import { consultarAssentosController, criarBloqueioController } from "../controllers/bloqueios.controller.js";
import { validar } from "../middlewares/validate.middleware.js";
import { sessaoIdParamsSchema, criarBloqueioSchema } from "../schemas/bloqueios.schema.js";
import { compradorAutenticado } from "../middlewares/comprador-autenticado.middleware.js";

const bloqueiosRoutes = Router({
    mergeParams: true
});

// Consulta dos assentos da sessao
bloqueiosRoutes.get("/assentos",
    validar({ params: sessaoIdParamsSchema }),
    consultarAssentosController
);

// Bloqueio de assentos
bloqueiosRoutes.post("/bloqueios",
    compradorAutenticado,
    validar({
        params: sessaoIdParamsSchema,
        body: criarBloqueioSchema
    }),
    criarBloqueioController
);

export { bloqueiosRoutes };
