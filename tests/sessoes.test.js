import { describe, it, expect } from "vitest";
import request from "supertest";

import { app } from "../src/app.js";

describe("API de Sessões", () => {
    it("deve listar sessões com paginação", async () => {
        const resposta = await request(app).get("/v1/sessoes");

        expect(resposta.status).toBe(200);
        expect(resposta.body.docs).toBeInstanceOf(Array);
        expect(resposta.body).toHaveProperty("pagina");
        expect(resposta.body).toHaveProperty("limite");
    });

    it("deve rejeitar UUID inválido", async () => {
        const resposta = await request(app).get("/v1/sessoes/id-invalido");

        expect(resposta.status).toBe(422);
        expect(resposta.body.erro).toBe("DADOS_INVALIDOS");
    });

    it("deve rejeitar paginação acima do limite", async () => {
        const resposta = await request(app).get("/v1/sessoes?limite=101");

        expect(resposta.status).toBe(422);
    });

    it("deve exigir autenticação para criar sessão", async () => {
        const resposta = await request(app).post("/v1/sessoes").send({});

        expect(resposta.status).toBe(401);
    });
});
