import { Router } from "express";

import { consultarAssentosController, criarBloqueioController } from "../controllers/bloqueios.controller.js";
import { validar } from "../middlewares/validate.middleware.js";
import { sessaoIdParamsSchema, criarBloqueioSchema } from "../schemas/bloqueios.schema.js";
import { autenticarCompradorEscrita } from "../middlewares/auth.middleware.js";

const bloqueiosRoutes = Router({
    mergeParams: true
});

// Identifica o comprador autenticado, tanto BetterAuth quanto API Key preenchem req.usuario, permitindo reutilizar o controller existente
function identificarComprador(req, res, next) {
    req.compradorId = req.usuario.id;
    return next();
}

//Consulta pública da disponibilidade dos assentos
bloqueiosRoutes.get("/assentos", validar({ params: sessaoIdParamsSchema }), consultarAssentosController);

//Cria um bloqueio de assentos
//Autenticação:
// - Sessão BetterAuth de comprador
// - API Key de comprador com escopo LEITURA_ESCRITA
bloqueiosRoutes.post("/bloqueios", autenticarCompradorEscrita, identificarComprador,
    validar({
        params: sessaoIdParamsSchema,
        body: criarBloqueioSchema
    }),
    criarBloqueioController
);

export { bloqueiosRoutes };
