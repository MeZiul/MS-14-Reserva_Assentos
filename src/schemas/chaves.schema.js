import { z } from "zod";

export const criarChaveSchema = z.object({
    nome: z.string()
        .trim()
        .min(3, "O nome deve possuir pelo menos 3 caracteres")
        .max(100, "O nome deve possuir no máximo 100 caracteres"),

    escopo: z.enum([
        "LEITURA",
        "LEITURA_ESCRITA"
    ]).default("LEITURA")
}).strict();

export const chaveIdParamsSchema = z.object({
    id: z.uuid("Identificador da chave inválido")
});
