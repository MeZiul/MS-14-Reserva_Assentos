// Extensao pequena, mantida em modulo proprio para futuros casos de uso.
export async function inicializarAssentos(tx, sessaoId, ids) {
  if (!ids.length) throw new Error('Mapa sem assentos.');
  const resultado = await tx.assentoSessao.createMany({
    data: ids.map((assentoId) => ({ sessaoId, assentoId, estado: 'LIVRE' })),
  });
  if (resultado.count !== ids.length) throw new Error('Falha ao inicializar assentos.');
}
