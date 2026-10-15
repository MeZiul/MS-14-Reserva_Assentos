import { prisma } from '../lib/prisma.js';

// Ponte provisoria: valida o token de uma sessao persistida no banco.
// Nao aceita compradorId do body, query ou headers arbitrarios.
// A criacao de sessoes autenticadas sera entregue com BetterAuth.
export async function compradorAutenticado(req, res, next) {
  try {
    const valor = req.headers.authorization ?? '';
    const match = /^Bearer ([A-Za-z0-9._~-]{20,512})$/.exec(valor);
    if (!match) return res.status(401).json({ erro: 'NAO_AUTENTICADO' });
    const sessao = await prisma.sessao_Autenticacao.findUnique({
      where: { token: match[1] },
      include: { usuario: { select: { id: true, papel: true } } },
    });
    if (!sessao || sessao.expiraEm <= new Date())
      return res.status(401).json({ erro: 'NAO_AUTENTICADO' });
    if (sessao.usuario.papel !== 'COMPRADOR')
      return res.status(403).json({ erro: 'ACESSO_NEGADO' });
    req.compradorId = sessao.usuario.id;
    return next();
  } catch (error) { return next(error); }
}
