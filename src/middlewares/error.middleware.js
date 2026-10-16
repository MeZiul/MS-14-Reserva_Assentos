import { CODIGOS_ERRO } from "../utils/errors/error-codes.js";

export function errorMiddleware(error, req, res, next) {
    if (res.headersSent) return next(error);

    if (error instanceof SyntaxError && "body" in error) {
        return res.status(400).json({
            erro: CODIGOS_ERRO.JSON_INVALIDO,
            mensagem: "O corpo da requisição contém JSON inválido."
        });
    }

    if (error.name === "ZodError") {
        return res.status(422).json({
            erro: CODIGOS_ERRO.DADOS_INVALIDOS,
            detalhes: error.issues.map((item) => ({
                campo: item.path.join("."),
                mensagem: item.message
            }))
        });
    }

    if (error.codigo) {
        return res.status(error.status || 400).json({
            erro: error.codigo,
            mensagem: error.message,
            ...(error.extras || {})
        });
    }

    if (error.code === "P2002") {
        return res.status(409).json({
            erro: CODIGOS_ERRO.REGISTRO_DUPLICADO,
            mensagem: "Já existe um registro com esses dados únicos."
        });
    }

    if (error.code === "P2003") {
        return res.status(422).json({
            erro: CODIGOS_ERRO.REFERENCIA_INVALIDA,
            mensagem: "Uma das referências informadas não existe."
        });
    }

    if (error.code === "P2025") {
        return res.status(404).json({
            erro: CODIGOS_ERRO.REGISTRO_NAO_ENCONTRADO
        });
    }

    const status = error.status || 500;

    if (status >= 500) {
        console.error(error);

        return res.status(500).json({
            erro: CODIGOS_ERRO.ERRO_INTERNO,
            mensagem: "Erro interno do servidor."
        });
    }

    return res.status(status).json({
        erro: error.message
    });
}