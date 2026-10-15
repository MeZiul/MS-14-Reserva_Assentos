export function autenticarComprador(req, res, next) {
  const usuario = req.usuario;

  if (!usuario?.id) {
    return res.status(401).json({
      erro: "NAO_AUTENTICADO",
      mensagem: "É necessário estar autenticado."
    });
  }

  if (usuario.papel !== "COMPRADOR") {
    return res.status(403).json({
      erro: "ACESSO_NEGADO",
      mensagem: "Apenas compradores podem bloquear assentos."
    });
  }

  next();
}
