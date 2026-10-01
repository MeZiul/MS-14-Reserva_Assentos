import express from "express";

import { sessoesRoutes } from "./routes/index.js";

import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

app.use(express.json());

app.use("/v1/sessoes", sessoesRoutes);

app.use(errorMiddleware);

export { app };