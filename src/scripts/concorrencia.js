import "dotenv/config";
import { randomUUID } from "node:crypto";
import { ESTADO_ASSENTO } from "../constants/seat-status.js";
import { CODIGOS_ERRO } from "../utils/errors/error-codes.js";

const BASE_URL = process.env.API_URL ?? "http://localhost:3000";

const SESSAO_ID = process.env.TESTE_SESSAO_ID;
const ASSENTO_ID = process.env.TESTE_ASSENTO_ID;

const TOKEN_A = process.env.TESTE_TOKEN_A;
const TOKEN_B = process.env.TESTE_TOKEN_B;

const TOTAL_REQUISICOES = Number(process.env.TESTE_TOTAL_REQUISICOES ?? 50);

function validarConfiguracao() {
    const obrigatorias = {
        TESTE_SESSAO_ID: SESSAO_ID,
        TESTE_ASSENTO_ID: ASSENTO_ID,
        TESTE_TOKEN_A: TOKEN_A,
        TESTE_TOKEN_B: TOKEN_B
    };

    for (const [nome, valor] of Object.entries(obrigatorias)) {
        if (!valor) {
            throw new Error(`Variável obrigatória ausente: ${nome}`);
        }
    }

    if (TOKEN_A === TOKEN_B) {
        throw new Error("Utilize tokens de compradores diferentes");
    }

    if (!Number.isInteger(TOTAL_REQUISICOES) || TOTAL_REQUISICOES < 2 || TOTAL_REQUISICOES > 500) {
        throw new Error("TESTE_TOTAL_REQUISICOES deve estar entre 2 e 500");
    }
}

// Envia uma tentativa de bloqueio
// Cada requisição recebe uma chave própria, assim, nenhuma tentativa é confundida com uma repetição idempotente.
async function bloquear(numero, token) {
    const inicio = performance.now();

    const resposta = await fetch(
        `${BASE_URL}/v1/sessoes/${SESSAO_ID}/bloqueios`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "Idempotency-Key": randomUUID()
            },
            body: JSON.stringify({
                assentosIds: [ASSENTO_ID]
            })
        }
    );

    const dados = await resposta.json();

    return {
        tentativa: numero,
        status: resposta.status,
        duracaoMs: Math.round(performance.now() - inicio),
        dados
    };
}

// Consulta o estado atual do assento
async function consultarAssento() {
    const resposta = await fetch(`${BASE_URL}/v1/sessoes/${SESSAO_ID}/assentos`);

    if (!resposta.ok) {
        throw new Error(`Consulta do mapa falhou: HTTP ${resposta.status}`);
    }

    const mapa = await resposta.json();

    for (const setor of mapa.setores) {
        const assento = setor.assentos.find((item) => item.id === ASSENTO_ID);

        if (assento) return assento;
    }

    throw new Error("Assento não encontrado no mapa.");
}

async function main() {
    validarConfiguracao();

    console.log("\n=== TESTE DE CONCORRÊNCIA ===");
    console.log(`Sessão: ${SESSAO_ID}`);
    console.log(`Assento: ${ASSENTO_ID}`);
    console.log(`Requisições simultâneas: ${TOTAL_REQUISICOES}`);

    // Verifica a condição inicial
    const antes = await consultarAssento();

    if (antes.estado !== ESTADO_ASSENTO.LIVRE) {
        throw new Error(`O assento precisa estar LIVRE. Estado: ${antes.estado}`);
    }

    // Monta todas as requisições antes de iniciar a execução
    const tarefas = Array.from(
        { length: TOTAL_REQUISICOES },
        (_, indice) => {
            const numero = indice + 1;

            // Alterna entre dois compradores
            const token = indice % 2 === 0 ? TOKEN_A : TOKEN_B;

            return () => bloquear(numero, token);
        }
    );

    console.log("\nDisparando requisições simultâneas...");

    const inicioGeral = performance.now();

    // allSettled mantém o resultado de todas as tentativas, inclusive falhas de rede
    const execucoes = await Promise.allSettled(tarefas.map((tarefa) => tarefa()));

    const duracaoTotal = Math.round(performance.now() - inicioGeral);

    const resultados = execucoes
        .filter((item) => item.status === "fulfilled")
        .map((item) => item.value);

    const falhasRede = execucoes.filter((item) => item.status === "rejected");

    // Classifica as respostas
    const sucessos = resultados.filter((item) => item.status === 201);

    const conflitos = resultados.filter((item) => item.status === 409);

    const motivosConflito = {};

    for (const conflito of conflitos) {
        const codigo = conflito.dados?.erro ?? "SEM_CODIGO";

        motivosConflito[codigo] = (motivosConflito[codigo] ?? 0) + 1;
    }

    console.log("\n=== MOTIVOS DOS CONFLITOS ===");

    console.table(
        Object.entries(motivosConflito).map(
            ([codigo, quantidade]) => ({
                codigo,
                quantidade
            })
        )
    );

    const conflitosValidos = conflitos.filter((item) => item.dados.erro === CODIGOS_ERRO.ASSENTOS_INDISPONIVEIS);

    const inesperados = resultados.filter((item) => item.status !== 201 && item.status !== 409);

    // Exibe o resultado de cada tentativa.
    console.table(resultados.map((item) => ({
        tentativa: item.tentativa,
        status: item.status,
        duracaoMs: item.duracaoMs,
        bloqueioId:
            item.status === 201
                ? item.dados.id
                : "-"
    }))
    );

    const depois = await consultarAssento();

    console.log("\n=== RESULTADO FINAL ===");
    console.log(`Total: ${TOTAL_REQUISICOES}`);
    console.log(`Sucessos: ${sucessos.length}`);
    console.log(`Conflitos: ${conflitos.length}`);
    console.log(`Conflitos válidos: ${conflitosValidos.length}`);
    console.log(`Respostas inesperadas: ${inesperados.length}`);
    console.log(`Falhas de rede: ${falhasRede.length}`);
    console.log(`Duração total: ${duracaoTotal} ms`);
    console.log(`Estado final do assento: ${depois.estado}`);

    // Exatamente uma operação pode vencer
    const aprovado =
        sucessos.length === 1 &&
        conflitos.length === TOTAL_REQUISICOES - 1 &&
        conflitosValidos.length === conflitos.length &&
        inesperados.length === 0 &&
        falhasRede.length === 0 &&
        depois.estado === ESTADO_ASSENTO.BLOQUEADO;

    if (!aprovado) {
        console.error("\nREPROVADO: resultado de concorrência inconsistente.");

        for (const item of inesperados) {
            console.error(`HTTP ${item.status}:`, JSON.stringify(item.dados));
        }

        for (const item of falhasRede) {
            console.error("Falha de rede:", item.reason?.message);
        }

        process.exitCode = 1;
        return;
    }

    console.log("\nAPROVADO: somente uma requisição obteve o assento.");

    console.log(`Bloqueio vencedor: ${sucessos[0].dados.id}`);
}

main().catch((error) => {
    console.error("\nERRO:", error.message);
    process.exitCode = 1;
});