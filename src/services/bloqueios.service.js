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

    const expiraEm = new Date(agora.getTime() + sessao.prazoBloqueioSegundos * 1000);

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

function erroBloqueio(codigo, mensagem, status) {
  return erroNegocio(codigo, mensagem, status);
}

function montarRespostaBloqueio(bloqueio) {
  const agora = Date.now();

  const segundosRestantes = bloqueio.situacao === "ATIVO" ? Math.max(0, Math.ceil((bloqueio.expiraEm.getTime() - agora) / 1000)) : 0;

  return {
    id: bloqueio.id,
    sessaoId: bloqueio.sessaoId,
    situacao: bloqueio.situacao,
    criadoEm: bloqueio.criadoEm,
    expiraEm: bloqueio.expiraEm,
    segundosRestantes,
    prorrogacoes: bloqueio.prorrogacoes,
    maxProrrogacoes: bloqueio.sessao.maxProrrogacoes,
    assentos: bloqueio.assentosAtuais.map((item) => ({
      id: item.assentoId,
      setorId: item.assento.setorId,
      fileira: item.assento.fileira,
      numero: item.assento.numero
    }))
  };
}

function verificarResultadoOperacao(resultado) {
  if (resultado.erro) {
    throw erroBloqueio(resultado.erro, resultado.mensagem, resultado.status);
  }

  return resultado.dados;
}

// Consulta individual do bloqueio
export async function consultarBloqueio(bloqueioId, compradorId) {
  const resultado = await bloqueiosRepository.executarTransacao(async (tx) => {
    const identificacao = await bloqueiosRepository.buscarIdentificacaoBloqueio(tx, bloqueioId, compradorId);

    if (!identificacao) {
      return { erro: "BLOQUEIO_NAO_ENCONTRADO", mensagem: "Bloqueio não encontrado.", status: 404 };
    }

    await bloqueiosRepository.bloquearSessao(tx, identificacao.sessaoId);

    // Expira bloqueios vencidos antes da consulta.
    await bloqueiosRepository.liberarExpirados(tx, identificacao.sessaoId, new Date());

    const bloqueio = await bloqueiosRepository.buscarBloqueioComSessao(tx, bloqueioId, compradorId);

    return {
      dados: montarRespostaBloqueio(bloqueio)
    };
  });

  return verificarResultadoOperacao(resultado);
}

// Prorroga um bloqueio ativo
export async function prorrogarBloqueio(bloqueioId, compradorId) {
  const resultado = await bloqueiosRepository.executarTransacao(async (tx) => {
    const identificacao = await bloqueiosRepository.buscarIdentificacaoBloqueio(tx, bloqueioId, compradorId);

    if (!identificacao) {
      return { erro: "BLOQUEIO_NAO_ENCONTRADO", mensagem: "Bloqueio não encontrado.", status: 404 };
    }

    await bloqueiosRepository.bloquearSessao(tx, identificacao.sessaoId);

    const agora = new Date();

    await bloqueiosRepository.liberarExpirados(tx, identificacao.sessaoId, agora);

    const bloqueio = await bloqueiosRepository.buscarBloqueioComSessao(tx, bloqueioId, compradorId);

    if (bloqueio.situacao === "EXPIRADO") {
      return { erro: "BLOQUEIO_EXPIRADO", mensagem: "O bloqueio já expirou.", status: 410 };
    }

    if (bloqueio.situacao !== "ATIVO") {
      return { erro: "BLOQUEIO_INDISPONIVEL", mensagem: "O bloqueio não está ativo.", status: 409 };
    }

    if (bloqueio.prorrogacoes >= bloqueio.sessao.maxProrrogacoes) {
      return { erro: "LIMITE_PRORROGACOES", mensagem: "Limite de prorrogações atingido.", status: 409 };
    }

    if (bloqueio.sessao.situacao !== "VENDAS_ABERTAS" || bloqueio.sessao.inicioEm <= agora) {
      return { erro: "SESSAO_INDISPONIVEL", mensagem: "A sessão não permite prorrogação.", status: 409 };
    }

    const novaExpiracao = new Date(bloqueio.expiraEm.getTime() + bloqueio.sessao.prazoBloqueioSegundos * 1000);

    if (novaExpiracao >= bloqueio.sessao.inicioEm) {
      return { erro: "PRAZO_INVALIDO", mensagem: "A prorrogação ultrapassa o início da sessão.", status: 409 };
    }

    await bloqueiosRepository.atualizarProrrogacao(tx, bloqueioId, novaExpiracao);

    const atualizado = await bloqueiosRepository.buscarBloqueioComSessao(tx, bloqueioId, compradorId);

    return {
      dados: montarRespostaBloqueio(atualizado)
    };
  });

  return verificarResultadoOperacao(resultado);
}

// Libera antecipadamente os assentos de um bloqueio
export async function liberarBloqueio(bloqueioId, compradorId) {
  const resultado = await bloqueiosRepository.executarTransacao(async (tx) => {
    const identificacao = await bloqueiosRepository.buscarIdentificacaoBloqueio(tx, bloqueioId, compradorId);

    if (!identificacao) {
      return { erro: "BLOQUEIO_NAO_ENCONTRADO", mensagem: "Bloqueio não encontrado.", status: 404 };
    }

    await bloqueiosRepository.bloquearSessao(tx, identificacao.sessaoId);

    await bloqueiosRepository.liberarExpirados(tx, identificacao.sessaoId, new Date());

    const bloqueio = await bloqueiosRepository.buscarBloqueioComSessao(tx, bloqueioId, compradorId);

    if (bloqueio.situacao === "EXPIRADO") {
      return { erro: "BLOQUEIO_EXPIRADO", mensagem: "O bloqueio já expirou.", status: 410 };
    }

    if (bloqueio.situacao !== "ATIVO") {
      return { erro: "BLOQUEIO_INDISPONIVEL", mensagem: "O bloqueio não pode ser liberado.", status: 409 };
    }

    const quantidade = bloqueio.assentosAtuais.length;

    if (quantidade === 0) {
      return { erro: "BLOQUEIO_SEM_ASSENTOS", mensagem: "Nenhum assento vinculado ao bloqueio.", status: 409 };
    }

    // Valida a consistência antes da operação.
    const inconsistentes = bloqueio.assentosAtuais.some((item) => item.estado !== "BLOQUEADO" || item.bloqueioAtualId !== bloqueioId);

    if (inconsistentes) {
      return { erro: "ESTADO_INCONSISTENTE", mensagem: "Assentos com estado inconsistente.", status: 409 };
    }

    const liberados = await bloqueiosRepository.liberarAssentosDoBloqueio(tx, identificacao.sessaoId, bloqueioId);

    if (liberados.count !== quantidade) {
      // Cessa a transação.
      throw erroBloqueio("CONFLITO_ASSENTOS", "Não foi possível liberar todos os assentos.", 409);
    }

    await bloqueiosRepository.marcarLiberado(tx, bloqueioId);

    await bloqueiosRepository.incrementarVersaoSessao(tx, identificacao.sessaoId);

    return { dados: null };
  });

  return verificarResultadoOperacao(resultado);
}