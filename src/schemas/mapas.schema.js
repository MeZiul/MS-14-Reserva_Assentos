import { z } from "zod";

const assentoSchema = z.object({
    fileira: z.string().trim().min(1).max(10),
    numero: z.number().int().positive(),
    x: z.number().finite(),
    y: z.number().finite(),
    atributo: z.enum(["PADRAO", "CADEIRANTE", "ACOMPANHANTE", "VISAO_OBSTRUIDA", "CAMAROTE"]).default("PADRAO"),
    ordemNaFileira: z.number().int().nonnegative(),
    grupoContiguo: z.number().int().positive().default(1),

}).superRefine((assento, contexto) => {
    if (!assento.fileira.trim()) {
        contexto.addIssue({
            code: "custom",
            path: ["fileira"],
            message: "A fileira é obrigatória."
        });
    }
});

const setorSchema = z.object({
    nome: z.string().trim().min(1).max(100),

    ordemExibicao: z.number().int().nonnegative(),

    categoria: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .nullable()
        .optional(),

    assentos: z.array(assentoSchema).min(1)
}).superRefine((setor, contexto) => {
    const identificadores = new Set();

    setor.assentos.forEach((assento, indice) => {
        const identificador = `${assento.fileira.toUpperCase()}:${assento.numero}`;

        if (identificadores.has(identificador)) {
            contexto.addIssue({
                code: "custom",
                path: ["assentos", indice, "numero"],
                message: "Já existe um assento com essa fileira e número neste setor"
            });
        }

        identificadores.add(identificador);
    });
});

export const criarMapaSchema = z.object({
    nome: z.string().trim().min(2).max(150),

    setores: z.array(setorSchema).min(1)
});

export const mapaLocalParamsSchema = z.object({
    id: z.uuid()
});

export const mapaDetalheParamsSchema = z.object({
    id: z.uuid(),
    mapaId: z.uuid()
});
