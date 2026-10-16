import { Router } from "express";

import { consultarBloqueioController, prorrogarBloqueioController, liberarBloqueioController } from "../controllers/bloqueios.controller.js";
import { validar } from "../middlewares/validate.middleware.js";
import { bloqueioIdParamsSchema } from "../schemas/bloqueios.schema.js";
import { compradorAutenticado } from "../middlewares/comprador-autenticado.middleware.js";

const bloqueiosIndividuaisRoutes = Router();

bloqueiosIndividuaisRoutes.use(compradorAutenticado);
bloqueiosIndividuaisRoutes.get("/:id",
    validar({ params: bloqueioIdParamsSchema }),
    consultarBloqueioController
);
bloqueiosIndividuaisRoutes.post("/:id/prorrogar",
    validar({ params: bloqueioIdParamsSchema }),
    prorrogarBloqueioController
);
bloqueiosIndividuaisRoutes.delete("/:id",
    validar({ params: bloqueioIdParamsSchema }),
    liberarBloqueioController
);

export { bloqueiosIndividuaisRoutes };
