/**
 * Mapeamento de Documentos por Hipótese de Revisão
 * Baseado na Portaria Coana 72/2020, Art. 4º e Anexo Único
 */

export const HIPOTESES = {
  I: {
    codigo: 'I',
    nome: 'Recursos Financeiros Livres',
    descricao: 'Recursos financeiros de livre movimentação ou de liquidez imediata',
    artigo: 'Art. 4º, I',
    documentos_obrigatorios: [
      // Identificação
      'requerimento_das',                          // 1100
      'documento_identificacao_responsavel',       // 2100
      
      // Constitutivos
      'contrato_social',                           // 3100
      'certidao_junta_comercial',                  // 3110
      
      // Endereço (pelo menos 1 obrigatório)
      'conta_energia',                             // 4100
      
      // Financeiros
      'extratos_bancarios',                        // 5100 - últimos 3 meses
      'balancete_verificacao'                      // 6100 - últimos 3 meses
    ],
    documentos_opcionais: [
      'procuracao',                                // 2110
      'documento_identificacao_procurador',        // 2120
      'plano_internet',                            // 4110
      'guia_iptu',                                 // 3120
      'escritura_imovel',                          // 3130
      'contrato_locacao',                          // 3140
      'comprovante_espaco_armazenagem',            // 3150
      'comprovante_transferencia_recursos',        // 5160
      'contrato_emprestimo_bancario',              // 5130
      'contrato_mutuo',                            // 5120
      'contrato_social_mutuante',                  // 2130
      'balancete_mutuante',                        // 6110
      'comprovante_iof_mutuo',                     // 5140
      'extratos_bancarios_aporte',                 // 5150
      'balanco_patrimonial_integralizacao',        // 6120
      'comprovante_transferencia_integralizacao'   // 5160
    ],
    periodo_documentos: {
      'extratos_bancarios': 'Últimos 3 meses',
      'balancete_verificacao': 'Últimos 3 meses',
      'conta_energia': 'Últimos 3 meses'
    }
  },
  
  II: {
    codigo: 'II',
    nome: 'Desonerações Tributárias',
    descricao: 'Fruição de desonerações tributárias (isenções e imunidades)',
    artigo: 'Art. 4º, II',
    documentos_obrigatorios: [
      // Identificação
      'requerimento_das',                          // 1200
      'documento_identificacao_responsavel',       // 2200
      
      // Constitutivos
      'contrato_social',                           // 3200
      'certidao_junta_comercial',                  // 3210
      
      // Endereço
      'conta_energia',                             // 4200
      
      // Desoneração
      'embasamento_legal_desoneracao',             // 7200
      'comprovante_habilitacao_regime_especial',   // 7210
      'planilha_tributos_nao_recolhidos'           // 7220
    ],
    documentos_opcionais: [
      'procuracao',                                // 2210
      'documento_identificacao_procurador',        // 2220
      'plano_internet',                            // 4210
      'guia_iptu',                                 // 3220
      'escritura_imovel',                          // 3230
      'contrato_locacao',                          // 3240
      'comprovante_espaco_armazenagem',            // 3250
      'extratos_bancarios_aporte',                 // 5250
      'balanco_patrimonial_integralizacao',        // 6220
      'comprovante_transferencia_integralizacao'   // 5260
    ],
    periodo_documentos: {
      'conta_energia': 'Últimos 3 meses'
    }
  },
  
  III: {
    codigo: 'III',
    nome: 'DAS - Simples Nacional',
    descricao: 'Recolhimentos via DAS (optantes do Simples Nacional)',
    artigo: 'Art. 4º, III',
    documentos_obrigatorios: [
      // Identificação
      'requerimento_das',                          // 1300
      'documento_identificacao_responsavel',       // 2300
      
      // Constitutivos
      'contrato_social',                           // 3300
      'certidao_junta_comercial',                  // 3310
      
      // Endereço
      'conta_energia'                              // 4300
    ],
    documentos_opcionais: [
      'procuracao',                                // 2310
      'documento_identificacao_procurador',        // 2320
      'plano_internet',                            // 4310
      'guia_iptu',                                 // 3320
      'escritura_imovel',                          // 3330
      'contrato_locacao',                          // 3340
      'comprovante_espaco_armazenagem',            // 3350
      'extratos_bancarios_aporte',                 // 5350
      'balanco_patrimonial_integralizacao',        // 6320
      'comprovante_transferencia_integralizacao'   // 5360
    ],
    periodo_documentos: {
      'conta_energia': 'Últimos 3 meses'
    }
  },
  
  IV: {
    codigo: 'IV',
    nome: 'CPRB',
    descricao: 'Contribuição Previdenciária sobre Receita Bruta',
    artigo: 'Art. 4º, IV',
    documentos_obrigatorios: [
      // Identificação
      'requerimento_das',                          // 1400
      'documento_identificacao_responsavel',       // 2400
      
      // Constitutivos
      'contrato_social',                           // 3400
      'certidao_junta_comercial',                  // 3410
      
      // Endereço
      'conta_energia'                              // 4400
    ],
    documentos_opcionais: [
      'procuracao',                                // 2410
      'documento_identificacao_procurador',        // 2420
      'plano_internet',                            // 4410
      'guia_iptu',                                 // 3420
      'escritura_imovel',                          // 3430
      'contrato_locacao',                          // 3440
      'comprovante_espaco_armazenagem',            // 3450
      'extratos_bancarios_aporte',                 // 5450
      'balanco_patrimonial_integralizacao',        // 6420
      'comprovante_transferencia_integralizacao'   // 5460
    ],
    periodo_documentos: {
      'conta_energia': 'Últimos 3 meses'
    }
  },
  
  V: {
    codigo: 'V',
    nome: 'Início/Retomada < 5 anos',
    descricao: 'Início ou retomada de atividades há menos de 5 anos',
    artigo: 'Art. 4º, V',
    documentos_obrigatorios: [
      // Identificação
      'requerimento_das',                          // 1500
      'documento_identificacao_responsavel',       // 2500
      
      // Constitutivos
      'contrato_social',                           // 3500
      'certidao_junta_comercial',                  // 3510
      
      // Endereço
      'conta_energia'                              // 4500
    ],
    documentos_opcionais: [
      'procuracao',                                // 2510
      'documento_identificacao_procurador',        // 2520
      'plano_internet',                            // 4510
      'guia_iptu',                                 // 3520
      'escritura_imovel',                          // 3530
      'contrato_locacao',                          // 3540
      'comprovante_espaco_armazenagem',            // 3550
      'extratos_bancarios_aporte',                 // 5550
      'balanco_patrimonial_integralizacao',        // 6520
      'comprovante_transferencia_integralizacao'   // 5560
    ],
    periodo_documentos: {
      'conta_energia': 'Últimos 3 meses'
    }
  }
};

/**
 * Documentos comuns a TODAS as hipóteses (sempre obrigatórios)
 */
export const DOCUMENTOS_COMUNS = [
  'requerimento_das',
  'documento_identificacao_responsavel',
  'contrato_social',
  'certidao_junta_comercial',
  'conta_energia'
];

/**
 * Documentos opcionais (aplicáveis a qualquer hipótese, mas não obrigatórios)
 */
export const DOCUMENTOS_OPCIONAIS_GERAIS = [
  'procuracao',
  'documento_identificacao_procurador',
  'plano_internet',
  'guia_iptu',
  'escritura_imovel',
  'contrato_locacao',
  'comprovante_espaco_armazenagem'
];

/**
 * Retorna a lista de documentos obrigatórios para uma hipótese específica
 */
export function getDocumentosObrigatorios(hipotese) {
  const config = HIPOTESES[hipotese];
  if (!config) return [];
  
  return config.documentos_obrigatorios || [];
}

/**
 * Retorna a lista de documentos opcionais para uma hipótese específica
 */
export function getDocumentosOpcionais(hipotese) {
  const config = HIPOTESES[hipotese];
  if (!config) return [];
  
  return config.documentos_opcionais || [];
}

/**
 * Verifica se um documento é obrigatório para uma hipótese
 */
export function isDocumentoObrigatorio(tipoDocumento, hipotese) {
  const obrigatorios = getDocumentosObrigatorios(hipotese);
  return obrigatorios.includes(tipoDocumento);
}

/**
 * Verifica se um documento é aplicável a uma hipótese
 */
export function isDocumentoAplicavel(tipoDocumento, hipotese) {
  const obrigatorios = getDocumentosObrigatorios(hipotese);
  const opcionais = getDocumentosOpcionais(hipotese);
  
  return obrigatorios.includes(tipoDocumento) || opcionais.includes(tipoDocumento);
}

/**
 * Retorna o período obrigatório de um documento para uma hipótese
 */
export function getPeriodoDocumento(tipoDocumento, hipotese) {
  const config = HIPOTESES[hipotese];
  if (!config || !config.periodo_documentos) return null;
  
  return config.periodo_documentos[tipoDocumento] || null;
}

/**
 * Retorna informações completas de uma hipótese
 */
export function getHipoteseInfo(hipotese) {
  return HIPOTESES[hipotese] || null;
}

/**
 * Retorna todas as hipóteses disponíveis
 */
export function getAllHipoteses() {
  return Object.values(HIPOTESES);
}

/**
 * Retorna lista completa de todos os documentos (obrigatórios + opcionais) de uma hipótese
 */
export function getTodosDocumentos(hipotese) {
  const obrigatorios = getDocumentosObrigatorios(hipotese);
  const opcionais = getDocumentosOpcionais(hipotese);
  
  return [...obrigatorios, ...opcionais];
}
