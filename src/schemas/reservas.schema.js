import { z } from "zod";

export const reservaIdParamsSchema = z.object({
    id: z.uuid()
});

export const confirmarReservaSchema = z.object({
    referenciaPagamento: z.string()
        .trim()
        .min(1)
        .max(255)
}).strict();

export const idempotenciaHeadersSchema = z.object({
    "idempotency-key": z.string()
        .trim()
        .min(8)
        .max(255)
});
