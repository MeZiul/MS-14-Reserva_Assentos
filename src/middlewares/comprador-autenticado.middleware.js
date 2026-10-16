import { autenticar, autorizar } from "./auth.middleware.js";
import { PAPEIS_USUARIO } from "../constants/roles.js";

function identificarComprador(req, res, next) {
  req.compradorId = req.usuario.id;
  next();
}

export const compradorAutenticado = [autenticar, autorizar(PAPEIS_USUARIO.COMPRADOR), identificarComprador];
