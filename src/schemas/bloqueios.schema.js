import { z } from "zod";

export const sessaoIdParamsSchema = z.object({
  id: z.uuid()
});

const bloqueioEspecificoSchema = z.object({
  assentosIds: z.array(z.uuid())
    .min(1, "Informe pelo menos um assento.")
    .max(20, "Limite de 20 assentos.")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Não é permitido repetir assentos."
    )
}).strict();

const bloqueioAdjacenteSchema = z.object({
  quantidade: z.number().int().min(1).max(20),
  setorId: z.uuid()
}).strict();

export const criarBloqueioSchema = z.union([
  bloqueioEspecificoSchema,
  bloqueioAdjacenteSchema
]);

export const validarSessaoId = (params) => sessaoIdParamsSchema.parse(params);

export const validarCriacaoBloqueio = (body) => criarBloqueioSchema.parse(body);
