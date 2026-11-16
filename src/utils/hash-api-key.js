import { randomBytes, createHash } from "node:crypto";

const PREFIXO_CHAVE = "ws14";
const TAMANHO_SEGREDO = 32;

// Gera uma chave de API aleatória e criptograficamente segura, o segredo possui 32 bytes (256 bits) de aleatoriedade
export function gerarChaveApi() {
    const segredo = randomBytes(TAMANHO_SEGREDO).toString("hex");

    const chave = `${PREFIXO_CHAVE}_${segredo}`;

    return {
        chave,
        prefixo: chave.slice(0, 13),
        hash: hashChaveApi(chave)
    };
}

// Gera um hash SHA-256 da chave completa, somente esse hash será armazenado no PostgreSQL
export function hashChaveApi(chave) {
    return createHash("sha256").update(chave, "utf8").digest("hex");
}

// Verifica o formato da chave antes de consultar o banco, isso não significa que ela seja válida ou esteja ativa.
export function validarFormatoChaveApi(chave) {
    if (typeof chave !== "string") {
        return false;
    }

    return /^ws14_[a-f0-9]{64}$/.test(chave);
}
