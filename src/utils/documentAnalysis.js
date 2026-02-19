/**
 * Sistema completo de análise individual de documentos
 * Valida dados essenciais, estrutura e conteúdo específico por tipo
 */

import logger, { LogCategory } from './logger';
import { validarDadosDocumento } from '../schemas/documentValidation';

/**
 * Níveis de severidade de problemas
 */
export const SeveridadeProblema = {
  CRITICO: 'critico',
  ALTO: 'alto',
  MEDIO: 'medio',
  BAIXO: 'baixo',
  INFO: 'info'
};

/**
 * Categorias de validação
 */
export const CategoriaValidacao = {
  FORMATO: 'formato',
  IDENTIFICACAO: 'identificacao',
  VALIDADE: 'validade',
  CONTEUDO: 'conteudo',
  COMPLETUDE: 'completude'
};

/**
 * Analisa documento individual com validações específicas por tipo
 * @param {object} documento - Documento a ser analisado
 * @param {object} opcoes - Opções de análise
 * @returns {object} Resultado da análise
 */
export const analisarDocumentoIndividual = async (documento, opcoes = {}) => {
  const startTime = performance.now();
  const problemas = [];
  const alertas = [];
  const informacoes = [];

  try {
    logger.logDocumento('analise_individual_iniciada', {
      documentoId: documento.id,
      tipo: documento.tipo_documento
    });

    // 1. Validação de Tipo e Formato
    const validacaoFormato = validarFormatoDocumento(documento);
    if (!validacaoFormato.valido) {
      problemas.push(...validacaoFormato.problemas);
    }

    // 2. Validação de Identificação
    const validacaoIdentificacao = validarIdentificacao(documento);
    if (!validacaoIdentificacao.valido) {
      problemas.push(...validacaoIdentificacao.problemas);
    }

    // 3. Validação de Validade Temporal
    const validacaoValidade = validarValidadeTemporal(documento);
    if (!validacaoValidade.valido) {
      problemas.push(...validacaoValidade.problemas);
    }
    alertas.push(...validacaoValidade.alertas);

    // 4. Validação de Conteúdo Específico por Tipo
    const validacaoConteudo = await validarConteudoEspecifico(documento);
    if (!validacaoConteudo.valido) {
      problemas.push(...validacaoConteudo.problemas);
    }
    alertas.push(...validacaoConteudo.alertas);
    informacoes.push(...validacaoConteudo.informacoes);

    // 5. Validação com Schema Zod
    if (documento.dados_extraidos) {
      const validacaoSchema = validarDadosDocumento(
        documento.tipo_documento?.toUpperCase(),
        documento.dados_extraidos
      );
      if (!validacaoSchema.sucesso) {
        problemas.push({
          categoria: CategoriaValidacao.CONTEUDO,
          severidade: SeveridadeProblema.ALTO,
          mensagem: 'Dados extraídos não passaram na validação de schema',
          detalhes: validacaoSchema.erro
        });
      }
    }

    const duration = performance.now() - startTime;
    const resultado = {
      documentoId: documento.id,
      tipo: documento.tipo_documento,
      valido: problemas.filter(p => p.severidade === SeveridadeProblema.CRITICO).length === 0,
      score: calcularScoreDocumento(problemas, alertas),
      problemas: problemas.sort((a, b) => severidadeToNumber(b.severidade) - severidadeToNumber(a.severidade)),
      alertas,
      informacoes,
      duracao: duration,
      timestamp: new Date().toISOString()
    };

    logger.logDocumento('analise_individual_concluida', {
      documentoId: documento.id,
      valido: resultado.valido,
      score: resultado.score,
      problemasCount: problemas.length,
      duracao: duration
    });

    return resultado;

  } catch (error) {
    logger.error(LogCategory.DOCUMENTO, 'Erro na análise individual', error, {
      documentoId: documento.id
    });
    throw error;
  }
};

/**
 * Valida formato e legibilidade do documento
 */
const validarFormatoDocumento = (documento) => {
  const problemas = [];

  // Verifica se tem arquivo
  if (!documento.file_uri && !documento.url) {
    problemas.push({
      categoria: CategoriaValidacao.FORMATO,
      severidade: SeveridadeProblema.CRITICO,
      mensagem: 'Documento sem arquivo anexado',
      campo: 'file_uri'
    });
  }

  // Verifica nome do arquivo
  if (!documento.nome_arquivo) {
    problemas.push({
      categoria: CategoriaValidacao.FORMATO,
      severidade: SeveridadeProblema.MEDIO,
      mensagem: 'Nome do arquivo não especificado',
      campo: 'nome_arquivo'
    });
  }

  // Verifica extensão
  const extensoesValidas = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.doc', '.docx'];
  const extensao = documento.nome_arquivo?.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (extensao && !extensoesValidas.includes(extensao)) {
    problemas.push({
      categoria: CategoriaValidacao.FORMATO,
      severidade: SeveridadeProblema.ALTO,
      mensagem: `Formato de arquivo não suportado: ${extensao}`,
      campo: 'nome_arquivo',
      sugestao: `Use um dos formatos: ${extensoesValidas.join(', ')}`
    });
  }

  return {
    valido: problemas.length === 0,
    problemas
  };
};

/**
 * Valida identificadores chave do documento
 */
const validarIdentificacao = (documento) => {
  const problemas = [];
  const dados = documento.dados_extraidos || {};

  // Valida CNPJ (se aplicável)
  if (tipoRequerCNPJ(documento.tipo_documento)) {
    if (!dados.cnpj) {
      problemas.push({
        categoria: CategoriaValidacao.IDENTIFICACAO,
        severidade: SeveridadeProblema.CRITICO,
        mensagem: 'CNPJ não identificado no documento',
        campo: 'cnpj'
      });
    } else if (!validarFormatoCNPJ(dados.cnpj)) {
      problemas.push({
        categoria: CategoriaValidacao.IDENTIFICACAO,
        severidade: SeveridadeProblema.ALTO,
        mensagem: 'CNPJ em formato inválido',
        campo: 'cnpj',
        valor: dados.cnpj
      });
    }
  }

  // Valida Razão Social (se aplicável)
  if (tipoRequerRazaoSocial(documento.tipo_documento)) {
    if (!dados.razao_social) {
      problemas.push({
        categoria: CategoriaValidacao.IDENTIFICACAO,
        severidade: SeveridadeProblema.ALTO,
        mensagem: 'Razão Social não identificada no documento',
        campo: 'razao_social'
      });
    }
  }

  // Valida Data de Emissão/Referência
  if (!documento.data_documento && !dados.data_emissao && !dados.data_referencia) {
    problemas.push({
      categoria: CategoriaValidacao.IDENTIFICACAO,
      severidade: SeveridadeProblema.MEDIO,
      mensagem: 'Data de emissão ou referência não identificada',
      campo: 'data_documento'
    });
  }

  return {
    valido: problemas.length === 0,
    problemas
  };
};

/**
 * Valida validade temporal do documento
 */
const validarValidadeTemporal = (documento) => {
  const problemas = [];
  const alertas = [];
  const dados = documento.dados_extraidos || {};

  const dataDocumento = documento.data_documento || dados.data_emissao || dados.data_referencia;
  
  if (!dataDocumento) {
    return { valido: true, problemas, alertas };
  }

  const dataDoc = new Date(dataDocumento);
  const hoje = new Date();
  const diferencaDias = Math.floor((hoje - dataDoc) / (1000 * 60 * 60 * 24));

  // Regras de validade por tipo de documento
  const regrasValidade = {
    'extrato_bancario_corrente': 90, // 3 meses
    'conta_energia': 90,
    'plano_internet': 90,
    'das_simples_nacional': 365, // 1 ano
    'darf_cprb': 365,
    'balancete_verificacao': 180, // 6 meses
    'balanco_patrimonial_integralizacao': 365
  };

  const validadeDias = regrasValidade[documento.tipo_documento];
  
  if (validadeDias && diferencaDias > validadeDias) {
    problemas.push({
      categoria: CategoriaValidacao.VALIDADE,
      severidade: SeveridadeProblema.ALTO,
      mensagem: `Documento fora do período de validade (${diferencaDias} dias, máximo ${validadeDias})`,
      campo: 'data_documento',
      valor: dataDocumento,
      sugestao: 'Solicite documento mais recente'
    });
  } else if (validadeDias && diferencaDias > validadeDias * 0.8) {
    alertas.push({
      categoria: CategoriaValidacao.VALIDADE,
      severidade: SeveridadeProblema.MEDIO,
      mensagem: `Documento próximo do vencimento (${diferencaDias} dias de ${validadeDias})`,
      campo: 'data_documento'
    });
  }

  // Documento futuro
  if (diferencaDias < 0) {
    problemas.push({
      categoria: CategoriaValidacao.VALIDADE,
      severidade: SeveridadeProblema.CRITICO,
      mensagem: 'Data do documento está no futuro',
      campo: 'data_documento',
      valor: dataDocumento
    });
  }

  return {
    valido: problemas.length === 0,
    problemas,
    alertas
  };
};

/**
 * Valida conteúdo específico por tipo de documento
 */
const validarConteudoEspecifico = async (documento) => {
  const tipo = documento.tipo_documento;
  const dados = documento.dados_extraidos || {};
  
  const validadores = {
    'balancete_verificacao': validarBalancete,
    'extrato_bancario_corrente': validarExtratoBancario,
    'extrato_bancario_integralizacao': validarExtratoBancario,
    'extrato_bancario_aplicacoes': validarExtratoBancario,
    'contrato_social': validarContratoSocial,
    'procuracao': validarProcuracao,
    'documento_identificacao_responsavel': validarDocumentoIdentificacao,
    'documento_identificacao_procurador': validarDocumentoIdentificacao,
    'das_simples_nacional': validarComprovanteTributo,
    'darf_cprb': validarComprovanteTributo,
    'conta_energia': validarComprovanteEndereco,
    'guia_iptu': validarComprovanteEndereco,
    'contrato_locacao': validarComprovanteEndereco
  };

  const validador = validadores[tipo];
  
  if (validador) {
    return validador(dados, documento);
  }

  return {
    valido: true,
    problemas: [],
    alertas: [],
    informacoes: []
  };
};

/**
 * Validadores específicos por tipo de documento
 */

const validarBalancete = (dados, documento) => {
  const problemas = [];
  const alertas = [];
  const informacoes = [];

  // Verifica saldos essenciais
  const camposEssenciais = ['total_caixa', 'capital_social'];
  camposEssenciais.forEach(campo => {
    if (dados[campo] === undefined || dados[campo] === null) {
      problemas.push({
        categoria: CategoriaValidacao.CONTEUDO,
        severidade: SeveridadeProblema.ALTO,
        mensagem: `Campo essencial não encontrado: ${campo}`,
        campo
      });
    }
  });

  // Verifica valores negativos suspeitos
  if (dados.total_caixa < 0) {
    alertas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.MEDIO,
      mensagem: 'Saldo de caixa negativo detectado',
      campo: 'total_caixa',
      valor: dados.total_caixa
    });
  }

  // Informações úteis
  if (dados.capital_social) {
    informacoes.push({
      categoria: CategoriaValidacao.CONTEUDO,
      mensagem: `Capital Social: R$ ${dados.capital_social.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    });
  }

  return { valido: problemas.length === 0, problemas, alertas, informacoes };
};

const validarExtratoBancario = (dados, documento) => {
  const problemas = [];
  const alertas = [];
  const informacoes = [];

  // Verifica campos essenciais
  if (!dados.banco) {
    problemas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.ALTO,
      mensagem: 'Nome do banco não identificado',
      campo: 'banco'
    });
  }

  if (!dados.conta) {
    problemas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.ALTO,
      mensagem: 'Número da conta não identificado',
      campo: 'conta'
    });
  }

  if (dados.saldo_final === undefined) {
    problemas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.CRITICO,
      mensagem: 'Saldo final não identificado',
      campo: 'saldo_final'
    });
  }

  // Verifica titularidade
  if (!dados.titular) {
    alertas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.MEDIO,
      mensagem: 'Titular da conta não identificado claramente',
      campo: 'titular'
    });
  }

  // Informações
  if (dados.saldo_final !== undefined) {
    informacoes.push({
      categoria: CategoriaValidacao.CONTEUDO,
      mensagem: `Saldo Final: R$ ${dados.saldo_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    });
  }

  return { valido: problemas.length === 0, problemas, alertas, informacoes };
};

const validarContratoSocial = (dados, documento) => {
  const problemas = [];
  const alertas = [];
  const informacoes = [];

  // Campos essenciais
  const camposEssenciais = ['cnpj', 'razao_social', 'capital_social'];
  camposEssenciais.forEach(campo => {
    if (!dados[campo]) {
      problemas.push({
        categoria: CategoriaValidacao.CONTEUDO,
        severidade: SeveridadeProblema.CRITICO,
        mensagem: `Campo essencial não encontrado: ${campo}`,
        campo
      });
    }
  });

  // Verifica quadro de sócios
  if (!dados.socios || dados.socios.length === 0) {
    alertas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.ALTO,
      mensagem: 'Quadro de sócios não identificado',
      campo: 'socios'
    });
  }

  // Informações
  if (dados.socios && dados.socios.length > 0) {
    informacoes.push({
      categoria: CategoriaValidacao.CONTEUDO,
      mensagem: `${dados.socios.length} sócio(s) identificado(s)`
    });
  }

  return { valido: problemas.length === 0, problemas, alertas, informacoes };
};

const validarProcuracao = (dados, documento) => {
  const problemas = [];
  const alertas = [];
  const informacoes = [];

  // Campos essenciais
  if (!dados.nome_outorgante) {
    problemas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.CRITICO,
      mensagem: 'Nome do outorgante não identificado',
      campo: 'nome_outorgante'
    });
  }

  if (!dados.nome_outorgado) {
    problemas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.CRITICO,
      mensagem: 'Nome do outorgado (procurador) não identificado',
      campo: 'nome_outorgado'
    });
  }

  // Verifica poderes
  if (!dados.poderes || dados.poderes.length === 0) {
    alertas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.MEDIO,
      mensagem: 'Poderes concedidos não identificados claramente',
      campo: 'poderes'
    });
  }

  return { valido: problemas.length === 0, problemas, alertas, informacoes };
};

const validarDocumentoIdentificacao = (dados, documento) => {
  const problemas = [];
  const alertas = [];
  const informacoes = [];

  // Campos essenciais
  if (!dados.nome) {
    problemas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.CRITICO,
      mensagem: 'Nome completo não identificado',
      campo: 'nome'
    });
  }

  if (!dados.cpf) {
    problemas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.CRITICO,
      mensagem: 'CPF não identificado',
      campo: 'cpf'
    });
  }

  // Verifica validade
  if (dados.data_validade) {
    const validade = new Date(dados.data_validade);
    const hoje = new Date();
    if (validade < hoje) {
      problemas.push({
        categoria: CategoriaValidacao.VALIDADE,
        severidade: SeveridadeProblema.CRITICO,
        mensagem: 'Documento de identificação vencido',
        campo: 'data_validade',
        valor: dados.data_validade
      });
    }
  }

  return { valido: problemas.length === 0, problemas, alertas, informacoes };
};

const validarComprovanteTributo = (dados, documento) => {
  const problemas = [];
  const alertas = [];
  const informacoes = [];

  // Campos essenciais
  if (!dados.valor_pago && !dados.valor) {
    problemas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.CRITICO,
      mensagem: 'Valor pago não identificado',
      campo: 'valor_pago'
    });
  }

  if (!dados.data_pagamento) {
    problemas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.ALTO,
      mensagem: 'Data de pagamento não identificada',
      campo: 'data_pagamento'
    });
  }

  if (!dados.periodo_apuracao) {
    alertas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.MEDIO,
      mensagem: 'Período de apuração não identificado',
      campo: 'periodo_apuracao'
    });
  }

  return { valido: problemas.length === 0, problemas, alertas, informacoes };
};

const validarComprovanteEndereco = (dados, documento) => {
  const problemas = [];
  const alertas = [];
  const informacoes = [];

  // Campos essenciais
  if (!dados.endereco && !dados.logradouro) {
    problemas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.CRITICO,
      mensagem: 'Endereço não identificado',
      campo: 'endereco'
    });
  }

  if (!dados.titular) {
    alertas.push({
      categoria: CategoriaValidacao.CONTEUDO,
      severidade: SeveridadeProblema.MEDIO,
      mensagem: 'Titular do comprovante não identificado',
      campo: 'titular'
    });
  }

  return { valido: problemas.length === 0, problemas, alertas, informacoes };
};

/**
 * Funções auxiliares
 */

const tipoRequerCNPJ = (tipo) => {
  const tiposComCNPJ = [
    'balancete_verificacao',
    'balanco_patrimonial_integralizacao',
    'contrato_social',
    'certidao_junta_comercial',
    'extrato_bancario_corrente',
    'extrato_bancario_integralizacao',
    'extrato_bancario_aplicacoes',
    'das_simples_nacional',
    'darf_cprb'
  ];
  return tiposComCNPJ.includes(tipo);
};

const tipoRequerRazaoSocial = (tipo) => {
  return tipoRequerCNPJ(tipo);
};

const validarFormatoCNPJ = (cnpj) => {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo.length === 14;
};

const severidadeToNumber = (severidade) => {
  const map = {
    [SeveridadeProblema.CRITICO]: 5,
    [SeveridadeProblema.ALTO]: 4,
    [SeveridadeProblema.MEDIO]: 3,
    [SeveridadeProblema.BAIXO]: 2,
    [SeveridadeProblema.INFO]: 1
  };
  return map[severidade] || 0;
};

const calcularScoreDocumento = (problemas, alertas) => {
  let score = 100;
  
  problemas.forEach(p => {
    switch (p.severidade) {
      case SeveridadeProblema.CRITICO:
        score -= 25;
        break;
      case SeveridadeProblema.ALTO:
        score -= 15;
        break;
      case SeveridadeProblema.MEDIO:
        score -= 8;
        break;
      case SeveridadeProblema.BAIXO:
        score -= 3;
        break;
    }
  });

  alertas.forEach(a => {
    score -= 2;
  });

  return Math.max(0, Math.min(100, score));
};
