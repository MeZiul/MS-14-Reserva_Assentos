import express from "express";
import { sessoesRoutes } from "./routes/index.js";

const app = express();

app.use(express.json());

app.use("/v1/sessoes", sessoesRoutes);


export { app };