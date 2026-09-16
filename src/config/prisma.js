import { PrismaClient } from '@prisma/client';

// Uma única instância para a aplicação inteira — cada `new PrismaClient()`
// abre um pool de conexões próprio, e o Supabase limita conexões simultâneas.
export const prisma = new PrismaClient();