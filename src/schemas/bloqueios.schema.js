import { z } from "zod";

//Identificador da sessão
export const sessaoIdParamsSchema = z.object({
  id: z.uuid()
});

// Bloqueio de assentos específicos
const bloqueioEspecificoSchema = z.object({
  assentosIds: z.array(z.uuid())
    .min(1, "Informe pelo menos um assento.")
    .max(20, "Limite de 20 assentos.")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Não é permitido repetir assentos."
    )
}).strict();

// Bloqueio de assentos adjacentes
const bloqueioAdjacenteSchema = z.object({
  quantidade: z.number()
    .int()
    .min(1)
    .max(20),

  setorId: z.uuid()
}).strict();

//Aceita uma das duas modalidades de bloqueio
export const criarBloqueioSchema = z.union([
  bloqueioEspecificoSchema,
  bloqueioAdjacenteSchema
]);

// Cabeçalho obrigatório para a criação do bloqueio
// O Express normaliza os nomes dos cabeçalhos para letras minúsculas
export const idempotenciaBloqueioHeadersSchema = z.object({
  "idempotency-key": z.string()
    .trim()
    .min(8, "A chave de idempotência deve possuir pelo menos 8 caracteres.")
    .max(255, "A chave de idempotência deve possuir no máximo 255 caracteres.")
});

// Identificador de um bloqueio individual
export const bloqueioIdParamsSchema = z.object({
  id: z.uuid()
});

// Helpers existentes
export const validarSessaoId = (params) =>
  sessaoIdParamsSchema.parse(params);

export const validarCriacaoBloqueio = (body) =>
  criarBloqueioSchema.parse(body);