import { autenticar, autorizar, autenticarCompradorLeitura, autenticarCompradorEscrita } from "./auth.middleware.js";
import { PAPEIS_USUARIO } from "../constants/roles.js";

// Identifica o comprador autenticado
// O middleware anterior já deve ter validado a identidade e o papel COMPRADOR
export function identificarComprador(req, res, next) {
  req.compradorId = req.usuario.id;
  return next();
}

// antida para compatibilidade com as rotas que ainda utilizam exclusivamente BetterAuth.
export const compradorAutenticado = [autenticar, autorizar(PAPEIS_USUARIO.COMPRADOR), identificarComprador];

/** Aceita:
 * - Sessão BetterAuth de comprador;
 * - API Key de comprador com LEITURA;
 * - API Key de comprador com LEITURA_ESCRITA.
 */
export const compradorAutenticadoLeitura = [...autenticarCompradorLeitura, identificarComprador];

/** Aceita:
 * - Sessão BetterAuth de comprador;
 * - API Key de comprador com LEITURA_ESCRITA.
 */
export const compradorAutenticadoEscrita = [...autenticarCompradorEscrita, identificarComprador];
