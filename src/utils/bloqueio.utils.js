import { conflitoAssentos } from "./errors/bloqueios.errors.js";
import { ESTADO_ASSENTO } from "../constants/seat-status.js";
import { SITUACAO_BLOQUEIO } from "../constants/lock-status.js";

export function assentoDisponivel(item, agora) {
    if (item.estado === ESTADO_ASSENTO.VENDIDO) return false;

    if (item.estado === ESTADO_ASSENTO.LIVRE && !item.bloqueioAtualId) {
        return true;
    }

    if (item.estado === ESTADO_ASSENTO.BLOQUEADO && item.bloqueioAtual?.situacao === SITUACAO_BLOQUEIO.ATIVO && item.bloqueioAtual.expiraEm <= agora) {
        return true;
    }

    return false;
}

export function selecionarEspecificos(assentos, ids, agora) {
    const porId = new Map(
        assentos.map((item) => [item.assentoId, item])
    );

    const conflitos = ids.filter((id) => {
        const item = porId.get(id);

        return !item || !assentoDisponivel(item, agora);
    });

    if (conflitos.length > 0) {
        conflitoAssentos(conflitos);
    }

    return [...ids];
}

export function selecionarAdjacentes(assentos, quantidade, setorId, agora) {
    const candidatos = assentos.filter((item) => item.assento.setorId === setorId);

    const fileiras = new Map();

    for (const item of candidatos) {
        const chave = item.assento.fileira;

        if (!fileiras.has(chave)) {
            fileiras.set(chave, []);
        }

        fileiras.get(chave).push(item);
    }

    for (const nome of [...fileiras.keys()].sort()) {
        const fileira = fileiras.get(nome);

        fileira.sort((a, b) =>
            a.assento.ordemNaFileira -
            b.assento.ordemNaFileira
        );

        let sequencia = [];

        for (const item of fileira) {
            const atual = item.assento;
            const anterior = sequencia.at(-1)?.assento;

            const elegivel = atual.atributo === "PADRAO" && atual.grupoContiguo != null && assentoDisponivel(item, agora);

            if (!elegivel) {
                sequencia = [];
                continue;
            }

            const consecutivo = !anterior ||
                (
                    atual.grupoContiguo === anterior.grupoContiguo &&
                    atual.ordemNaFileira ===
                    anterior.ordemNaFileira + 1
                );

            if (!consecutivo) {
                sequencia = [];
            }

            sequencia.push(item);

            if (sequencia.length === quantidade) {
                return sequencia.map((assento) => assento.assentoId);
            }
        }
    }

    conflitoAssentos();
}
