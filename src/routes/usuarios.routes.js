
import { Router } from "express";
import { listarUsuarios, buscarUsuario, criarUsuario, atualizarUsuario, removerUsuario } from "../controllers/usuarios.controller.js";

const usuariosRoutes = Router();

usuariosRoutes.get("/", listarUsuarios);
usuariosRoutes.post("/", criarUsuario);
usuariosRoutes.get("/:id", buscarUsuario);
usuariosRoutes.put("/:id", atualizarUsuario);
usuariosRoutes.delete("/:id", removerUsuario);

export { usuariosRoutes };
