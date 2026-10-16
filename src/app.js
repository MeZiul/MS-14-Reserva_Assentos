import express from "express";

import { sessoesRoutes, locaisRoutes, mapasRoutes, usuariosRoutes } from "./routes/index.js";
import { reservasRoutes, confirmacoesRoutes } from "./routes/reservas.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

app.use(express.json());

// Cadastros e sessões
app.use("/v1/sessoes", sessoesRoutes);
app.use("/v1/locais", locaisRoutes);
app.use("/v1/locais", mapasRoutes);
app.use("/v1/usuarios", usuariosRoutes);

// Reservas
app.use("/v1/bloqueios", confirmacoesRoutes);
app.use("/v1/reservas", reservasRoutes);

// Tratamento centralizado de erros
app.use(errorMiddleware);

export { app };