
import { z } from "zod";

const camposUsuario = {
    nome: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    papel: z.enum(["COMPRADOR", "PROMOTOR"]).optional(),
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