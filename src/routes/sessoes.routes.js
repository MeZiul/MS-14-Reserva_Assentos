import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const sessoesRoutes = Router();

sessoesRoutes.get("/", async (req, res) => {
  const sessoes = await prisma.sessao.findMany({
    include: {
      mapa: {
        include: {
          local: true,
        },
      },
    },
    orderBy: {
      inicioEm: "asc",
    },
  });

  return res.json(sessoes);
});

export { sessoesRoutes };