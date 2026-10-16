import "dotenv/config";

const BASE_URL = process.env.API_URL ?? "http://localhost:3000";

const SESSAO_ID = process.env.TESTE_SESSAO_ID;
const ASSENTO_ID = process.env.TESTE_ASSENTO_ID;

const TOKEN_A = process.env.TESTE_TOKEN_A;
const TOKEN_B = process.env.TESTE_TOKEN_B;

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
        throw new Error("Utilize tokens de compradores diferentes.");
    }
}

async function bloquear(nome, token) {
    const inicio = performance.now();

    const resposta = await fetch(
        `${BASE_URL}/v1/sessoes/${SESSAO_ID}/bloqueios`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                assentosIds: [ASSENTO_ID]
            })
        }
    );

    const dados = await resposta.json();

    return {
        comprador: nome,
        status: resposta.status,
        duracaoMs: Math.round(performance.now() - inicio),
        dados
    };
}

async function consultarAssento() {
    const resposta = await fetch(`${BASE_URL}/v1/sessoes/${SESSAO_ID}/assentos`);

    if (!resposta.ok) {
        throw new Error(`Consulta falhou: HTTP ${resposta.status}`);
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

    const antes = await consultarAssento();

    if (antes.estado !== "LIVRE") {
        throw new Error(`O assento precisa estar LIVRE. Estado: ${antes.estado}`);
    }

    console.log("\nDisparando duas requisições simultâneas...");

    const resultados = await Promise.all([bloquear("Comprador A", TOKEN_A), bloquear("Comprador B", TOKEN_B)]);

    for (const resultado of resultados) {
        console.log(`\n${resultado.comprador}`);
        console.log(`HTTP: ${resultado.status}`);
        console.log(`Tempo: ${resultado.duracaoMs} ms`);
        console.log("Resposta:", JSON.stringify(resultado.dados));
    }

    const sucessos = resultados.filter((item) => item.status === 201);

    const conflitos = resultados.filter((item) => item.status === 409);

    const depois = await consultarAssento();

    console.log("\n=== RESULTADO FINAL ===");
    console.log(`Sucessos: ${sucessos.length}`);
    console.log(`Conflitos: ${conflitos.length}`);
    console.log(`Estado do assento: ${depois.estado}`);

    const aprovado = sucessos.length === 1 && conflitos.length === 1 && conflitos[0].dados.erro === "ASSENTOS_INDISPONIVEIS" && depois.estado === "BLOQUEADO";

    if (!aprovado) {
        console.error("\nREPROVADO: concorrência inconsistente.");
        process.exitCode = 1;
        return;
    }

    console.log("\nAPROVADO: somente um comprador obteve o assento.");
    console.log(`Bloqueio vencedor: ${sucessos[0].dados.id}`);
}

main().catch((error) => {
    console.error("\nERRO:", error.message);
    process.exitCode = 1;
});
