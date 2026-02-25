/**
 * Sistema avançado de análise cruzada de documentos
 * Implementa regras de cruzamento com scoring ponderado e níveis de confiança
 */

import { compararValoresMonetarios, compararSaldosBancarios } from './financialComparison';
import { compararTextos, normalizarEndereco } from './textNormalization';
import logger, { LogCategory } from './logger';

/**
 * Pesos por categoria de regra (total = 100)
 */
const PESOS_REGRAS = {
  balancete_vs_extratos: 25,
  contrato_vs_socios: 15,
  consistencia_cadastral: 20,
  coerencia_temporal: 10,
  enderecos_vs_cadastro: 10,
  mutuo_vs_iof: 10,
  capital_social: 10
};

/**
 * Níveis de confiança da análise
 */
export const NivelConfianca = {
  ALTO: 'alto',
  MEDIO: 'medio',
  BAIXO: 'baixo'
};

/**
 * Executa análise cruzada completa com scoring ponderado
 */
export const executarAnaliseCruzadaCompleta = async (documentos, cliente = {}) => {
  const startTime = performance.now();
  const resultados = [];

  try {
    logger.logAnalise('analise_cruzada_iniciada', {
      documentosCount: documentos.length,
      clienteId: cliente.id
    });

    // Executa todas as regras
    const regras = [
      { fn: analisarBalanceteVsExtratos, args: [documentos] },
      { fn: analisarContratoVsSocios, args: [documentos] },
      { fn: analisarConsistenciaCadastral, args: [documentos] },
      { fn: analisarCoerenciaTemporal, args: [documentos] },
      { fn: analisarEnderecosVsCadastro, args: [documentos, cliente] },
      { fn: analisarMutuoVsIOF, args: [documentos] },
      { fn: analisarCapitalSocial, args: [documentos] },
      { fn: analisarDREvsBalancete, args: [documentos] },
      { fn: analisarExtratosVsPeriodo, args: [documentos] }
    ];

    for (const { fn, args } of regras) {
      try {
        const resultado = fn(...args);
        if (resultado) resultados.push(resultado);
      } catch (err) {
        logger.error(LogCategory.ANALISE, `Erro na regra ${fn.name}`, err);
      }
    }

    const duration = performance.now() - startTime;
    const inconsistenciasCriticas = resultados.filter(r => r.nivel === 'critico' && !r.passou).length;
    const inconsistenciasAltas = resultados.filter(r => r.nivel === 'alto' && !r.passou).length;

    // Calcula score ponderado
    const score = calcularScorePonderado(resultados);
    const confianca = calcularConfiancaGeral(resultados, documentos);

    logger.logAnalise('analise_cruzada_concluida', {
      documentosCount: documentos.length,
      regrasExecutadas: resultados.length,
      inconsistenciasCriticas,
      inconsistenciasAltas,
      score,
      confianca,
      duracao: duration
    });

    return {
      resultados,
      resumo: {
        total_regras: resultados.length,
        regras_passadas: resultados.filter(r => r.passou).length,
        inconsistencias_criticas: inconsistenciasCriticas,
        inconsistencias_altas: inconsistenciasAltas,
        score,
        confianca,
        categorias: gerarResumoPorCategoria(resultados)
      },
      duracao: duration,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error(LogCategory.ANALISE, 'Erro na análise cruzada', error);
    throw error;
  }
};

/**
 * 1. Balancete vs. Extratos Bancários
 */
const analisarBalanceteVsExtratos = (documentos) => {
  const balancete = documentos.find(d =>
    d.tipo_documento?.includes('balancete') && d.dados_extraidos?.total_caixa !== undefined
  );

  const extratos = documentos.filter(d =>
    d.tipo_documento?.includes('extrato') && d.dados_extraidos?.saldo_final !== undefined
  );

  if (!balancete || extratos.length === 0) return null;

  const saldoBalancete = balancete.dados_extraidos.total_caixa;
  const somaExtratos = extratos.reduce((sum, e) => sum + (e.dados_extraidos.saldo_final || 0), 0);
  const comparacao = compararSaldosBancarios(saldoBalancete, somaExtratos);

  const discrepancias = [];
  if (!comparacao.dentroTolerancia) {
    discrepancias.push({
      tipo: 'saldo_divergente',
      saldoBalancete,
      somaExtratos,
      diferenca: comparacao.diferencaAbsoluta,
      diferencaPercentual: comparacao.diferencaPercentual,
      mensagem: comparacao.mensagem
    });
  }

  // Verificação adicional: analisa cada extrato individualmente
  extratos.forEach((extrato, idx) => {
    if (extrato.dados_extraidos?.saldo_final < 0) {
      discrepancias.push({
        tipo: 'saldo_negativo',
        banco: extrato.dados_extraidos?.banco || `Conta ${idx + 1}`,
        saldo: extrato.dados_extraidos.saldo_final,
        mensagem: `Saldo negativo na ${extrato.dados_extraidos?.banco || `Conta ${idx + 1}`}: R$ ${extrato.dados_extraidos.saldo_final.toFixed(2)}`
      });
    }
  });

  const confianca = extratos.every(e => e.dados_extraidos?.saldo_final !== undefined)
    ? NivelConfianca.ALTO : NivelConfianca.MEDIO;

  return {
    regra: 'balancete_vs_extratos',
    nome: 'Balancete vs. Extratos Bancários',
    descricao: 'Verifica se os saldos de caixa/bancos do balancete correspondem aos extratos bancários',
    nivel: 'critico',
    passou: discrepancias.length === 0,
    confianca,
    documentos_analisados: [balancete.id, ...extratos.map(e => e.id)],
    detalhes: { saldoBalancete, somaExtratos, quantidadeExtratos: extratos.length, comparacao },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Reconcilie os saldos entre balancete e extratos bancários. Verifique se todos os extratos do período foram incluídos.'
      : null
  };
};

/**
 * 2. Contrato Social vs. Documentos de Identificação dos Sócios
 */
const analisarContratoVsSocios = (documentos) => {
  const contratoSocial = documentos.find(d =>
    d.tipo_documento === 'contrato_social' && d.dados_extraidos?.socios
  );

  const docsIdentificacao = documentos.filter(d =>
    (d.tipo_documento === 'documento_identificacao_responsavel' ||
     d.tipo_documento === 'documento_identificacao_procurador') &&
    d.dados_extraidos?.nome && d.dados_extraidos?.cpf
  );

  if (!contratoSocial || docsIdentificacao.length === 0) return null;

  const socios = contratoSocial.dados_extraidos.socios;
  const discrepancias = [];

  socios.forEach((socio) => {
    const docCorrespondente = docsIdentificacao.find(doc => {
      const comparacaoNome = compararTextos(socio.nome, doc.dados_extraidos.nome);
      const cpfMatch = socio.cpf && doc.dados_extraidos.cpf &&
                       socio.cpf.replace(/\D/g, '') === doc.dados_extraidos.cpf.replace(/\D/g, '');
      return comparacaoNome.altaSimilaridade || cpfMatch;
    });

    if (!docCorrespondente) {
      discrepancias.push({
        tipo: 'socio_sem_documento',
        socio: socio.nome,
        cpf: socio.cpf,
        mensagem: `Sócio "${socio.nome}" não possui documento de identificação correspondente`
      });
    } else {
      if (socio.cpf && docCorrespondente.dados_extraidos.cpf) {
        const cpf1 = socio.cpf.replace(/\D/g, '');
        const cpf2 = docCorrespondente.dados_extraidos.cpf.replace(/\D/g, '');
        if (cpf1 !== cpf2) {
          discrepancias.push({
            tipo: 'cpf_divergente',
            socio: socio.nome,
            cpfContrato: socio.cpf,
            cpfDocumento: docCorrespondente.dados_extraidos.cpf,
            mensagem: `CPF divergente para sócio "${socio.nome}"`
          });
        }
      }

      const comparacaoNome = compararTextos(socio.nome, docCorrespondente.dados_extraidos.nome);
      if (!comparacaoNome.saoIguais && !comparacaoNome.altaSimilaridade) {
        discrepancias.push({
          tipo: 'nome_divergente',
          nomeContrato: socio.nome,
          nomeDocumento: docCorrespondente.dados_extraidos.nome,
          similaridade: comparacaoNome.similaridade,
          mensagem: `Nome divergente: "${socio.nome}" vs "${docCorrespondente.dados_extraidos.nome}"`
        });
      }
    }
  });

  return {
    regra: 'contrato_vs_socios',
    nome: 'Contrato Social vs. Documentos de Identificação',
    descricao: 'Verifica se os dados dos sócios no contrato correspondem aos documentos de identificação',
    nivel: 'critico',
    passou: discrepancias.length === 0,
    confianca: NivelConfianca.ALTO,
    documentos_analisados: [contratoSocial.id, ...docsIdentificacao.map(d => d.id)],
    detalhes: { totalSocios: socios.length, documentosIdentificacao: docsIdentificacao.length },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique se todos os sócios possuem documentos de identificação válidos e se os dados correspondem ao contrato social.'
      : null
  };
};

/**
 * 3. Consistência Cadastral - CNPJ/Razão Social entre todos os documentos
 */
const analisarConsistenciaCadastral = (documentos) => {
  const docsComCNPJ = documentos.filter(d => d.dados_extraidos?.cnpj);
  if (docsComCNPJ.length < 2) return null;

  const cnpjReferencia = docsComCNPJ[0].dados_extraidos.cnpj.replace(/\D/g, '');
  const razaoSocialReferencia = docsComCNPJ[0].dados_extraidos.razao_social;
  const discrepancias = [];

  docsComCNPJ.forEach((doc, idx) => {
    if (idx === 0) return;
    const cnpjDoc = doc.dados_extraidos.cnpj.replace(/\D/g, '');
    if (cnpjDoc !== cnpjReferencia) {
      discrepancias.push({
        tipo: 'cnpj_divergente',
        documentoId: doc.id,
        tipoDocumento: doc.tipo_documento,
        cnpjEsperado: cnpjReferencia,
        cnpjEncontrado: cnpjDoc,
        mensagem: `CNPJ divergente no documento ${doc.tipo_documento}`
      });
    }

    if (doc.dados_extraidos.razao_social && razaoSocialReferencia) {
      const comparacao = compararTextos(razaoSocialReferencia, doc.dados_extraidos.razao_social);
      if (!comparacao.saoIguais && !comparacao.altaSimilaridade) {
        discrepancias.push({
          tipo: 'razao_social_divergente',
          documentoId: doc.id,
          tipoDocumento: doc.tipo_documento,
          razaoSocialEsperada: razaoSocialReferencia,
          razaoSocialEncontrada: doc.dados_extraidos.razao_social,
          similaridade: comparacao.similaridade,
          mensagem: `Razão Social divergente no documento ${doc.tipo_documento}`
        });
      }
    }
  });

  return {
    regra: 'consistencia_cadastral',
    nome: 'Consistência Cadastral (CNPJ/Razão Social)',
    descricao: 'Verifica se CNPJ e Razão Social são idênticos em todos os documentos',
    nivel: 'critico',
    passou: discrepancias.length === 0,
    confianca: NivelConfianca.ALTO,
    documentos_analisados: docsComCNPJ.map(d => d.id),
    detalhes: { cnpjReferencia, razaoSocialReferencia, documentosAnalisados: docsComCNPJ.length },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique se todos os documentos pertencem à mesma empresa. Atualize documentos com dados cadastrais divergentes.'
      : null
  };
};

/**
 * 4. Coerência Temporal
 */
const analisarCoerenciaTemporal = (documentos) => {
  const docsComData = documentos.filter(d =>
    d.data_documento || d.dados_extraidos?.data_emissao || d.dados_extraidos?.data_referencia
  );

  if (docsComData.length < 2) return null;

  const discrepancias = [];
  const hoje = new Date();

  docsComData.forEach(doc => {
    const dataDoc = new Date(doc.data_documento || doc.dados_extraidos?.data_emissao || doc.dados_extraidos?.data_referencia);

    if (dataDoc > hoje) {
      discrepancias.push({
        tipo: 'data_futura',
        documentoId: doc.id,
        tipoDocumento: doc.tipo_documento,
        data: dataDoc.toISOString(),
        mensagem: `Documento com data futura: ${doc.tipo_documento}`
      });
    }

    const diferencaAnos = (hoje - dataDoc) / (1000 * 60 * 60 * 24 * 365);
    if (diferencaAnos > 5) {
      discrepancias.push({
        tipo: 'documento_muito_antigo',
        documentoId: doc.id,
        tipoDocumento: doc.tipo_documento,
        data: dataDoc.toISOString(),
        anos: Math.floor(diferencaAnos),
        mensagem: `Documento muito antigo (${Math.floor(diferencaAnos)} anos): ${doc.tipo_documento}`
      });
    }

    // Nova regra: extratos devem cobrir últimos 3 meses
    if (doc.tipo_documento?.includes('extrato')) {
      const diferencaDias = (hoje - dataDoc) / (1000 * 60 * 60 * 24);
      if (diferencaDias > 120) {
        discrepancias.push({
          tipo: 'extrato_desatualizado',
          documentoId: doc.id,
          tipoDocumento: doc.tipo_documento,
          diasDesatualizado: Math.floor(diferencaDias),
          mensagem: `Extrato com mais de 4 meses (${Math.floor(diferencaDias)} dias)`
        });
      }
    }
  });

  return {
    regra: 'coerencia_temporal',
    nome: 'Coerência Temporal',
    descricao: 'Valida se as datas dos documentos são coerentes e estão dentro do período esperado',
    nivel: 'alto',
    passou: discrepancias.length === 0,
    confianca: docsComData.length >= documentos.length * 0.7 ? NivelConfianca.ALTO : NivelConfianca.MEDIO,
    documentos_analisados: docsComData.map(d => d.id),
    detalhes: { documentosAnalisados: docsComData.length },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique as datas dos documentos e solicite versões mais recentes quando necessário.'
      : null
  };
};

/**
 * 5. Endereços vs. Cadastro
 */
const analisarEnderecosVsCadastro = (documentos, cliente) => {
  const comprovantesEndereco = documentos.filter(d =>
    (d.tipo_documento === 'conta_energia' ||
     d.tipo_documento === 'guia_iptu' ||
     d.tipo_documento === 'contrato_locacao') &&
    d.dados_extraidos?.endereco
  );

  const contratoSocial = documentos.find(d =>
    d.tipo_documento === 'contrato_social' && d.dados_extraidos?.endereco
  );

  if (comprovantesEndereco.length === 0) return null;

  const enderecoReferencia = contratoSocial?.dados_extraidos?.endereco || cliente.endereco;
  if (!enderecoReferencia) return null;

  const discrepancias = [];

  comprovantesEndereco.forEach(doc => {
    const enderecoDoc = doc.dados_extraidos.endereco;
    const comparacao = compararTextos(
      normalizarEndereco(enderecoReferencia),
      normalizarEndereco(enderecoDoc)
    );

    if (!comparacao.saoIguais && !comparacao.altaSimilaridade) {
      discrepancias.push({
        tipo: 'endereco_divergente',
        documentoId: doc.id,
        tipoDocumento: doc.tipo_documento,
        enderecoEsperado: enderecoReferencia,
        enderecoEncontrado: enderecoDoc,
        similaridade: comparacao.similaridade,
        mensagem: `Endereço divergente no documento ${doc.tipo_documento}`
      });
    }
  });

  return {
    regra: 'enderecos_vs_cadastro',
    nome: 'Comprovantes de Endereço vs. Cadastro',
    descricao: 'Confirma se os endereços nos comprovantes coincidem com o cadastro da empresa',
    nivel: 'alto',
    passou: discrepancias.length === 0,
    confianca: NivelConfianca.MEDIO,
    documentos_analisados: comprovantesEndereco.map(d => d.id),
    detalhes: { enderecoReferencia, comprovantesAnalisados: comprovantesEndereco.length },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique se os comprovantes de endereço correspondem ao endereço cadastral da empresa.'
      : null
  };
};

/**
 * 6. Contrato de Mútuo vs. IOF
 */
const analisarMutuoVsIOF = (documentos) => {
  const contratoMutuo = documentos.find(d =>
    d.tipo_documento === 'contrato_mutuo' && d.dados_extraidos?.valor
  );

  const comprovanteIOF = documentos.find(d =>
    d.tipo_documento === 'comprovante_iof' && d.dados_extraidos?.valor_pago
  );

  if (!contratoMutuo) return null;

  const discrepancias = [];

  if (!comprovanteIOF) {
    discrepancias.push({
      tipo: 'iof_ausente',
      mensagem: 'Contrato de mútuo presente mas comprovante de IOF não encontrado'
    });
  } else {
    const valorIOF = comprovanteIOF.dados_extraidos.valor_pago;
    if (valorIOF <= 0) {
      discrepancias.push({
        tipo: 'iof_zerado',
        valorMutuo: contratoMutuo.dados_extraidos.valor,
        valorIOF,
        mensagem: 'IOF recolhido com valor zero ou negativo'
      });
    }
  }

  return {
    regra: 'mutuo_vs_iof',
    nome: 'Contrato de Mútuo vs. IOF',
    descricao: 'Valida se há recolhimento adequado de IOF para contratos de mútuo',
    nivel: 'critico',
    passou: discrepancias.length === 0,
    confianca: NivelConfianca.ALTO,
    documentos_analisados: [contratoMutuo.id, comprovanteIOF?.id].filter(Boolean),
    detalhes: {
      valorMutuo: contratoMutuo.dados_extraidos.valor,
      valorIOF: comprovanteIOF?.dados_extraidos?.valor_pago
    },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique se o IOF foi recolhido corretamente para o contrato de mútuo.'
      : null
  };
};

/**
 * 7. Capital Social (Contrato vs. Balanço)
 */
const analisarCapitalSocial = (documentos) => {
  const contratoSocial = documentos.find(d =>
    d.tipo_documento === 'contrato_social' && d.dados_extraidos?.capital_social
  );

  const balanco = documentos.find(d =>
    (d.tipo_documento === 'balanco_patrimonial_integralizacao' ||
     d.tipo_documento === 'balancete_verificacao') &&
    d.dados_extraidos?.capital_social
  );

  if (!contratoSocial || !balanco) return null;

  const capitalContrato = contratoSocial.dados_extraidos.capital_social;
  const capitalBalanco = balanco.dados_extraidos.capital_social;
  const comparacao = compararValoresMonetarios(capitalContrato, capitalBalanco, 0.01);

  const discrepancias = [];
  if (!comparacao.dentroTolerancia) {
    discrepancias.push({
      tipo: 'capital_social_divergente',
      capitalContrato,
      capitalBalanco,
      diferenca: comparacao.diferencaAbsoluta,
      diferencaPercentual: comparacao.diferencaPercentual,
      mensagem: comparacao.mensagem
    });
  }

  if (capitalBalanco < capitalContrato * 0.95) {
    discrepancias.push({
      tipo: 'descapitalizacao',
      capitalContrato,
      capitalBalanco,
      percentual: ((1 - capitalBalanco / capitalContrato) * 100).toFixed(1),
      mensagem: `Possível descapitalização de ${((1 - capitalBalanco / capitalContrato) * 100).toFixed(1)}%`
    });
  }

  return {
    regra: 'capital_social',
    nome: 'Capital Social (Contrato vs. Balanço)',
    descricao: 'Verifica se o capital social integralizado no balanço corresponde ao contrato social',
    nivel: 'alto',
    passou: discrepancias.length === 0,
    confianca: NivelConfianca.ALTO,
    documentos_analisados: [contratoSocial.id, balanco.id],
    detalhes: { capitalContrato, capitalBalanco, comparacao },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique se o capital social foi integralizado corretamente. Descapitalização pode indicar irregularidade.'
      : null
  };
};

/**
 * 8. NOVA REGRA: DRE vs Balancete - Coerência de receitas
 */
const analisarDREvsBalancete = (documentos) => {
  const dre = documentos.find(d =>
    d.tipo_documento?.includes('dre') && d.dados_extraidos?.receita_bruta !== undefined
  );
  const balancete = documentos.find(d =>
    d.tipo_documento?.includes('balancete') && d.dados_extraidos?.receita_bruta !== undefined
  );

  if (!dre || !balancete) return null;

  const discrepancias = [];
  const receitaDRE = dre.dados_extraidos.receita_bruta;
  const receitaBalancete = balancete.dados_extraidos.receita_bruta;

  const comparacao = compararValoresMonetarios(receitaDRE, receitaBalancete, 0.02);
  if (!comparacao.dentroTolerancia) {
    discrepancias.push({
      tipo: 'receita_divergente',
      receitaDRE,
      receitaBalancete,
      diferenca: comparacao.diferencaAbsoluta,
      mensagem: `Receita bruta divergente entre DRE (R$ ${receitaDRE.toFixed(2)}) e Balancete (R$ ${receitaBalancete.toFixed(2)})`
    });
  }

  return {
    regra: 'dre_vs_balancete',
    nome: 'DRE vs. Balancete',
    descricao: 'Verifica coerência de receitas entre DRE e Balancete',
    nivel: 'alto',
    passou: discrepancias.length === 0,
    confianca: NivelConfianca.ALTO,
    documentos_analisados: [dre.id, balancete.id],
    detalhes: { receitaDRE, receitaBalancete },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique se DRE e Balancete referem-se ao mesmo período e se os valores estão corretos.'
      : null
  };
};

/**
 * 9. NOVA REGRA: Extratos vs Período exigido
 */
const analisarExtratosVsPeriodo = (documentos) => {
  const extratos = documentos.filter(d =>
    d.tipo_documento?.includes('extrato') &&
    (d.dados_extraidos?.periodo_inicio || d.dados_extraidos?.data_referencia)
  );

  if (extratos.length === 0) return null;

  const discrepancias = [];
  const hoje = new Date();
  const tresMesesAtras = new Date(hoje);
  tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

  // Agrupa extratos por banco
  const bancosCobridos = {};
  extratos.forEach(e => {
    const banco = e.dados_extraidos?.banco || 'desconhecido';
    if (!bancosCobridos[banco]) bancosCobridos[banco] = [];
    bancosCobridos[banco].push(e);
  });

  // Verifica se cada banco tem cobertura de 3 meses
  Object.entries(bancosCobridos).forEach(([banco, docs]) => {
    if (docs.length < 3) {
      discrepancias.push({
        tipo: 'cobertura_insuficiente',
        banco,
        mesesEncontrados: docs.length,
        mesesExigidos: 3,
        mensagem: `${banco}: apenas ${docs.length} extrato(s) de 3 exigidos`
      });
    }
  });

  return {
    regra: 'extratos_vs_periodo',
    nome: 'Cobertura de Extratos Bancários',
    descricao: 'Verifica se extratos cobrem período mínimo de 3 meses',
    nivel: 'alto',
    passou: discrepancias.length === 0,
    confianca: extratos.every(e => e.dados_extraidos?.banco) ? NivelConfianca.ALTO : NivelConfianca.BAIXO,
    documentos_analisados: extratos.map(e => e.id),
    detalhes: { totalExtratos: extratos.length, bancos: Object.keys(bancosCobridos) },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Forneça extratos bancários de todos os bancos cobrindo os últimos 3 meses.'
      : null
  };
};

/**
 * Score ponderado por importância das regras
 */
const calcularScorePonderado = (resultados) => {
  if (resultados.length === 0) return 100;

  let pesoTotal = 0;
  let scoreAcumulado = 0;

  resultados.forEach(r => {
    const peso = PESOS_REGRAS[r.regra] || 5;
    pesoTotal += peso;

    if (r.passou) {
      scoreAcumulado += peso;
    } else {
      // Penalidade parcial baseada na severidade
      const numDiscrepancias = r.discrepancias?.length || 1;
      const penalidade = r.nivel === 'critico' ? 1.0 : r.nivel === 'alto' ? 0.7 : 0.4;
      const perda = Math.min(penalidade * numDiscrepancias, 1.0);
      scoreAcumulado += peso * (1 - perda);
    }
  });

  return pesoTotal > 0 ? Math.round((scoreAcumulado / pesoTotal) * 100) : 100;
};

/**
 * Calcula nível de confiança geral da análise
 */
const calcularConfiancaGeral = (resultados, documentos) => {
  const docsComDados = documentos.filter(d => d.dados_extraidos && Object.keys(d.dados_extraidos).length > 0);
  const coberturaDados = documentos.length > 0 ? docsComDados.length / documentos.length : 0;

  const confiancasAltas = resultados.filter(r => r.confianca === NivelConfianca.ALTO).length;
  const ratioAlta = resultados.length > 0 ? confiancasAltas / resultados.length : 0;

  if (coberturaDados >= 0.8 && ratioAlta >= 0.7) return NivelConfianca.ALTO;
  if (coberturaDados >= 0.5 && ratioAlta >= 0.4) return NivelConfianca.MEDIO;
  return NivelConfianca.BAIXO;
};

/**
 * Resumo categorizado dos resultados
 */
const gerarResumoPorCategoria = (resultados) => {
  const categorias = {
    financeiro: { label: 'Financeiro', regras: ['balancete_vs_extratos', 'capital_social', 'dre_vs_balancete', 'mutuo_vs_iof'], score: 0, total: 0 },
    cadastral: { label: 'Cadastral', regras: ['consistencia_cadastral', 'contrato_vs_socios'], score: 0, total: 0 },
    documental: { label: 'Documental', regras: ['coerencia_temporal', 'extratos_vs_periodo'], score: 0, total: 0 },
    endereco: { label: 'Endereço', regras: ['enderecos_vs_cadastro'], score: 0, total: 0 }
  };

  resultados.forEach(r => {
    for (const [, cat] of Object.entries(categorias)) {
      if (cat.regras.includes(r.regra)) {
        cat.total++;
        if (r.passou) cat.score++;
        break;
      }
    }
  });

  return Object.entries(categorias)
    .filter(([, cat]) => cat.total > 0)
    .map(([id, cat]) => ({
      id,
      label: cat.label,
      score: cat.total > 0 ? Math.round((cat.score / cat.total) * 100) : 100,
      passaram: cat.score,
      total: cat.total
    }));
};
