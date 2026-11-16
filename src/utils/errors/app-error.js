export class AppError extends Error {
    constructor(mensagem, status = 400, codigo = "ERRO_NEGOCIO", extras = {}) {
        super(mensagem);

        this.name = "AppError";
        this.status = status;
        this.codigo = codigo;
        this.extras = extras;
    }
}