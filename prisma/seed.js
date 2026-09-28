import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando o seed do banco de dados...");

  const promotor = await prisma.usuario.upsert({
    where: {
      email: "promotor.show@evento.com",
    },

    update: {},

    create: {
      nome: "Promotor Exemplo",
      email: "promotor.show@evento.com",
      papel: "PROMOTOR",
    },
  });

  const local = await prisma.local.create({
    data: {
      nome: "Jardins de Vilhena",
      endereco: "Av. Arquiteto Elias Arruda, 4321 - Vilhena, RO",
      donoId: promotor.id,
    },
  });

  const mapa = await prisma.mapa.create({
    data: {
      localId: local.id,
      nome: "Estacionamento Superior",
      capacidadeTotal: 10,
    },
  });

  const setor = await prisma.setor.create({
    data: {
      mapaId: mapa.id,
      nome: "Setor VIP",
      ordemExibicao: 1,
      categoria: "VIP",
    },
  });

  // Criação dos assentos
  const assentos = [];

  for (let numero = 1; numero <= 10; numero++) {
    const assento = await prisma.assento.create({
      data: {
        setorId: setor.id,
        fileira: "A",
        numero,
        x: numero,
        y: 1,
        ordemNaFileira: numero,
      },
    });

    assentos.push(assento);
  }

  const sessao = await prisma.sessao.create({
    data: {
      mapaId: mapa.id,

      inicioEm: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),

      situacao: "VENDAS_ABERTAS",
    },
  });

  // Preço do setor para a sessão
  await prisma.faixaPreco.create({
    data: {
      sessaoId: sessao.id,
      setorId: setor.id,
      valor: 50,
      meiaEntrada: 25,
    },
  });

  // Criação do estado dos assentos para essa sessão
  await prisma.assentoSessao.createMany({
    data: assentos.map((assento) => ({
      sessaoId: sessao.id,
      assentoId: assento.id,
      estado: "LIVRE",
    })),
  });

  console.log("Seed concluído com sucesso!");

  console.log({
    promotorId: promotor.id,
    localId: local.id,
    mapaId: mapa.id,
    setorId: setor.id,
    sessaoId: sessao.id,
    totalAssentos: assentos.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });