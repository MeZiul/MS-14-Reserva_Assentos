import "dotenv/config";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";

async function main() {
    const comprador = await prisma.usuario.findFirst({
        where: { papel: "COMPRADOR" },
        select: { id: true, email: true }
    });

    if (!comprador) {
        throw new Error("Nenhum usuário COMPRADOR encontrado. Cadastre um comprador primeiro.");
    }

    const token = randomBytes(32).toString("hex");

    const sessao = await prisma.sessao_Autenticacao.create({
        data: {
            usuarioId: comprador.id,
            token,
            expiraEm: new Date(Date.now() + 60 * 60 * 1000)
        }
    });

    console.log("Comprador:", comprador.email);
    console.log("Token de teste:", token);
    console.log("Expira em:", sessao.expiraEm.toISOString());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).finally(async () => {
    await prisma.$disconnect();
});
