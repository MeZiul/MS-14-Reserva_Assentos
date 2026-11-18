import { describe, it, expect, beforeEach, vi } from "vitest";

// Não será criada nenhuma conexão real com o banco
vi.mock("../src/lib/prisma.js", () => ({
    prisma: {
        bloqueio: {}
    }
}));

// Permite testar a lógica de negócio sem executar transações reais no PostgreSQL
vi.mock("../src/repositories/index.js", () => ({
    bloqueiosRepository: {
        executarTransacao: vi.fn(),
        bloquearSessao: vi.fn(),
        buscarSessao: vi.fn(),
        buscarPorChaveCriacao: vi.fn(),
        liberarExpirados: vi.fn(),
        listarAssentos: vi.fn(),
        criar: vi.fn(),
        marcarAssentos: vi.fn(),
        incrementarVersaoSessao: vi.fn()
    }
}));

import { criarBloqueio } from "../src/services/bloqueios.service.js";

import { bloqueiosRepository } from "../src/repositories/index.js";

import { idempotenciaBloqueioHeadersSchema } from "../src/schemas/bloqueios.schema.js";

// IDs fictícios para os testes
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

// Simula uma sessão disponível para vendas
const sessao = {
    id: SESSAO_ID,
    situacao: "VENDAS_ABERTAS",
    inicioEm: new Date("2099-12-31T23:59:59.000Z"),
    prazoBloqueioSegundos: 600,
    faixas: []
};

// Simula um assento disponível
const assentos = [
    {
        assentoId: ASSENTO_ID,
        estado: "LIVRE",
        bloqueioAtualId: null
    }
];

describe("Idempotência dos bloqueios", () => {

    let bloqueioCriado;

    beforeEach(() => {
        vi.resetAllMocks();

        bloqueioCriado = null;

        // Executa o callback de transação, não há transação real neste teste
        bloqueiosRepository.executarTransacao.mockImplementation(async (callback) => callback({}));

        bloqueiosRepository.bloquearSessao.mockResolvedValue(true);

        bloqueiosRepository.buscarSessao.mockResolvedValue(sessao);

        bloqueiosRepository.buscarPorChaveCriacao.mockResolvedValue(null);

        bloqueiosRepository.liberarExpirados.mockResolvedValue(0);

        bloqueiosRepository.listarAssentos.mockResolvedValue(assentos);

        bloqueiosRepository.marcarAssentos.mockResolvedValue(1);

        bloqueiosRepository.incrementarVersaoSessao.mockResolvedValue({ versao: 1 });

        // Captura o bloqueio criado para permitir sua recuperação em outras requisições
        bloqueiosRepository.criar.mockImplementation(async (_, dadosCriacao) => {
            bloqueioCriado = {
                id: BLOQUEIO_ID,
                ...dadosCriacao,
                situacao: "ATIVO"
            };

            return bloqueioCriado;
        }
        );
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
        const resultado = await criarBloqueio(
            SESSAO_ID,
            COMPRADOR_ID,
            dados,
            CHAVE
        );

        expect(resultado.id).toBe(BLOQUEIO_ID);

        expect(resultado.assentos).toEqual([ASSENTO_ID]);

        expect(resultado.situacao).toBe("ATIVO");

        expect(bloqueiosRepository.criar).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                sessaoId: SESSAO_ID,
                compradorId: COMPRADOR_ID,
                chaveCriacao: CHAVE,
                hashRequisicao: expect.any(String),
                assentosCriacao: [ASSENTO_ID]
            })
        );

        expect(bloqueiosRepository.marcarAssentos).toHaveBeenCalledTimes(1);

        expect(bloqueiosRepository.incrementarVersaoSessao).toHaveBeenCalledTimes(1);
    });

    it("deve retornar o mesmo bloqueio ao repetir a operação", async () => {
        const primeira = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        // Simula o registro encontrado na segunda tentativa
        bloqueiosRepository.buscarPorChaveCriacao.mockResolvedValue(bloqueioCriado);

        const segunda = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        expect(segunda).toEqual(primeira);

        // O bloqueio foi criado apenas uma vez
        expect(bloqueiosRepository.criar).toHaveBeenCalledTimes(1);

        // Os assentos foram modificados apenas uma vez
        expect(bloqueiosRepository.marcarAssentos).toHaveBeenCalledTimes(1);

        // A versão da sessão também mudou apenas uma vez
        expect(bloqueiosRepository.incrementarVersaoSessao).toHaveBeenCalledTimes(1);
    });

    it("deve rejeitar a mesma chave com dados diferentes", async () => {
        await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        bloqueiosRepository.buscarPorChaveCriacao.mockResolvedValue(bloqueioCriado);

        await expect(criarBloqueio(
            SESSAO_ID,
            COMPRADOR_ID,
            {
                assentosIds: [OUTRO_ASSENTO_ID]
            },
            CHAVE
        )).rejects.toMatchObject({
            codigo: "IDEMPOTENCIA_CONFLITANTE",
            status: 409
        });

        expect(bloqueiosRepository.criar).toHaveBeenCalledTimes(1);
    });

    it("deve recuperar a operação após conflito P2002", async () => {
        // Criação original
        const primeira = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        const anterior = bloqueioCriado;

        // Simula outra requisição que não encontrou a operação antes de tentar criá-la
        bloqueiosRepository.buscarPorChaveCriacao
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(anterior);

        // A restrição única do banco rejeitou a duplicidade
        bloqueiosRepository.criar.mockRejectedValueOnce({ code: "P2002" });

        const segunda = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        expect(segunda).toEqual(primeira);
    });

    it("deve rejeitar conflito de chave entre sessões diferentes", async () => {
        // Cria o bloqueio na primeira sessão
        await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        const anterior = bloqueioCriado;

        // O mesmo comprador tenta usar a chave em outra sessão
        bloqueiosRepository.buscarPorChaveCriacao.mockResolvedValue(anterior);

        await expect(criarBloqueio(OUTRA_SESSAO_ID, COMPRADOR_ID, dados, CHAVE)
        ).rejects.toMatchObject({
            codigo: "IDEMPOTENCIA_CONFLITANTE",
            status: 409
        });
    });

    it("deve preservar os assentos originais após expiração", async () => {
        await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        bloqueioCriado.situacao = "EXPIRADO";

        bloqueiosRepository.buscarPorChaveCriacao.mockResolvedValue(bloqueioCriado);

        const resultado = await criarBloqueio(SESSAO_ID, COMPRADOR_ID, dados, CHAVE);

        expect(resultado.id).toBe(BLOQUEIO_ID);

        expect(resultado.assentos).toEqual([ASSENTO_ID]);

        expect(bloqueiosRepository.criar).toHaveBeenCalledTimes(1);
    });
});