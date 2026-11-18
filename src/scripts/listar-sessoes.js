import "dotenv/config";
import { prisma } from "../lib/prisma.js";

async function main() {
    const sessoes = await prisma.sessao.findMany({
        include: {
            mapa: {
                include: {
                    local: true
                }
            },
            assentos: {
                select: {
                    estado: true,
                    bloqueioAtual: {
                        select: {
                            situacao: true,
                            expiraEm: true
                        }
                    }
                }
            }
        },
        orderBy: {
            inicioEm: "asc"
        }
    });

    const agora = new Date();
    const resultado = sessoes.map((sessao) => ({
        id: sessao.id,
        local: sessao.mapa.local.nome,
        mapa: sessao.mapa.nome,
        inicio: sessao.inicioEm.toISOString(),
        situacao: sessao.situacao,
        livres: sessao.assentos.filter((item) =>
            item.estado === "LIVRE" ||
            (
                item.estado === "BLOQUEADO" &&
                item.bloqueioAtual?.situacao === "ATIVO" &&
                item.bloqueioAtual.expiraEm <= agora
            )
        ).length
    }));

    console.table(resultado);

    const selecionada = sessoes.find((sessao) =>
        sessao.situacao === "VENDAS_ABERTAS" &&
        sessao.inicioEm > agora &&
        resultado.find((item) => item.id === sessao.id
        )?.livres > 0
    );

    if (!selecionada) {
        console.log("Nenhuma sessão adequada para teste foi encontrada.");
        return;
    }

    console.log("\nCopie para o .env:");
    console.log(`TESTE_SESSAO_ID=${selecionada.id}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
