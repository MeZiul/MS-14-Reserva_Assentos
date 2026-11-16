import { prisma } from "../lib/prisma.js";
import { hashChaveApi, validarFormatoChaveApi } from "../utils/hash-api-key.js";
import { CODIGOS_ERRO } from "../utils/errors/error-codes.js";

// Extrai a credencial Bearer do cabeçalho Authorization
function extrairChave(req) {
    const authorization = req.headers.authorization;

    if (typeof authorization !== "string") return null;

    const match = /^Bearer (ws14_[a-f0-9]{64})$/i.exec(authorization.trim());

    return match ? match[1] : null;
}

// Autentica um sistema consumidor utilizando sua chave de API.
export async function autenticarChaveApi(req, res, next) {
    try {
        const chave = extrairChave(req);

        if (!chave || !validarFormatoChaveApi(chave)) {
            return res.status(401).json({
                erro: CODIGOS_ERRO.NAO_AUTENTICADO,
                mensagem: "Chave de API ausente ou inválida"
            });
        }

        const hash = hashChaveApi(chave);
        const registro = await prisma.chaveApi.findUnique({
            where: { hash },
            include: {
                dono: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        papel: true
                    }
                }
            }
        });

        if (!registro || !registro.ativa || registro.revogadaEm !== null) {
            return res.status(401).json({
                erro: CODIGOS_ERRO.NAO_AUTENTICADO,
                mensagem: "Chave de API inválida ou revogada"
            });
        }

        // Identifica o usuário proprietário da chave e mantém compatibilidade com os controllers existentes.
        req.usuario = registro.dono;

        req.chaveApi = {
            id: registro.id,
            escopo: registro.escopo,
            donoId: registro.donoId
        };

        // Registra a última utilização da credencial
        await prisma.chaveApi.updateMany({
            where: {
                id: registro.id,
                ativa: true,
                revogadaEm: null
            },
            data: {
                ultimoUsoEm: new Date()
            }
        });

        return next();
    } catch (error) {
        return next(error);
    }
}

// Autoriza operações conforme o escopo da chave.
export function autorizarEscopoChaveApi(escopoNecessario) {
    return (req, res, next) => {
        if (!req.chaveApi) {
            return res.status(401).json({
                erro: CODIGOS_ERRO.NAO_AUTENTICADO,
                mensagem: "Autenticação por chave de API obrigatória"
            });
        }

        const escopoAtual = req.chaveApi.escopo;
        const permitido = escopoAtual === "LEITURA_ESCRITA" ||
            (
                escopoAtual === "LEITURA" &&
                escopoNecessario === "LEITURA"
            );

        if (!permitido) {
            return res.status(403).json({
                erro: CODIGOS_ERRO.ACESSO_NEGADO,
                mensagem: "A chave não possui o escopo necessário"
            });
        }

        return next();
    };
}
