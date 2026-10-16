import { z } from "zod";

const situacoesSessao = ["AGENDADA", "VENDAS_ABERTAS", "ESGOTADA", "REALIZADA", "CANCELADA"];

const faixaPrecoSchema = z.object({
    setorId: z.uuid(),

    valor: z.number().finite().nonnegative(),

    meiaEntrada: z
        .number()
        .finite()
        .nonnegative()
        .nullable()
        .optional(),

    vigenteDe: z.coerce.date().optional(),

    vigenteAte: z.coerce.date().optional()
});

export const criarSessaoSchema = z.object({
    mapaId: z.uuid(),

    inicioEm: z.coerce.date(),

    situacao: z.enum(situacoesSessao).optional(),

    prazoBloqueioSegundos: z
        .number()
        .int()
        .positive()
        .optional(),

    maxProrrogacoes: z
        .number()
        .int()
        .nonnegative()
        .optional(),

    faixas: z.array(faixaPrecoSchema).min(1)
}).superRefine((dados, contexto) => {
    const setores = new Set();

    dados.faixas.forEach((faixa, indice) => {
        if (setores.has(faixa.setorId)) {
            contexto.addIssue({
                code: "custom",
                path: ["faixas", indice, "setorId"],
                message: "Não é permitido cadastrar mais de uma faixa para o mesmo setor"
            });
        }

        setores.add(faixa.setorId);

        if (faixa.vigenteDe && faixa.vigenteAte && faixa.vigenteAte <= faixa.vigenteDe) {
            contexto.addIssue({
                code: "custom",
                path: ["faixas", indice, "vigenteAte"],
                message: "O fim da vigência deve ser posterior ao início"
            });
        }
    });
});

export const atualizarSessaoSchema = z.object({
    mapaId: z.uuid().optional(),

    inicioEm: z.coerce.date().optional(),

    situacao: z.enum(situacoesSessao).optional(),

    prazoBloqueioSegundos: z
        .number()
        .int()
        .positive()
        .optional(),

    maxProrrogacoes: z
        .number()
        .int()
        .nonnegative()
        .optional()
}).refine((dados) => Object.keys(dados).length > 0, { message: "Informe pelo menos um campo para atualização" });

export const listarSessoesQuerySchema = z.object({
    localId: z.uuid().optional(),

    de: z.coerce.date().optional(),

    ate: z.coerce.date().optional(),

    situacao: z.enum(situacoesSessao).optional(),

    pagina: z.coerce.number().int().min(1).default(1),

    limite: z.coerce.number().int().min(1).max(100).default(20)
}).superRefine((filtros, contexto) => {
    if (filtros.de && filtros.ate && filtros.ate < filtros.de) {
        contexto.addIssue({
            code: "custom",
            path: ["ate"],
            message: "A data final deve ser igual ou posterior à data inicial."
        });
    }
});

export const sessaoIdParamsSchema = z.object({
    id: z.uuid()
});
