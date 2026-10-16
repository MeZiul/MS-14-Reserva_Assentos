import { fromNodeHeaders } from "better-auth/node";

import { auth } from "../config/auth.js";
import { PAPEIS_USUARIO } from "../constants/roles.js";
import { prisma } from "../lib/prisma.js";
import { CODIGOS_ERRO } from "../utils/errors/error-codes.js";

export async function autenticar(req, res, next) {
  try {
    const sessao = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });

    if (!sessao?.user?.id) {
      return res.status(401).json({ erro: CODIGOS_ERRO.NAO_AUTENTICADO, mensagem: "Sessão inválida ou expirada." });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: sessao.user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true
      }
    });

    if (!usuario) {
      return res.status(401).json({ erro: CODIGOS_ERRO.NAO_AUTENTICADO, mensagem: "Usuário não encontrado." });
    }

    req.usuario = usuario;
    req.sessao = sessao.session;

    next();
  } catch (error) {
    next(error);
  }
}

export function autorizar(...papeis) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: CODIGOS_ERRO.NAO_AUTENTICADO });
    }

    if (!papeis.includes(req.usuario.papel)) {
      return res.status(403).json({ erro: CODIGOS_ERRO.ACESSO_NEGADO, mensagem: "Permissão insuficiente." });
    }

    next();
  };
}

export const autenticarComprador = [autenticar, autorizar(PAPEIS_USUARIO.COMPRADOR)];

export const autenticarPromotor = [autenticar, autorizar(PAPEIS_USUARIO.PROMOTOR)];
