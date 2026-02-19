/**
 * Sistema completo de análise cruzada de documentos
 * Implementa todas as regras de cruzamento especificadas
 */

import { compararValoresMonetarios, compararSaldosBancarios } from './financialComparison';
import { compararTextos, normalizarEndereco } from './textNormalization';
import logger, { LogCategory } from './logger';

/**
 * Executa análise cruzada completa entre documentos
 * @param {Array} documentos - Array de documentos do caso
 * @param {object} cliente - Dados do cliente
 * @returns {object} Resultado da análise cruzada
 */
export const executarAnaliseCruzadaCompleta = async (documentos, cliente = {}) => {
  const startTime = performance.now();
  const resultados = [];

  try {
    logger.logAnalise('analise_cruzada_iniciada', {
      documentosCount: documentos.length,
      clienteId: cliente.id
    });

    // 1. Balancete vs. Extratos Bancários
    const resultadoBalanceteExtratos = analisarBalanceteVsExtratos(documentos);
    if (resultadoBalanceteExtratos) {
      resultados.push(resultadoBalanceteExtratos);
    }

    // 2. Contrato Social vs. Documentos de Identificação dos Sócios
    const resultadoContratoSocios = analisarContratoVsSocios(documentos);
    if (resultadoContratoSocios) {
      resultados.push(resultadoContratoSocios);
    }

    // 3. CNPJ/Razão Social (consistência entre todos os documentos)
    const resultadoConsistenciaCadastral = analisarConsistenciaCadastral(documentos);
    if (resultadoConsistenciaCadastral) {
      resultados.push(resultadoConsistenciaCadastral);
    }

    // 4. Datas de Documentos e Períodos de Referência
    const resultadoCoerenciaTemporal = analisarCoerenciaTemporal(documentos);
    if (resultadoCoerenciaTemporal) {
      resultados.push(resultadoCoerenciaTemporal);
    }

    // 5. Comprovantes de Endereço vs. Informações Cadastrais
    const resultadoEnderecos = analisarEnderecosVsCadastro(documentos, cliente);
    if (resultadoEnderecos) {
      resultados.push(resultadoEnderecos);
    }

    // 6. Contrato de Mútuo vs. IOF
    const resultadoMutuoIOF = analisarMutuoVsIOF(documentos);
    if (resultadoMutuoIOF) {
      resultados.push(resultadoMutuoIOF);
    }

    // 7. Capital Social (Contrato vs. Balanço)
    const resultadoCapitalSocial = analisarCapitalSocial(documentos);
    if (resultadoCapitalSocial) {
      resultados.push(resultadoCapitalSocial);
    }

    const duration = performance.now() - startTime;
    const inconsistenciasCriticas = resultados.filter(r => r.nivel === 'critico' && !r.passou).length;
    const inconsistenciasAltas = resultados.filter(r => r.nivel === 'alto' && !r.passou).length;

    logger.logAnalise('analise_cruzada_concluida', {
      documentosCount: documentos.length,
      regrasExecutadas: resultados.length,
      inconsistenciasCriticas,
      inconsistenciasAltas,
      duracao: duration
    });

    return {
      resultados,
      resumo: {
        total_regras: resultados.length,
        regras_passadas: resultados.filter(r => r.passou).length,
        inconsistencias_criticas: inconsistenciasCriticas,
        inconsistencias_altas: inconsistenciasAltas,
        score: calcularScoreCruzado(resultados)
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
 * Compara saldos de caixa/bancos do balancete com saldos dos extratos
 */
const analisarBalanceteVsExtratos = (documentos) => {
  const balancete = documentos.find(d => 
    d.tipo_documento?.includes('balancete') && d.dados_extraidos?.total_caixa !== undefined
  );
  
  const extratos = documentos.filter(d => 
    d.tipo_documento?.includes('extrato') && d.dados_extraidos?.saldo_final !== undefined
  );

  if (!balancete || extratos.length === 0) {
    return null;
  }

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

  return {
    regra: 'balancete_vs_extratos',
    nome: 'Balancete vs. Extratos Bancários',
    descricao: 'Verifica se os saldos de caixa/bancos do balancete correspondem aos extratos bancários',
    nivel: 'critico',
    passou: comparacao.dentroTolerancia,
    documentos_analisados: [balancete.id, ...extratos.map(e => e.id)],
    detalhes: {
      saldoBalancete: saldoBalancete,
      somaExtratos: somaExtratos,
      quantidadeExtratos: extratos.length,
      comparacao
    },
    discrepancias,
    sugestao: discrepancias.length > 0 
      ? 'Reconcilie os saldos entre balancete e extratos bancários. Verifique se todos os extratos do período foram incluídos.'
      : null
  };
};

/**
 * 2. Contrato Social vs. Documentos de Identificação dos Sócios
 * Verifica se os dados dos sócios no contrato correspondem aos documentos de identificação
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

  if (!contratoSocial || docsIdentificacao.length === 0) {
    return null;
  }

  const socios = contratoSocial.dados_extraidos.socios;
  const discrepancias = [];

  socios.forEach((socio, idx) => {
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
      // Verifica se CPF corresponde
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

      // Verifica se nome corresponde
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
    documentos_analisados: [contratoSocial.id, ...docsIdentificacao.map(d => d.id)],
    detalhes: {
      totalSocios: socios.length,
      documentosIdentificacao: docsIdentificacao.length
    },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique se todos os sócios possuem documentos de identificação válidos e se os dados correspondem ao contrato social.'
      : null
  };
};

/**
 * 3. CNPJ/Razão Social - Consistência entre todos os documentos
 * Verifica se CNPJ e Razão Social são idênticos em todos os documentos
 */
const analisarConsistenciaCadastral = (documentos) => {
  const docsComCNPJ = documentos.filter(d => d.dados_extraidos?.cnpj);
  
  if (docsComCNPJ.length < 2) {
    return null;
  }

  const cnpjReferencia = docsComCNPJ[0].dados_extraidos.cnpj.replace(/\D/g, '');
  const razaoSocialReferencia = docsComCNPJ[0].dados_extraidos.razao_social;

  const discrepancias = [];

  docsComCNPJ.forEach((doc, idx) => {
    if (idx === 0) return; // Pula o documento de referência

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

    // Verifica Razão Social se disponível
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
    documentos_analisados: docsComCNPJ.map(d => d.id),
    detalhes: {
      cnpjReferencia,
      razaoSocialReferencia,
      documentosAnalisados: docsComCNPJ.length
    },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique se todos os documentos pertencem à mesma empresa. Atualize documentos com dados cadastrais divergentes.'
      : null
  };
};

/**
 * 4. Coerência Temporal - Datas e Períodos de Referência
 * Valida se as datas dos documentos são coerentes
 */
const analisarCoerenciaTemporal = (documentos) => {
  const docsComData = documentos.filter(d => 
    d.data_documento || d.dados_extraidos?.data_emissao || d.dados_extraidos?.data_referencia
  );

  if (docsComData.length < 2) {
    return null;
  }

  const discrepancias = [];
  const hoje = new Date();

  docsComData.forEach(doc => {
    const dataDoc = new Date(doc.data_documento || doc.dados_extraidos?.data_emissao || doc.dados_extraidos?.data_referencia);
    
    // Documento futuro
    if (dataDoc > hoje) {
      discrepancias.push({
        tipo: 'data_futura',
        documentoId: doc.id,
        tipoDocumento: doc.tipo_documento,
        data: dataDoc.toISOString(),
        mensagem: `Documento com data futura: ${doc.tipo_documento}`
      });
    }

    // Documento muito antigo (mais de 5 anos)
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
  });

  return {
    regra: 'coerencia_temporal',
    nome: 'Coerência Temporal',
    descricao: 'Valida se as datas dos documentos são coerentes e estão dentro do período esperado',
    nivel: 'alto',
    passou: discrepancias.length === 0,
    documentos_analisados: docsComData.map(d => d.id),
    detalhes: {
      documentosAnalisados: docsComData.length
    },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique as datas dos documentos e solicite versões mais recentes quando necessário.'
      : null
  };
};

/**
 * 5. Comprovantes de Endereço vs. Cadastro
 * Confirma se endereços nos comprovantes coincidem com o cadastro
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

  if (comprovantesEndereco.length === 0) {
    return null;
  }

  const enderecoReferencia = contratoSocial?.dados_extraidos?.endereco || cliente.endereco;
  
  if (!enderecoReferencia) {
    return null;
  }

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
    documentos_analisados: comprovantesEndereco.map(d => d.id),
    detalhes: {
      enderecoReferencia,
      comprovantesAnalisados: comprovantesEndereco.length
    },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique se os comprovantes de endereço correspondem ao endereço cadastral da empresa.'
      : null
  };
};

/**
 * 6. Contrato de Mútuo vs. IOF
 * Valida se há recolhimento de IOF para contratos de mútuo
 */
const analisarMutuoVsIOF = (documentos) => {
  const contratoMutuo = documentos.find(d => 
    d.tipo_documento === 'contrato_mutuo' && d.dados_extraidos?.valor
  );

  const comprovanteIOF = documentos.find(d => 
    d.tipo_documento === 'comprovante_iof' && d.dados_extraidos?.valor_pago
  );

  if (!contratoMutuo) {
    return null;
  }

  const discrepancias = [];

  if (!comprovanteIOF) {
    discrepancias.push({
      tipo: 'iof_ausente',
      mensagem: 'Contrato de mútuo presente mas comprovante de IOF não encontrado'
    });
  } else {
    const valorMutuo = contratoMutuo.dados_extraidos.valor;
    const valorIOF = comprovanteIOF.dados_extraidos.valor_pago;

    if (valorIOF <= 0) {
      discrepancias.push({
        tipo: 'iof_zerado',
        valorMutuo,
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
 * 7. Capital Social - Contrato vs. Balanço
 * Verifica se o capital social integralizado no balanço corresponde ao contrato
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

  if (!contratoSocial || !balanco) {
    return null;
  }

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

  // Capital do balanço menor que do contrato indica descapitalização
  if (capitalBalanco < capitalContrato) {
    discrepancias.push({
      tipo: 'descapitalizacao',
      capitalContrato,
      capitalBalanco,
      mensagem: 'Capital social no balanço é menor que o subscrito no contrato (possível descapitalização)'
    });
  }

  return {
    regra: 'capital_social',
    nome: 'Capital Social (Contrato vs. Balanço)',
    descricao: 'Verifica se o capital social integralizado no balanço corresponde ao contrato social',
    nivel: 'alto',
    passou: discrepancias.length === 0,
    documentos_analisados: [contratoSocial.id, balanco.id],
    detalhes: {
      capitalContrato,
      capitalBalanco,
      comparacao
    },
    discrepancias,
    sugestao: discrepancias.length > 0
      ? 'Verifique se o capital social foi integralizado corretamente. Descapitalização pode indicar irregularidade.'
      : null
  };
};

/**
 * Calcula score geral da análise cruzada
 */
const calcularScoreCruzado = (resultados) => {
  if (resultados.length === 0) return 100;

  let score = 100;
  
  resultados.forEach(r => {
    if (!r.passou) {
      if (r.nivel === 'critico') {
        score -= 20;
      } else if (r.nivel === 'alto') {
        score -= 10;
      } else {
        score -= 5;
      }
    }
  });

  return Math.max(0, Math.min(100, score));
};
