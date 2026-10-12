import express from "express";

import { sessoesRoutes, locaisRoutes, mapasRoutes, usuariosRoutes } from "./routes/index.js";

import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

app.use(express.json());

app.use("/v1/sessoes", sessoesRoutes);
app.use("/v1/locais", locaisRoutes);
app.use("/v1/locais", mapasRoutes);
app.use("/v1/usuarios", usuariosRoutes);

app.use(errorMiddleware);

export { app };