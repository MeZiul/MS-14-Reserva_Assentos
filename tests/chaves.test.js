import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// Simula o Prisma para impedir alterações no banco real.
vi.mock("../src/lib/prisma.js", async (importOriginal) => {
    const original = await importOriginal();

    const usuarioMock = {
        findUnique: vi.fn()
    };

    const chaveApiMock = {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn()
    };

    const prismaMock = new Proxy(original.prisma, {
        get(target, propriedade, receiver) {
            if (propriedade === "usuario") {
                return usuarioMock;
            }

            if (propriedade === "chaveApi") {
                return chaveApiMock;
            }

            return Reflect.get(target, propriedade, receiver);
        }
    });

    return {
        ...original,
        prisma: prismaMock
    };
});

// Simula a autenticação BetterAuth.
vi.mock("../src/config/auth.js", () => ({
    auth: {
        api: {
            getSession: vi.fn()
        },
        handler: vi.fn()
    }
}));

import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { auth } from "../src/config/auth.js";

import { hashChaveApi, validarFormatoChaveApi } from "../src/utils/hash-api-key.js";

// Identificadores fictícios utilizados exclusivamente nos testes.
const COMPRADOR_ID = "11111111-1111-4111-8111-111111111111";
const PROMOTOR_ID = "22222222-2222-4222-8222-222222222222";
const CHAVE_ID = "33333333-3333-4333-8333-333333333333";

// Credencial fictícia, nunca registrada no banco real.
const CHAVE_TESTE = `ws14_${"a".repeat(64)}`;

const comprador = {
    id: COMPRADOR_ID,
    nome: "Comprador Teste",
    email: "comprador@teste.local",
    papel: "COMPRADOR"
};

const promotor = {
    id: PROMOTOR_ID,
    nome: "Promotor Teste",
    email: "promotor@teste.local",
    papel: "PROMOTOR"
};

// Simula uma sessão BetterAuth válida.
function autenticarSessao(usuario = comprador) {
    auth.api.getSession.mockResolvedValue({
        user: {
            id: usuario.id
        },
        session: {
            id: "sessao-teste"
        }
    });

    prisma.usuario.findUnique.mockResolvedValue(usuario);
}

// Simula uma chave de API encontrada no banco.
function autenticarApiKey({
    usuario = comprador,
    escopo = "LEITURA_ESCRITA",
    ativa = true,
    revogadaEm = null
} = {}) {
    prisma.chaveApi.findUnique.mockResolvedValue({
        id: CHAVE_ID,
        donoId: usuario.id,
        hash: hashChaveApi(CHAVE_TESTE),
        prefixo: CHAVE_TESTE.slice(0, 13),
        nome: "Chave de Teste",
        escopo,
        ativa,
        revogadaEm,
        dono: usuario
    });
}

describe("API de Chaves", () => {

    beforeEach(() => {
        vi.resetAllMocks();

        // Por padrão, nenhuma sessão está autenticada.
        auth.api.getSession.mockResolvedValue(null);

        // Por padrão, nenhuma chave existe.
        prisma.chaveApi.findUnique.mockResolvedValue(null);

        // Simula atualização bem-sucedida de uma chave.
        prisma.chaveApi.updateMany.mockResolvedValue({ count: 1 });
    });

    describe("Gerenciamento de chaves", () => {

        it("deve exigir autenticação para criar uma chave", async () => {
            const resposta = await request(app)
                .post("/v1/chaves")
                .send({
                    nome: "Sistema Externo",
                    escopo: "LEITURA"
                });

            expect(resposta.status).toBe(401);
        });

        it("deve impedir gerenciamento utilizando somente API Key", async () => {
            autenticarApiKey();

            const resposta = await request(app)
                .get("/v1/chaves")
                .set("Authorization", `Bearer ${CHAVE_TESTE}`);

            expect(resposta.status).toBe(401);
        });

        it("deve criar uma chave para o usuário autenticado", async () => {
            autenticarSessao();

            prisma.chaveApi.create.mockImplementation(
                async ({ data }) => ({
                    id: CHAVE_ID,
                    nome: data.nome,
                    prefixo: data.prefixo,
                    escopo: data.escopo,
                    ativa: true,
                    criadoEm: new Date(),
                    ultimoUsoEm: null,
                    revogadaEm: null
                })
            );

            const resposta = await request(app)
                .post("/v1/chaves")
                .send({
                    nome: "Sistema Externo",
                    escopo: "LEITURA_ESCRITA"
                });

            expect(resposta.status).toBe(201);

            expect(resposta.body).toHaveProperty("chave");

            expect(validarFormatoChaveApi(resposta.body.chave)).toBe(true);

            expect(resposta.body).not.toHaveProperty("hash");

            expect(prisma.chaveApi.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        donoId: COMPRADOR_ID,
                        nome: "Sistema Externo",
                        escopo: "LEITURA_ESCRITA",
                        hash: hashChaveApi(resposta.body.chave)
                    })
                })
            );
        });

        it("deve rejeitar escopo inválido", async () => {
            autenticarSessao();

            const resposta = await request(app)
                .post("/v1/chaves")
                .send({
                    nome: "Sistema Externo",
                    escopo: "ADMINISTRADOR"
                });

            expect(resposta.status).toBe(422);

            expect(prisma.chaveApi.create).not.toHaveBeenCalled();
        });

        it("deve listar somente as chaves do usuário autenticado", async () => {
            autenticarSessao();

            prisma.chaveApi.findMany.mockResolvedValue([
                {
                    id: CHAVE_ID,
                    nome: "Sistema Externo",
                    prefixo: CHAVE_TESTE.slice(0, 13),
                    escopo: "LEITURA",
                    ativa: true,
                    criadoEm: new Date(),
                    ultimoUsoEm: null,
                    revogadaEm: null
                }
            ]);

            const resposta = await request(app)
                .get("/v1/chaves");

            expect(resposta.status).toBe(200);

            expect(resposta.body).toHaveLength(1);

            expect(resposta.body[0]).not.toHaveProperty("hash");
            expect(resposta.body[0]).not.toHaveProperty("chave");

            expect(prisma.chaveApi.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        donoId: COMPRADOR_ID
                    }
                })
            );
        });

        it("deve revogar uma chave do próprio usuário", async () => {
            autenticarSessao();

            const resposta = await request(app)
                .delete(`/v1/chaves/${CHAVE_ID}`);

            expect(resposta.status).toBe(204);

            expect(prisma.chaveApi.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        id: CHAVE_ID,
                        donoId: COMPRADOR_ID,
                        ativa: true
                    },
                    data: expect.objectContaining({
                        ativa: false,
                        revogadaEm: expect.any(Date),
                        revogadaPorId: COMPRADOR_ID
                    })
                })
            );
        });

        it("deve retornar 404 ao tentar revogar chave inacessível", async () => {
            autenticarSessao();

            prisma.chaveApi.updateMany.mockResolvedValue({ count: 0 });

            const resposta = await request(app)
                .delete(`/v1/chaves/${CHAVE_ID}`);

            expect(resposta.status).toBe(404);

            expect(resposta.body.erro).toBe("CHAVE_NAO_ENCONTRADA");
        });
    });

    describe("Autenticação por API Key", () => {

        it("deve rejeitar chave malformada", async () => {
            const resposta = await request(app)
                .post("/v1/sessoes")
                .set("Authorization", "Bearer chave-invalida")
                .send({});

            expect(resposta.status).toBe(401);

            expect(prisma.chaveApi.findUnique).not.toHaveBeenCalled();
        });

        it("deve rejeitar chave inexistente", async () => {
            const resposta = await request(app)
                .post("/v1/sessoes")
                .set("Authorization", `Bearer ${CHAVE_TESTE}`)
                .send({});

            expect(resposta.status).toBe(401);
        });

        it("deve rejeitar chave revogada", async () => {
            autenticarApiKey({
                ativa: false,
                revogadaEm: new Date()
            });

            const resposta = await request(app)
                .post("/v1/sessoes")
                .set("Authorization", `Bearer ${CHAVE_TESTE}`)
                .send({});

            expect(resposta.status).toBe(401);
        });

        it("deve rejeitar revogação durante a autenticação", async () => {
            autenticarApiKey({ usuario: promotor });

            // A chave estava ativa na consulta inicial, mas foi revogada antes da atualização.
            prisma.chaveApi.updateMany.mockResolvedValue({ count: 0 });

            const resposta = await request(app)
                .post("/v1/sessoes")
                .set("Authorization", `Bearer ${CHAVE_TESTE}`)
                .send({});

            expect(resposta.status).toBe(401);
        });

        it("deve consultar o banco utilizando o hash da chave", async () => {
            autenticarApiKey({ usuario: promotor });

            await request(app)
                .post("/v1/sessoes")
                .set("Authorization", `Bearer ${CHAVE_TESTE}`)
                .send({});

            expect(prisma.chaveApi.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        hash: hashChaveApi(CHAVE_TESTE)
                    }
                })
            );
        });
    });

    describe("Autorização por escopo e papel", () => {

        it("deve impedir escrita com chave LEITURA", async () => {
            autenticarApiKey({
                usuario: promotor,
                escopo: "LEITURA"
            });

            const resposta = await request(app)
                .post("/v1/sessoes")
                .set("Authorization", `Bearer ${CHAVE_TESTE}`)
                .send({});

            expect(resposta.status).toBe(403);

            expect(resposta.body.erro).toBe("ACESSO_NEGADO");
        });

        it("deve impedir comprador de criar sessão", async () => {
            autenticarApiKey({
                usuario: comprador,
                escopo: "LEITURA_ESCRITA"
            });

            const resposta = await request(app)
                .post("/v1/sessoes")
                .set("Authorization", `Bearer ${CHAVE_TESTE}`)
                .send({});

            expect(resposta.status).toBe(403);

            expect(resposta.body.erro).toBe("ACESSO_NEGADO");
        });

        it("deve permitir promotor com chave de escrita passar pela autorização", async () => {
            autenticarApiKey({
                usuario: promotor,
                escopo: "LEITURA_ESCRITA"
            });

            const resposta = await request(app)
                .post("/v1/sessoes")
                .set("Authorization", `Bearer ${CHAVE_TESTE}`)
                .send({});

            // O corpo está vazio propositalmente, HTTP 422 confirma que a autenticação e a autorização foram superadas e a requisição chegou à validação Zod.
            expect(resposta.status).toBe(422);

            expect(resposta.body.erro).toBe("DADOS_INVALIDOS");
        });
    });
});