import express from "express";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";

import { sessoesRoutes, locaisRoutes, mapasRoutes, usuariosRoutes } from "./routes/index.js";
import { reservasRoutes, confirmacoesRoutes } from "./routes/reservas.routes.js";
import { bloqueiosIndividuaisRoutes } from "./routes/bloqueios-individuais.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();


app.all("/api/auth/*splat", toNodeHandler(auth));

// Parser JSON para os endpoints da aplicação.
app.use(express.json());

// Endpoints de negócio.
app.use("/v1/sessoes", sessoesRoutes);
app.use("/v1/locais", locaisRoutes);
app.use("/v1/locais", mapasRoutes);

// CRUD legado de usuários:
// desativado temporariamente até receber
// autorização administrativa apropriada.
// app.use("/v1/usuarios", usuariosRoutes);

// Bloqueios e reservas.
app.use("/v1/bloqueios", confirmacoesRoutes);
app.use("/v1/bloqueios", bloqueiosIndividuaisRoutes);

app.use("/v1/reservas", reservasRoutes);

// Tratamento de erros.
app.use(errorMiddleware);

export { app };