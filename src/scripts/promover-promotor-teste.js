import "dotenv/config";
import { PAPEIS_USUARIO } from "../constants/roles.js";
import { prisma } from "../lib/prisma.js";

const email = process.env.PROMOTOR_TESTE_EMAIL;

if (process.env.NODE_ENV === "production" || !email?.endsWith("@example.com")) {
    throw new Error("Operação permitida apenas para contas de teste.");
}

try {
    const usuario = await prisma.usuario.findUnique({
        where: { email },
        include: {
            conta: {
                select: { provedorId: true }
            }
        }
    });

    if (!usuario) {
        throw new Error("Usuário não encontrado.");
    }

    if (!usuario.conta.some((conta) => conta.provedorId === "credential")) {
        throw new Error("Usuário ainda não possui credenciais BetterAuth.");
    }

    const atualizado = await prisma.usuario.update({
        where: { id: usuario.id },
        data: { papel: PAPEIS_USUARIO.PROMOTOR },
        select: {
            id: true,
            email: true,
            papel: true
        }
    });

    console.log(atualizado);
} finally {
    await prisma.$disconnect();
}
