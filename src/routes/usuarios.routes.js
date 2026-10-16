import { Router } from "express";

import { listarUsuarios, buscarUsuario, criarUsuario, atualizarUsuario, removerUsuario } from "../controllers/usuarios.controller.js";
import { validar } from "../middlewares/validate.middleware.js";
import { usuarioIdParamsSchema, listarUsuariosQuerySchema, criarUsuarioSchema, atualizarUsuarioSchema } from "../schemas/usuarios.schema.js";

const usuariosRoutes = Router();

usuariosRoutes.get("/", validar({ query: listarUsuariosQuerySchema }), listarUsuarios);
usuariosRoutes.post("/", validar({ body: criarUsuarioSchema }), criarUsuario);
usuariosRoutes.get("/:id", validar({ params: usuarioIdParamsSchema }), buscarUsuario);
usuariosRoutes.put("/:id", validar({ params: usuarioIdParamsSchema, body: atualizarUsuarioSchema }), atualizarUsuario);
usuariosRoutes.delete("/:id", validar({ params: usuarioIdParamsSchema }), removerUsuario);

export { usuariosRoutes };
