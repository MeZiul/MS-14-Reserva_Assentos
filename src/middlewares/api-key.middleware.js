import { prisma } from "../lib/prisma.js";
import { hashChaveApi, validarFormatoChaveApi } from "../utils/hash-api-key.js";
import { CODIGOS_ERRO } from "../utils/errors/error-codes.js";

//Extrai a chave enviada no cabeçalho Authorization com formato esperado sendo: Authorization: Bearer ws14_<segredo>
function extrairChave(req) {
    const authorization = req.headers.authorization;

    if (typeof authorization !== "string") return null;

    const match = /^Bearer (ws14_[a-f0-9]{64})$/i.exec(authorization.trim());

    return match ? match[1] : null;
}

// Autentica a requisição utilizando uma chave de API
export async function autenticarChaveApi(req, res, next) {
    try {
        const chave = extrairChave(req);

        // 1. Valida o formato da credencial.
        if (!chave || !validarFormatoChaveApi(chave)) {
            return res.status(401).json({
                erro: CODIGOS_ERRO.NAO_AUTENTICADO,
                mensagem: "Chave de API ausente ou inválida"
            });
        }

        // 2. Calcula o hash da chave recebida.
        const hash = hashChaveApi(chave);

        // 3. Consulta a credencial e seu proprietário.
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

        // 4. Verifica se a credencial existe e está ativa
        if (!registro || !registro.ativa || registro.revogadaEm !== null || !registro.dono) {
            return res.status(401).json({
                erro: CODIGOS_ERRO.NAO_AUTENTICADO,
                mensagem: "Chave de API inválida ou revogada"
            });
        }

        // 5. Atualiza o último uso somente se a chave continuar ativa no momento da atualização
        const resultado = await prisma.chaveApi.updateMany({
            where: {
                id: registro.id,
                ativa: true,
                revogadaEm: null
            },
            data: {
                ultimoUsoEm: new Date()
            }
        });

        // 6. Se a chave foi revogada durante a validação, não autoriza a requisição
        if (resultado.count !== 1) {
            return res.status(401).json({
                erro: CODIGOS_ERRO.NAO_AUTENTICADO,
                mensagem: "Chave de API inválida ou revogada"
            });
        }

        // 7. Somente agora identifica o usuário autenticado.
        req.usuario = registro.dono;

        req.chaveApi = {
            id: registro.id,
            escopo: registro.escopo,
            donoId: registro.donoId
        };

        return next();
    } catch (error) {
        return next(error);
    }
}

// Verifica se a API Key possui o escopo necessário
// LEITURA: permite somente consultas
// LEITURA_ESCRITA: permite consultas e operações de escrita, respeitando também o papel do usuário
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
