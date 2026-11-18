import "dotenv/config";

import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";

const BASE_URL = (process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "");

const SESSAO_ID = process.env.TESTE_SESSAO_ID;
const TOKEN_A = process.env.TESTE_TOKEN_A;
const TOKEN_B = process.env.TESTE_TOKEN_B;
const BLOQUEADOS = "BLOQUEADO";
const LIVRES = "LIVRE";

function verificar(condicao, mensagem) {
    if (!condicao) {
        throw new Error(`REPROVADO: ${mensagem}`);
    }

    console.log(`OK: ${mensagem}`);
}

function validarConfiguracao() {
    for (const [nome, valor] of Object.entries({
        TESTE_SESSAO_ID: SESSAO_ID,
        TESTE_TOKEN_A: TOKEN_A,
        TESTE_TOKEN_B: TOKEN_B
    })) {
        if (!valor) {
            throw new Error(`Variável ausente: ${nome}`);
        }
    }

    verificar(TOKEN_A !== TOKEN_B, "Compradores utilizam credenciais distintas");
}

async function buscarSessao() {
    const sessao = await prisma.sessao.findUnique({
        where: { id: SESSAO_ID },
        select: {
            id: true,
            inicioEm: true,
            situacao: true
        }
    });

    verificar(!!sessao, "Sessão encontrada");

    verificar(sessao.situacao === "VENDAS_ABERTAS", "Sessão possui vendas abertas");

    verificar(sessao.inicioEm > new Date(), "Sessão ainda não começou");
}

async function listarAssentos() {
    return prisma.assentoSessao.findMany({
        where: { sessaoId: SESSAO_ID },
        select: {
            id: true,
            assentoId: true,
            estado: true,
            bloqueioAtualId: true,
            assento: {
                select: {
                    fileira: true,
                    numero: true,
                    atributo: true
                }
            }
        }
    });
}

async function enviarBloqueio(comprador, token, ids) {
    const chave = randomUUID();
    const inicio = performance.now();

    const resposta = await fetch(
        `${BASE_URL}/v1/sessoes/${SESSAO_ID}/bloqueios`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "Idempotency-Key": chave
            },
            body: JSON.stringify({
                assentosIds: ids
            })
        }
    );

    const dados = await resposta.json();

    return {
        comprador,
        status: resposta.status,
        duracaoMs: Math.round(performance.now() - inicio),
        chave,
        dados,
        ids,
        token
    };
}

async function consultarBloqueioPorChave(chave, compradorId) {
    return prisma.bloqueio.findUnique({
        where: {
            compradorId_chaveCriacao: {
                compradorId,
                chaveCriacao: chave
            }
        }
    });
}

async function liberarBloqueio(id, token) {
    const resposta = await fetch(
        `${BASE_URL}/v1/bloqueios/${id}`,
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    if (resposta.status !== 204) {
        const corpo = await resposta.text();

        throw new Error(`Falha ao liberar bloqueio: HTTP ${resposta.status} ${corpo}`);
    }
}

async function main() {
    validarConfiguracao();

    console.log("\n=== TESTE DE ATOMICIDADE ===");

    await buscarSessao();

    // Seleciona sete assentos realmente livres no estado persistido do PostgreSQL
    const todos = await listarAssentos();

    const livres = todos.filter((item) =>
        item.estado === LIVRES &&
        item.bloqueioAtualId === null
    );

    verificar(livres.length >= 7, "Existem pelo menos sete assentos livres");

    const selecionados = livres.slice(0, 7);
    const ids = selecionados.map((item) => item.assentoId);

    // Compartilham somente o quarto assento
    const grupoA = ids.slice(0, 4);
    const grupoB = ids.slice(3, 7);

    console.log("\nAssentos selecionados:");

    console.table(selecionados.map((item, indice) => ({
        assento: `${item.assento.fileira}${item.assento.numero}`,
        id: item.assentoId,
        compradorA: indice < 4,
        compradorB: indice >= 3
    }))
    );

    let vencedor = null;
    let aprovado = false;

    try {
        console.log("\nEnviando pedidos simultâneos...");

        const [resultadoA, resultadoB] = await Promise.all([
            enviarBloqueio("A", TOKEN_A, grupoA),
            enviarBloqueio("B", TOKEN_B, grupoB)
        ]);

        const resultados = [resultadoA, resultadoB];

        console.table(resultados.map((item) => ({
            comprador: item.comprador,
            status: item.status,
            duracaoMs: item.duracaoMs,
            bloqueioId: item.dados.id ?? "-"
        }))
        );

        const sucessos = resultados.filter((item) => item.status === 201);

        const conflitos = resultados.filter((item) => item.status === 409);

        // Registra eventual vencedor mesmo antes das asserções, para permitir limpeza no finally
        vencedor = sucessos[0] ?? null;

        verificar(sucessos.length === 1, "Exatamente um comprador obteve sucesso");

        verificar(conflitos.length === 1, "Exatamente um comprador recebeu HTTP 409");

        const perdedor = conflitos[0];

        verificar(perdedor.dados.erro === "ASSENTOS_INDISPONIVEIS", "O conflito possui o código esperado");

        // Confere o conjunto de IDs devolvidos
        verificar(
            Array.isArray(vencedor.dados.assentos) &&
            vencedor.dados.assentos.length === 4 &&
            vencedor.ids.every(
                (id) => vencedor.dados.assentos.includes(id)
            ),
            "O vencedor recebeu exatamente quatro assentos"
        );

        // Consulta o banco diretamente após os dois pedidos terminarem
        const depois = await listarAssentos();

        const porId = new Map(depois.map((item) => [item.assentoId, item]));

        const exclusivosPerdedor = perdedor.ids.filter((id) => !vencedor.ids.includes(id));

        // Valida os quatro assentos do vencedor
        for (const id of vencedor.ids) {
            const assento = porId.get(id);

            verificar(
                assento.estado === BLOQUEADOS &&
                assento.bloqueioAtualId === vencedor.dados.id,
                `Assento ${id} pertence ao vencedor`
            );
        }

        // Valida que o pedido perdedor não alterou nenhum de seus assentos exclusivos
        for (const id of exclusivosPerdedor) {
            const assento = porId.get(id);

            verificar(
                assento.estado === LIVRES &&
                assento.bloqueioAtualId === null,
                `Assento ${id} permaneceu livre`
            );
        }

        // Verifica que não existe registro de bloqueio persistido para o pedido rejeitado
        const compradorPerdedorId = perdedor.comprador === "A"
            ? process.env.TESTE_COMPRADOR_A_ID
            : process.env.TESTE_COMPRADOR_B_ID;

        if (compradorPerdedorId) {
            const bloqueioPerdedor = await consultarBloqueioPorChave(perdedor.chave, compradorPerdedorId);

            verificar(bloqueioPerdedor === null, "O pedido rejeitado não criou um bloqueio");
        } else {
            console.log("Verificação do registro perdedor ignorada: IDs dos compradores não configurados.");
        }

        // Confere que todos os estados possíveis preservam a capacidade da sessão
        const capacidade = depois.length;

        const contagem = {
            livres: depois.filter(
                (item) => item.estado === LIVRES
            ).length,
            bloqueados: depois.filter(
                (item) => item.estado === BLOQUEADOS
            ).length,
            vendidos: depois.filter(
                (item) => item.estado === "VENDIDO"
            ).length
        };

        verificar(
            contagem.livres +
            contagem.bloqueados +
            contagem.vendidos === capacidade,
            "A soma dos estados corresponde à capacidade"
        );

        console.log("\nEstados persistidos:");
        console.table(contagem);

        aprovado = true;

        console.log("\nAPROVADO: o bloqueio múltiplo foi atômico.");
    } finally {
        // Libera somente o bloqueio criado por este teste, sem alterar outros bloqueios
        if (vencedor?.dados?.id) {
            console.log("\nLiberando bloqueio de teste...");

            try {
                await liberarBloqueio(
                    vencedor.dados.id,
                    vencedor.token
                );

                console.log("Bloqueio liberado.");
            } catch (error) {
                aprovado = false;
                console.error("Falha na limpeza:", error.message);
                console.error("Bloqueio que pode exigir liberação:", vencedor.dados.id);
            }
        }

        if (!aprovado) {
            process.exitCode = 1;
        }
    }
}

main()
    .catch((error) => {
        console.error("\nERRO:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });