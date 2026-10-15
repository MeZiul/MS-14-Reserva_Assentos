import { bloqueiosRepository } from "../repositories/index.js";

import { assentoDisponivel, selecionarEspecificos, selecionarAdjacentes } from "../utils/bloqueio.utils.js";

import { erroNegocio, conflitoAssentos } from "../utils/errors/bloqueios.errors.js";

function validarSessaoParaVenda(sessao) {
  if (!sessao) {
    throw erroNegocio("SESSAO_NAO_ENCONTRADA", "Sessão não encontrada.", 404);
  }

  if (sessao.situacao !== "VENDAS_ABERTAS") {
    throw erroNegocio("SESSAO_INDISPONIVEL", "A sessão não está disponível para vendas.", 409);
  }

  if (sessao.inicioEm <= new Date()) {
    throw erroNegocio("SESSAO_INICIADA", "A sessão já foi iniciada.", 409);
  }
}

function montarDisponibilidade(sessao, assentos, agora) {
  const setores = new Map();

  for (const item of assentos) {
    const setor = item.assento.setor;

    if (!setores.has(setor.id)) {
      const faixa = sessao.faixas.find(
        (preco) => preco.setorId === setor.id
      );

      setores.set(setor.id, {
        setorId: setor.id,
        nome: setor.nome,
        preco: faixa ? Number(faixa.valor) : null,
        assentos: []
      });
    }

    setores.get(setor.id).assentos.push({
      id: item.assentoId,
      fileira: item.assento.fileira,
      numero: item.assento.numero,
      x: item.assento.x,
      y: item.assento.y,
      atributo: item.assento.atributo,
      ordemNaFileira: item.assento.ordemNaFileira,
      estado: assentoDisponivel(item, agora)
        ? "LIVRE"
        : item.estado
    });
  }

  return {
    sessaoId: sessao.id,
    situacao: sessao.situacao,
    mapaId: sessao.mapaId,
    setores: [...setores.values()]
  };
}

export async function consultarDisponibilidade(sessaoId) {
  return bloqueiosRepository.executarTransacao(async (tx) => {
    const existe = await bloqueiosRepository.bloquearSessao(tx, sessaoId);

    if (!existe) {
      throw erroNegocio("SESSAO_NAO_ENCONTRADA", "Sessão não encontrada.", 404);
    }

    const sessao = await bloqueiosRepository.buscarSessao(tx, sessaoId);

    const agora = new Date();

    await bloqueiosRepository.liberarExpirados(tx, sessaoId, agora);

    const assentos = await bloqueiosRepository.listarAssentos(tx, sessaoId);

    return montarDisponibilidade(sessao, assentos, agora);
  });
}

export async function criarBloqueio(sessaoId, compradorId, dados) {
  return bloqueiosRepository.executarTransacao(async (tx) => {
    const existe = await bloqueiosRepository.bloquearSessao(tx, sessaoId);

    if (!existe) {
      throw erroNegocio("SESSAO_NAO_ENCONTRADA", "Sessão não encontrada.", 404);
    }

    const sessao = await bloqueiosRepository.buscarSessao(tx, sessaoId);

    validarSessaoParaVenda(sessao);

    const agora = new Date();

    await bloqueiosRepository.liberarExpirados(tx, sessaoId, agora);

    const assentos = await bloqueiosRepository.listarAssentos(tx, sessaoId);

    let assentosIds;

    if ("assentosIds" in dados) {
      assentosIds = selecionarEspecificos(assentos, dados.assentosIds, agora);
    } else {
      const setorExiste = sessao.faixas.some((faixa) => faixa.setorId === dados.setorId);

      if (!setorExiste) {
        throw erroNegocio("SETOR_INVALIDO", "Setor não pertence à sessão.", 422);
      }

      assentosIds = selecionarAdjacentes(assentos, dados.quantidade, dados.setorId, agora);
    }

    assentosIds.sort();

    const expiraEm = new Date(
      agora.getTime() +
      sessao.prazoBloqueioSegundos * 1000
    );

    const bloqueio = await bloqueiosRepository.criar(tx, {
      sessaoId,
      compradorId,
      expiraEm
    });

    const afetados = await bloqueiosRepository.marcarAssentos(tx, sessaoId, assentosIds, bloqueio.id);

    if (afetados !== assentosIds.length) {
      conflitoAssentos(assentosIds);
    }

    await tx.sessao.update({
      where: { id: sessaoId },
      data: {
        versao: { increment: 1 }
      }
    });

    return {
      id: bloqueio.id,
      sessaoId,
      situacao: bloqueio.situacao,
      assentos: assentosIds,
      expiraEm
    };
  });
}
