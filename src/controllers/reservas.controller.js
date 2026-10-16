import { confirmarReserva, consultarReserva, cancelarReserva } from "../services/reservas.service.js";

export async function confirmarReservaController(req, res, next) {
    try {
        const resultado = await confirmarReserva(req.validated.params.id, req.compradorId, req.validated.body, req.validated.headers["idempotency-key"]);

        return res.status(200).json(resultado);
    } catch (error) {
        next(error);
    }
}

export async function consultarReservaController(req, res, next) {
    try {
        const resultado = await consultarReserva(req.validated.params.id, req.compradorId);

        return res.status(200).json(resultado);
    } catch (error) {
        next(error);
    }
}

export async function cancelarReservaController(req, res, next) {
    try {
        await cancelarReserva(req.validated.params.id, req.compradorId);

        return res.status(204).send();
    } catch (error) {
        next(error);
    }
}
