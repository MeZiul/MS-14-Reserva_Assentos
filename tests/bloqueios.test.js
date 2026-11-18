import { describe, it, expect, beforeEach, vi } from "vitest";

// Simula o repositório sem conectar ao PostgreSQL
vi.mock("../src/repositories/index.js", () => ({
    bloqueiosRepository: {
        executarTransacao: vi.fn(),
        bloquearSessao: vi.fn(),
        buscarSessao: vi.fn(),
        buscarPorChaveCriacao: vi.fn(),
        liberarExpirados: vi.fn(),
        listarAssentos: vi.fn(),
        marcarAssentos: vi.fn(),
        incrementarVersaoSessao: vi.fn()
    }
}));

import { criarBloqueio } from "../src/services/bloqueios.service.js";
import { bloqueiosRepository } from "../src/repositories/index.js";
import { idempotenciaBloqueioHeadersSchema } from "../src/schemas/bloqueios.schema.js";

// Identificadores fictícios.
const SESSAO_ID = "11111111-1111-4111-8111-111111111111";
const OUTRA_SESSAO_ID = "22222222-2222-4222-8222-222222222222";
const COMPRADOR_ID = "33333333-3333-4333-8333-333333333333";
const ASSENTO_ID = "44444444-4444-4444-8444-444444444444";
const OUTRO_ASSENTO_ID = "55555555-5555-4555-8555-555555555555";
const BLOQUEIO_ID = "66666666-6666-4666-8666-666666666666";

const CHAVE = "pedido-idempotente-0001";

const dados = {
    assentosIds: [ASSENTO_ID]
};

// Sessão aberta para vendas
const sessao = {
    id: SESSAO_ID,
    situacao: "VENDAS_ABERTAS",
    inicioEm: new Date("2099-12-31T23:59:59.000Z"),
    prazoBloqueioSegundos: 600,
    faixas: []
};

// Assento inicialmente livre
const assentos = [
    {
        assentoId: ASSENTO_ID,
        estado: "LIVRE",
        bloqueioAtualId: null
    }
];

describe("Idempotência dos bloqueios", () => {

    let bloqueioCriado;
    let criarRegistroMock;

    beforeEach(() => {
        vi.resetAllMocks();

        bloqueioCriado = null;

        // Simula o Prisma utilizado dentro da transação
        criarRegistroMock = vi.fn(async ({ data }) => {
            bloqueioCriado = {
                id: BLOQUEIO_ID,
                ...data
            };

            return bloqueioCriado;
        });

        const tx = {
            bloqueio: {
                create: criarRegistroMock
            }
        };

        // Executa o callback com o cliente transacional simulado
        bloqueiosRepository.executarTransacao.mockImplementation(async (callback) => callback(tx));

        bloqueiosRepository.bloquearSessao.mockResolvedValue(true);

        bloqueiosRepository.buscarSessao.mockResolvedValue(sessao);

        bloqueiosRepository.buscarPorChaveCriacao.mockResolvedValue(null);

        bloqueiosRepository.liberarExpirados.mockResolvedValue(0);

        bloqueiosRepository.listarAssentos.mockResolvedValue(assentos);

        bloqueiosRepository.marcarAssentos.mockResolvedValue(1);

        bloqueiosRepository.incrementarVersaoSessao.mockResolvedValue({ versao: 1 });
    });

    it("deve exigir chave de idempotência", async () => {
        await expect(criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados)
        ).rejects.toMatchObject({
            codigo: "DADOS_INVALIDOS",
            status: 422
        });

        expect(bloqueiosRepository.executarTransacao).not.toHaveBeenCalled();
    });

    it("deve validar o cabeçalho Idempotency-Key", () => {
        const valido = idempotenciaBloqueioHeadersSchema.safeParse({ "idempotency-key": CHAVE });

        const ausente = idempotenciaBloqueioHeadersSchema.safeParse({});

        expect(valido.success).toBe(true);
        expect(ausente.success).toBe(false);
    });

    it("deve criar um bloqueio com chave nova", async () => {
        const resultado = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        expect(resultado.id).toBe(BLOQUEIO_ID);
        expect(resultado.assentos).toEqual([ASSENTO_ID]);
        expect(resultado.situacao).toBe("ATIVO");

        // Verifica os dados enviados diretamente ao Prisma
        expect(criarRegistroMock).toHaveBeenCalledWith({
            data: expect.objectContaining({
                sessaoId: SESSAO_ID,
                compradorId: COMPRADOR_ID,
                chaveCriacao: CHAVE,
                hashRequisicao: expect.any(String),
                assentosCriacao: [ASSENTO_ID],
                situacao: "ATIVO",
                expiraEm: expect.any(Date)
            })
        });

        expect(criarRegistroMock).toHaveBeenCalledTimes(1);

        expect(bloqueiosRepository.marcarAssentos).toHaveBeenCalledTimes(1);

        expect(bloqueiosRepository.incrementarVersaoSessao).toHaveBeenCalledTimes(1);
    });

    it("deve retornar o mesmo bloqueio ao repetir a operação", async () => {
        const primeira = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        // Segunda requisição encontra a criação anterior
        bloqueiosRepository.buscarPorChaveCriacao.mockResolvedValue(bloqueioCriado);

        const segunda = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        expect(segunda).toEqual(primeira);

        // Nenhuma nova criação ou atualização
        expect(criarRegistroMock).toHaveBeenCalledTimes(1);

        expect(bloqueiosRepository.marcarAssentos).toHaveBeenCalledTimes(1);

        expect(bloqueiosRepository.incrementarVersaoSessao).toHaveBeenCalledTimes(1);
    });

    it("deve rejeitar a mesma chave com dados diferentes", async () => {
        await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        bloqueiosRepository.buscarPorChaveCriacao.mockResolvedValue(bloqueioCriado);

        await expect(criarBloqueio(SESSAO_ID, COMPRADOR_ID, { assentosIds: [OUTRO_ASSENTO_ID] }, CHAVE)
        ).rejects.toMatchObject({
            codigo: "IDEMPOTENCIA_CONFLITANTE",
            status: 409
        });

        expect(criarRegistroMock).toHaveBeenCalledTimes(1);
    });

    it("deve recuperar a operação após conflito P2002", async () => {
        // Primeira criação bem-sucedida
        const primeira = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        const anterior = bloqueioCriado;

        // A próxima operação inicialmente não encontra a chave, mas a encontra quando tenta recuperar o conflito
        bloqueiosRepository.buscarPorChaveCriacao
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(anterior);

        // Simula uma violação de unicidade do PostgreSQL
        criarRegistroMock.mockRejectedValueOnce({ code: "P2002" });

        const segunda = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        expect(segunda).toEqual(primeira);

        // Duas tentativas de criação, uma delas rejeitada
        expect(criarRegistroMock).toHaveBeenCalledTimes(2);

        // Apenas a criação original altera os assentos
        expect(bloqueiosRepository.marcarAssentos).toHaveBeenCalledTimes(1);

        expect(bloqueiosRepository.incrementarVersaoSessao).toHaveBeenCalledTimes(1);
    });

    it("deve rejeitar conflito de chave entre sessões diferentes", async () => {
        await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        bloqueiosRepository.buscarPorChaveCriacao.mockResolvedValue(bloqueioCriado);

        await expect(criarBloqueio(OUTRA_SESSAO_ID, COMPRADOR_ID, dados, CHAVE)
        ).rejects.toMatchObject({
            codigo: "IDEMPOTENCIA_CONFLITANTE",
            status: 409
        });

        expect(criarRegistroMock).toHaveBeenCalledTimes(1);
    });

    it("deve preservar os assentos originais após expiração", async () => {
        await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        // O bloqueio expirou, mas o histórico foi preservado
        bloqueioCriado.situacao = "EXPIRADO";

        bloqueiosRepository.buscarPorChaveCriacao.mockResolvedValue(bloqueioCriado);

        const resultado = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        expect(resultado.id).toBe(BLOQUEIO_ID);
        expect(resultado.assentos).toEqual([ASSENTO_ID]);

        // O serviço devolve o resultado idempotente original
        expect(resultado.situacao).toBe("ATIVO");

        // Não deve tentar bloquear novamente
        expect(criarRegistroMock).toHaveBeenCalledTimes(1);
    });
});