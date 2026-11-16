import { fromNodeHeaders } from "better-auth/node";

import { auth } from "../config/auth.js";
import { PAPEIS_USUARIO } from "../constants/roles.js";
import { prisma } from "../lib/prisma.js";
import { CODIGOS_ERRO } from "../utils/errors/error-codes.js";

import { autenticarChaveApi, autorizarEscopoChaveApi } from "./api-key.middleware.js";

// Autenticação por sessão BetterAuth, mantida para login e gerenciamento de chaves
export async function autenticar(req, res, next) {
  try {
    const sessao = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });

    if (!sessao?.user?.id) {
      return res.status(401).json({
        erro: CODIGOS_ERRO.NAO_AUTENTICADO,
        mensagem: "Sessão inválida ou expirada"
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: sessao.user.id
      },
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true
      }
    });

    if (!usuario) {
      return res.status(401).json({
        erro: CODIGOS_ERRO.NAO_AUTENTICADO,
        mensagem: "Usuário não encontrado"
      });
    }

    req.usuario = usuario;
    req.sessao = sessao.session;

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Autenticação híbrida.
 *
 * Se houver Authorization, exige uma API Key válida, caso contrário, utiliza a sessão BetterAuth
 *
 * Não realiza fallback para cookies quando uma credencial Bearer é inválida.
 */
export function autenticarHibrido(req, res, next) {
  if (req.headers.authorization !== undefined) {
    return autenticarChaveApi(req, res, next);
  }

  return autenticar(req, res, next);
}

/**
 * Verifica o papel do usuário autenticado
 *
 * Funciona tanto com BetterAuth quanto com API Key, ambos os métodos preenchem req.usuario.
 */
export function autorizar(...papeis) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        erro: CODIGOS_ERRO.NAO_AUTENTICADO
      });
    }

    if (!papeis.includes(req.usuario.papel)) {
      return res.status(403).json({
        erro: CODIGOS_ERRO.ACESSO_NEGADO,
        mensagem: "Permissão insuficiente"
      });
    }

    return next();
  };
}

/**
 * Valida o escopo somente quando a autenticação tiver sido realizada por chave de API.
 *
 * Sessões BetterAuth continuam sujeitas às verificações de papel.
 */
export function autorizarEscopoHibrido(escopoNecessario) {
  const verificarEscopo =
    autorizarEscopoChaveApi(escopoNecessario);

  return (req, res, next) => {
    if (!req.chaveApi) {
      return next();
    }

    return verificarEscopo(req, res, next);
  };
}

/**
 * Middlewares originais
 *
 * Continuam utilizando exclusivamente BetterAuth
 */
export const autenticarComprador = [
  autenticar,
  autorizar(PAPEIS_USUARIO.COMPRADOR)
];

export const autenticarPromotor = [
  autenticar,
  autorizar(PAPEIS_USUARIO.PROMOTOR)
];

// Autenticação híbrida para operações de leitura
export const autenticarCompradorLeitura = [
  autenticarHibrido,
  autorizar(PAPEIS_USUARIO.COMPRADOR),
  autorizarEscopoHibrido("LEITURA")
];

export const autenticarPromotorLeitura = [
  autenticarHibrido,
  autorizar(PAPEIS_USUARIO.PROMOTOR),
  autorizarEscopoHibrido("LEITURA")
];

//Autenticação híbrida para operações de escrita.
export const autenticarCompradorEscrita = [
  autenticarHibrido,
  autorizar(PAPEIS_USUARIO.COMPRADOR),
  autorizarEscopoHibrido("LEITURA_ESCRITA")
];

export const autenticarPromotorEscrita = [
  autenticarHibrido,
  autorizar(PAPEIS_USUARIO.PROMOTOR),
  autorizarEscopoHibrido("LEITURA_ESCRITA")
];