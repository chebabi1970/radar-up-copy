/**
 * Utilitários compartilhados para análise de documentos
 * Evita duplicação de código entre componentes
 */

import { base44 } from '@/api/base44Client';

/**
 * Obtém URL assinada para um documento (file_url ou file_uri)
 * @param {Object} documento - Documento com file_url ou file_uri
 * @param {number} expiresIn - Tempo de validade em segundos (padrão: 3600)
 * @returns {Promise<string|null>} URL assinada ou null se falhar
 */
export async function obterUrlDocumento(documento, expiresIn = 3600) {
  if (!documento) return null;

  try {
    if (documento.file_url) {
      return documento.file_url;
    }

    if (documento.file_uri) {
      const resultado = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: documento.file_uri,
        expires_in: expiresIn
      });
      return resultado.signed_url;
    }

    return null;
  } catch (erro) {
    console.warn('Erro ao obter URL do documento:', documento.nome_arquivo, erro);
    return null;
  }
}

/**
 * Obtém URLs assinadas para múltiplos documentos em paralelo
 * @param {Array} documentos - Lista de documentos
 * @param {number} limite - Número máximo de documentos (padrão: 3)
 * @returns {Promise<Array<string>>} URLs válidas (filtra nulls)
 */
export async function obterUrlsDocumentos(documentos, limite = 3) {
  const docsLimitados = documentos.slice(0, limite);
  
  const urls = await Promise.all(
    docsLimitados.map(doc => obterUrlDocumento(doc))
  );

  return urls.filter(url => url !== null);
}

/**
 * Extrai dados de documento via LLM
 * @param {Array<string>} fileUrls - URLs dos arquivos
 * @param {string} tipoDocumento - Tipo do documento
 * @param {Object} schema - Schema JSON para resposta
 * @param {string} promptCustomizado - Prompt opcional customizado
 * @returns {Promise<Object>} Dados extraídos
 */
export async function extrairDadosDocumento(fileUrls, tipoDocumento, schema, promptCustomizado = null) {
  const prompt = promptCustomizado || gerarPromptPadrao(tipoDocumento);

  return await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: fileUrls,
    response_json_schema: schema
  });
}

/**
 * Gera prompt padrão para extração de dados
 * @param {string} tipoDocumento - Tipo do documento
 * @returns {string} Prompt otimizado
 */
function gerarPromptPadrao(tipoDocumento) {
  const prompts = {
    balancete_verificacao: `Extraia RÁPIDO caixa/bancos do balancete.
Procure: Caixa, Bancos (todos), Aplicações
Retorne APENAS valores visíveis no documento.`,

    extrato_bancario: `Extraia RÁPIDO saldos finais dos extratos.
Para cada mês: banco, conta, saldo_final, data
Retorne APENAS dados do extrato.`,

    contrato_social: `Extraia dados essenciais do contrato social:
CNPJ, razão social, sócios, data constituição
Retorne APENAS dados visíveis.`
  };

  return prompts[tipoDocumento] || `Extraia dados principais deste documento: ${tipoDocumento}`;
}

/**
 * Schemas JSON padrão para cada tipo de documento
 */
export const SCHEMAS_DOCUMENTOS = {
  balancete_verificacao: {
    type: 'object',
    properties: {
      data_balancete: { type: 'string' },
      periodo_referencia: { type: 'string' },
      saldos_caixa: { type: 'object' },
      total_caixa: { type: 'number' },
      observacoes: { type: 'string' }
    }
  },

  extrato_bancario: {
    type: 'object',
    properties: {
      extratos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            banco: { type: 'string' },
            conta: { type: 'string' },
            mes_ano: { type: 'string' },
            saldo_final: { type: 'number' },
            saldo_data: { type: 'string' }
          }
        }
      },
      total_extratos: { type: 'number' },
      alertas: { type: 'array', items: { type: 'string' } }
    }
  },

  contrato_social: {
    type: 'object',
    properties: {
      razao_social: { type: 'string' },
      cnpj: { type: 'string' },
      data_constituicao: { type: 'string' },
      socios: { type: 'array' }
    }
  },

  generico: {
    type: 'object',
    properties: {
      dados_extraidos: { type: 'object' },
      checklist_verificacao: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string' },
            status: { type: 'string', description: 'OK, ALERTA ou CRÍTICO' },
            observacao: { type: 'string' }
          }
        }
      },
      indicadores_alerta: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string' },
            descricao: { type: 'string' },
            severidade: { type: 'string', description: 'critica ou media' }
          }
        }
      },
      resumo: { type: 'string' },
      classificacao_final: { type: 'string' }
    }
  }
};

/**
 * Compara dois valores monetários com tolerância
 * @param {number} valor1 - Primeiro valor
 * @param {number} valor2 - Segundo valor
 * @param {number} tolerancia - Diferença aceitável (padrão: 0.01)
 * @returns {Object} Resultado da comparação
 */
export function compararValoresMonetarios(valor1, valor2, tolerancia = 0.01) {
  const diferenca = Math.abs(valor1 - valor2);
  const percentual = valor2 !== 0 ? (diferenca / Math.abs(valor2)) * 100 : 0;

  return {
    iguais: diferenca <= tolerancia,
    diferenca,
    percentual: percentual.toFixed(2),
    severidade: percentual > 10 ? 'critica' : percentual > 5 ? 'media' : 'leve'
  };
}

/**
 * Normaliza texto para comparação (remove acentos, pontuação, etc)
 * @param {string} texto - Texto a normalizar
 * @returns {string} Texto normalizado
 */
export function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Calcula severidade baseada em diferença percentual
 * @param {number} percentual - Percentual de diferença
 * @returns {string} 'critica' | 'media' | 'leve'
 */
export function calcularSeveridade(percentual) {
  if (percentual > 10) return 'critica';
  if (percentual > 5) return 'media';
  return 'leve';
}

/**
 * Salva resultado de análise no histórico
 * @param {Object} params - Parâmetros da análise
 * @returns {Promise<Object>} Análise salva
 */
export async function salvarAnaliseHistorico({
  casoId,
  tipoAnalise,
  documentoTipo,
  documentoNome,
  totalDiscrepancias = 0,
  discrepanciasCriticas = 0,
  discrepanciasMedias = 0,
  discrepanciasLeves = 0,
  statusResultado,
  dadosCompletos
}) {
  const user = await base44.auth.me();

  return await base44.entities.AnaliseHistorico.create({
    caso_id: casoId,
    tipo_analise: tipoAnalise,
    documento_tipo: documentoTipo,
    documento_nome: documentoNome,
    usuario_email: user.email,
    data_hora_analise: new Date().toISOString(),
    total_discrepancias: totalDiscrepancias,
    discrepancias_criticas: discrepanciasCriticas,
    discrepancias_medias: discrepanciasMedias,
    discrepancias_leves: discrepanciasLeves,
    status_resultado: statusResultado,
    dados_completos: dadosCompletos
  });
}