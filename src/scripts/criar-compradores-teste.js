import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { criarChaveApi } from "../services/chaves.service.js";
import { PAPEIS_USUARIO } from "../constants/roles.js";

const COMPRADORES = [
    {
        identificador: "A",
        nome: "Comprador Teste A",
        email: "comprador-a@teste.ws14.local",
        nomeChave: "CONCORRENCIA_TESTE_A"
    },
    {
        identificador: "B",
        nome: "Comprador Teste B",
        email: "comprador-b@teste.ws14.local",
        nomeChave: "CONCORRENCIA_TESTE_B"
    }
];

async function criarComprador(dados) {
    // Cria o usuário se ainda não existir
    const usuario = await prisma.usuario.upsert({
        where: {
            email: dados.email
        },
        update: {},
        create: {
            nome: dados.nome,
            email: dados.email,
            papel: PAPEIS_USUARIO.COMPRADOR
        }
    });

    if (usuario.papel !== PAPEIS_USUARIO.COMPRADOR) {
        throw new Error(`O usuário ${dados.email} não é comprador`);
    }

    // Evita gerar uma segunda chave se já existe uma credencial ativa para este teste.
    const existente = await prisma.chaveApi.findFirst({
        where: {
            donoId: usuario.id,
            nome: dados.nomeChave,
            ativa: true,
            revogadaEm: null
        }
    });

    if (existente) {
        console.log(`\nComprador ${dados.identificador}: já possui chave ativa`);
        console.log("Utilize o segredo salvo anteriormente");
        console.log(`Usuário: ${usuario.id}`);
        console.log(`Chave ID: ${existente.id}`);

        return;
    }

    // Cria uma chave com permissão de escrita.
    const chave = await criarChaveApi(usuario.id,
        {
            nome: dados.nomeChave,
            escopo: "LEITURA_ESCRITA"
        }
    );

    console.log(`\n=== COMPRADOR ${dados.identificador} ===`);
    console.log(`Usuário ID: ${usuario.id}`);
    console.log(`Chave ID: ${chave.id}`);
    console.log(`Escopo: ${chave.escopo}`);
    console.log("\nCopie para o .env:");
    console.log(`TESTE_TOKEN_${dados.identificador}=${chave.chave}`);
}

async function main() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Este script não deve ser executado em produção");
    }

    console.log("=== CRIAÇÃO DE COMPRADORES DE TESTE ===");

    for (const comprador of COMPRADORES) {
        await criarComprador(comprador);
    }

    console.log("\nGuarde as chaves em local seguro");

    console.log("O PostgreSQL armazena apenas seus hashes");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
