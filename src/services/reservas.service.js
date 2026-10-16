import { reservasRepository } from "../repositories/reservas.repository.js";
import { ESTADO_ASSENTO } from "../constants/seat-status.js";
import { SITUACAO_SESSAO } from "../constants/session-status.js";
import { SITUACAO_BLOQUEIO } from "../constants/lock-status.js";
import { CODIGOS_ERRO } from "../utils/errors/error-codes.js";

function erro(codigo, mensagem, status = 422) {
    const error = new Error(mensagem);
    error.codigo = codigo;
    error.status = status;
    return error;
}

function respostaReserva(reserva) {
    return {
        id: reserva.id,
        bloqueioId: reserva.bloqueioOrigemId,
        sessaoId: reserva.bloqueioOrigem.sessaoId,
        valorTotal: Number(reserva.valorTotal),
        referenciaPagamento: reserva.referenciaPagamento,
        confirmadaEm: reserva.confirmadaEm,
        canceladaEm: reserva.canceladaEm,
        situacao: reserva.canceladaEm
            ? "CANCELADA"
            : "CONFIRMADA",
        assentos: reserva.assentosAtuais.map((item) => ({
            id: item.assentoId,
            setorId: item.assento.setorId,
            setor: item.assento.setor.nome,
            fileira: item.assento.fileira,
            numero: item.assento.numero
        }))
    };
}

export async function confirmarReserva(bloqueioId, compradorId, dados, chaveIdempotencia) {
    return reservasRepository.executarTransacao(async (tx) => {
        // Primeiro localiza o bloqueio para identificar a sessão.
        const inicial = await reservasRepository.buscarBloqueio(tx, bloqueioId, compradorId);

        if (!inicial) {
            throw erro(CODIGOS_ERRO.BLOQUEIO_NAO_ENCONTRADO, "Bloqueio não encontrado.", 404);
        }

        // Todas as operações de escrita da sessão seguem
        // a mesma estratégia de bloqueio transacional.
        await reservasRepository.bloquearSessao(tx, inicial.sessaoId);

        // Reconsulta após adquirir o bloqueio da sessão.
        const bloqueio = await reservasRepository.buscarBloqueio(tx, bloqueioId, compradorId);

        if (!bloqueio) {
            throw erro(CODIGOS_ERRO.BLOQUEIO_NAO_ENCONTRADO, "Bloqueio não encontrado.", 404);
        }

        // Repetição idempotente: retorna a mesma reserva.
        if (bloqueio.situacao === SITUACAO_BLOQUEIO.CONFIRMADO) {
            if (bloqueio.chaveIdempotencia !== chaveIdempotencia) {
                throw erro(CODIGOS_ERRO.BLOQUEIO_JA_CONFIRMADO, "O bloqueio já foi confirmado.", 409);
            }

            const reservaExistente = await reservasRepository.buscarReservaPorBloqueio(tx, bloqueioId);

            if (!reservaExistente || reservaExistente.referenciaPagamento !== dados.referenciaPagamento) {
                throw erro(CODIGOS_ERRO.IDEMPOTENCIA_CONFLITANTE, "A chave já foi utilizada com outra confirmação.", 409);
            }

            return respostaReserva(reservaExistente);
        }

        if (bloqueio.situacao !== SITUACAO_BLOQUEIO.ATIVO) {
            throw erro(CODIGOS_ERRO.BLOQUEIO_INDISPONIVEL, "O bloqueio não está ativo.", bloqueio.situacao === SITUACAO_BLOQUEIO.EXPIRADO ? 410 : 409);
        }

        if (bloqueio.expiraEm <= new Date()) {
            throw erro(CODIGOS_ERRO.BLOQUEIO_EXPIRADO, "O prazo do bloqueio terminou.", 410);
        }

        const assentos = bloqueio.assentosAtuais;

        if (assentos.length === 0) {
            throw erro(CODIGOS_ERRO.BLOQUEIO_SEM_ASSENTOS, "O bloqueio não possui assentos disponíveis.", 409);
        }

        if (assentos.some((item) => item.estado !== ESTADO_ASSENTO.BLOQUEADO || item.bloqueioAtualId !== bloqueioId)) {
            throw erro(CODIGOS_ERRO.ESTADO_INCONSISTENTE, "Um ou mais assentos não pertencem ao bloqueio.", 409);
        }

        const faixas = await reservasRepository.buscarFaixasPreco(tx, bloqueio.sessaoId);

        const precos = new Map(faixas.map((faixa) => [faixa.setorId, faixa]));

        const agora = new Date();
        let totalCentavos = 0;

        for (const item of assentos) {
            const faixa = precos.get(item.assento.setorId);

            if (!faixa) {
                throw erro(CODIGOS_ERRO.PRECO_NAO_ENCONTRADO, "Preço não encontrado para um dos assentos.", 409);
            }

            if (faixa.vigenteDe > agora || (faixa.vigenteAte && faixa.vigenteAte <= agora)) {
                throw erro(CODIGOS_ERRO.PRECO_FORA_DA_VIGENCIA, "A faixa de preço não está vigente.", 409);
            }

            totalCentavos += Math.round(Number(faixa.valor) * 100);
        }

        const valorTotal = (totalCentavos / 100).toFixed(2);

        const reservaCriada = await reservasRepository.criar(tx, {
            bloqueioId, compradorId, valorTotal, referenciaPagamento: dados.referenciaPagamento
        });

        const resultado = await reservasRepository.venderAssentos(tx, bloqueio.sessaoId, bloqueioId, reservaCriada.id);

        if (resultado.count !== assentos.length) {
            throw erro(CODIGOS_ERRO.CONFLITO_ASSENTOS, "Não foi possível confirmar todos os assentos.", 409);
        }

        await reservasRepository.confirmarBloqueio(tx, bloqueioId, chaveIdempotencia);

        await reservasRepository.incrementarVersaoSessao(tx, bloqueio.sessaoId);

        const reserva = await reservasRepository.buscarReserva(tx, reservaCriada.id, compradorId);

        return respostaReserva(reserva);
    });
}

export async function consultarReserva(id, compradorId) {
    return reservasRepository.executarTransacao(async (tx) => {
        const reserva = await reservasRepository.buscarReserva(tx, id, compradorId);

        if (!reserva) {
            throw erro(CODIGOS_ERRO.RESERVA_NAO_ENCONTRADA, "Reserva não encontrada.", 404);
        }

        return respostaReserva(reserva);
    });
}

export async function cancelarReserva(id, compradorId) {
    return reservasRepository.executarTransacao(async (tx) => {
        const inicial = await reservasRepository.buscarReserva(tx, id, compradorId);

        if (!inicial) {
            throw erro(CODIGOS_ERRO.RESERVA_NAO_ENCONTRADA, "Reserva não encontrada.", 404);
        }

        const sessaoId = inicial.bloqueioOrigem.sessaoId;

        await reservasRepository.bloquearSessao(tx, sessaoId);

        const reserva = await reservasRepository.buscarReserva(tx, id, compradorId);

        if (!reserva) {
            throw erro(CODIGOS_ERRO.RESERVA_NAO_ENCONTRADA, "Reserva não encontrada.", 404);
        }

        if (reserva.canceladaEm) {
            throw erro(CODIGOS_ERRO.RESERVA_JA_CANCELADA, "A reserva já foi cancelada.", 409);
        }

        const sessao = await tx.sessao.findUnique({
            where: { id: sessaoId },
            select: {
                inicioEm: true,
                situacao: true
            }
        });

        if (!sessao || sessao.inicioEm <= new Date() || sessao.situacao === SITUACAO_SESSAO.REALIZADA) {
            throw erro(CODIGOS_ERRO.CANCELAMENTO_INDISPONIVEL, "Não é possível cancelar após o início da sessão.", 409);
        }

        const quantidade = reserva.assentosAtuais.length;

        if (quantidade === 0) {
            throw erro(CODIGOS_ERRO.RESERVA_SEM_ASSENTOS, "A reserva não possui assentos vendidos.", 409);
        }

        const resultado = await reservasRepository.liberarAssentos(tx, sessaoId, id);

        if (resultado.count !== quantidade) {
            throw erro(CODIGOS_ERRO.ESTADO_INCONSISTENTE, "Não foi possível liberar todos os assentos.", 409);
        }

        await reservasRepository.marcarCancelada(tx, id);

        await reservasRepository.incrementarVersaoSessao(tx, sessaoId
        );
    });
}