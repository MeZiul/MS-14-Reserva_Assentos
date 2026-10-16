import "dotenv/config";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PAPEIS_USUARIO } from "../constants/roles.js";
import { prisma } from "../lib/prisma.js";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,

    secret: process.env.BETTER_AUTH_SECRET,

    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8
    },

    user: {
        modelName: "Usuario",

        fields: {
            name: "nome",
            emailVerified: "emailVerificado",
            image: "imagem",
            createdAt: "criadoEm",
            updatedAt: "atualizadoEm"
        },

        additionalFields: {
            papel: {
                type: "string",
                required: false,
                defaultValue: PAPEIS_USUARIO.COMPRADOR,
                input: false,
                returned: true
            }
        }
    },

    session: {
        modelName: "Sessao_Autenticacao",

        fields: {
            userId: "usuarioId",
            expiresAt: "expiraEm",
            ipAddress: "enderecoIp",
            createdAt: "criadoEm",
            updatedAt: "atualizadoEm"
        },

        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,

        cookieCache: {
            enabled: false
        }
    },

    account: {
        modelName: "Conta",

        fields: {
            userId: "usuarioId",
            accountId: "idNaConta",
            providerId: "provedorId",
            accessToken: "tokenAcesso",
            refreshToken: "tokenAtualizacao",
            accessTokenExpiresAt: "tokenAcessoExpiraEm",
            refreshTokenExpiresAt: "tokenAtualizacaoExpiraEm",
            scope: "escopo",
            idToken: "tokenIdentidade",
            password: "senha",
            createdAt: "criadoEm",
            updatedAt: "atualizadoEm"
        }
    },

    verification: {
        modelName: "Verificacao",

        fields: {
            identifier: "identificador",
            value: "valor",
            expiresAt: "expiraEm",
            createdAt: "criadoEm",
            updatedAt: "atualizadoEm"
        }
    },

    advanced: {
        database: {
            generateId: "uuid"
        }
    },

    trustedOrigins: [
        process.env.BETTER_AUTH_URL
    ]
});
