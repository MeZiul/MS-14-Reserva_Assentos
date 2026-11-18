import "dotenv/config";
import { prisma } from "../lib/prisma.js";

async function main() {
    const sessaoId = process.env.TESTE_SESSAO_ID;

    if (!sessaoId) {
        throw new Error("Defina TESTE_SESSAO_ID no arquivo .env");
    }

    const agora = new Date();
    const assentos = await prisma.assentoSessao.findMany({
        where: {
            sessaoId
        },
        include: {
            assento: {
                include: {
                    setor: true
                }
            },
            bloqueioAtual: true
        }
    });

    const resultado = assentos.map((item) => {
        const expirado =
            item.estado === "BLOQUEADO" &&
            item.bloqueioAtual?.situacao === "ATIVO" &&
            item.bloqueioAtual.expiraEm <= agora;

        return {
            id: item.assentoId,
            setor: item.assento.setor.nome,
            fileira: item.assento.fileira,
            numero: item.assento.numero,
            estado: item.estado,
            disponivel: item.estado === "LIVRE" || expirado
        };
    });

    console.table(resultado);

    const escolhido = resultado.find((item) => item.disponivel);

    if (!escolhido) {
        console.log("Não existem assentos disponíveis nesta sessão");
        return;
    }

    console.log("\nAssento selecionado:");
    console.log(`${escolhido.fileira}${escolhido.numero}`);
    console.log("\nCopie para o .env:");
    console.log(`TESTE_ASSENTO_ID=${escolhido.id}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
