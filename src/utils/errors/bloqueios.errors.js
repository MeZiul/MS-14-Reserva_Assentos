export function erroNegocio(codigo, mensagem, status = 422, extras = {}) {
    const error = new Error(mensagem);

    error.codigo = codigo;
    error.status = status;
    error.extras = extras;

    return error;
}

export function conflitoAssentos(ids = []) {
    throw erroNegocio("ASSENTOS_INDISPONIVEIS", "Um ou mais assentos não estão disponíveis.", 409, { assentosEmConflito: ids });
}
