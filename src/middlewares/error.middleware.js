export function errorMiddleware(error, req, res, next) {
    if (res.headersSent) return next(error);

    if (error instanceof SyntaxError && "body" in error) {
        return res.status(400).json({ erro: "O corpo da requisição contém JSON inválido.", });
    }

    if (error.name === "ZodError") {
        return res.status(422).json({
            erro: "Dados inválidos.",
            detalhes: error.issues.map((item) => ({ campo: item.path.join("."), mensagem: item.message })),
        });
    }

    if (error.code === "P2002") {
        return res.status(409).json({ erro: "Já existe um registro com esses dados únicos." });
    }

    if (error.code === "P2003") {
        return res.status(400).json({ erro: "Uma das referências informadas não existe ou é inválida." });
    }

    if (error.code === "P2025") {
        return res.status(404).json({ erro: "Registro não encontrado." });
    }

    const status = error.status || 500;

    if (status >= 500) {
        console.error(error);

        return res.status(500).json({ erro: "Erro interno do servidor." });
    }

    return res.status(status).json({ erro: error.message });
}