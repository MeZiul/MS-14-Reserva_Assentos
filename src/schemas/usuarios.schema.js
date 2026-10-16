
import { z } from "zod";
import { PAPEIS_USUARIO } from "../constants/roles.js";

const camposUsuario = {
    nome: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    papel: z.enum(Object.values(PAPEIS_USUARIO)).optional(),
    imagem: z.string().url().nullable().optional(),
};

export const criarUsuarioSchema = z.object({
    nome: camposUsuario.nome,
    email: camposUsuario.email,
    papel: camposUsuario.papel,
    imagem: camposUsuario.imagem,
}).strict();

export const atualizarUsuarioSchema = z.object({
    nome: camposUsuario.nome.optional(),
    email: camposUsuario.email.optional(),
    papel: camposUsuario.papel,
    imagem: camposUsuario.imagem,
})
    .strict()
    .refine(
        (dados) => Object.keys(dados).length > 0,
        { message: "Informe pelo menos um campo para atualizar." }
    );

export const usuarioIdParamsSchema = z.object({
    id: z.uuid()
});

export const listarUsuariosQuerySchema = z.object({
    page: z.coerce.number()
        .int()
        .min(1)
        .default(1),

    limit: z.coerce.number()
        .int()
        .min(1)
        .max(100)
        .default(20)
});