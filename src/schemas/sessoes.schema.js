// src/schemas/sessoes.schema.js

import { z } from "zod";

const criarSessaoSchema = z.object({
    mapaId: z.uuid(),

    inicioEm: z.coerce.date(),

    situacao: z.enum([
        "AGENDADA",
        "VENDAS_ABERTAS",
        "ESGOTADA",
        "REALIZADA",
        "CANCELADA",
    ]).optional(),

    prazoBloqueioSegundos: z.number().int().positive().optional(),

    maxProrrogacoes: z.number().int().nonnegative().optional(),
});

const atualizarSessaoSchema = z.object({
    mapaId: z.uuid().optional(),

    inicioEm: z.coerce.date().optional(),

    situacao: z.enum([
        "AGENDADA",
        "VENDAS_ABERTAS",
        "ESGOTADA",
        "REALIZADA",
        "CANCELADA",
    ]).optional(),

    prazoBloqueioSegundos: z.number().int().positive().optional(),

    maxProrrogacoes: z.number().int().nonnegative().optional(),
}).refine(
    (dados) => Object.keys(dados).length > 0,
    { message: "Informe pelo menos um campo para atualização." }
);

export { criarSessaoSchema, atualizarSessaoSchema };