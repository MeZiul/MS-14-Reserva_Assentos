import { z } from "zod";

export const criarLocalSchema = z.object({
    nome: z.string().trim().min(2).max(150),

    endereco: z
        .string()
        .trim()
        .min(3)
        .max(300)
        .nullable()
        .optional(),

    donoId: z.uuid()
});