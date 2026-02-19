/**
 * Schemas de validação com Zod para análise de documentos
 * Garante integridade e consistência dos dados extraídos
 */

import { z } from 'zod';

// Schema para CNPJ
export const cnpjSchema = z.string()
  .regex(/^\d{14}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido')
  .transform(cnpj => cnpj.replace(/\D/g, ''));

// Schema para CPF
export const cpfSchema = z.string()
  .regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido')
  .transform(cpf => cpf.replace(/\D/g, ''));

// Schema para data
export const dataSchema = z.string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
  .or(z.date());

// Schema para valor monetário
export const valorMonetarioSchema = z.number()
  .nonnegative('Valor não pode ser negativo')
  .finite('Valor deve ser finito');

// Schema para dados extraídos de Contrato Social
export const contratoSocialSchema = z.object({
  cnpj: cnpjSchema,
  razao_social: z.string().min(3, 'Razão social muito curta'),
  nome_fantasia: z.string().optional(),
  capital_social: valorMonetarioSchema,
  data_constituicao: dataSchema,
  endereco: z.object({
    logradouro: z.string(),
    numero: z.string(),
    complemento: z.string().optional(),
    bairro: z.string(),
    cidade: z.string(),
    uf: z.string().length(2, 'UF deve ter 2 caracteres'),
    cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
  }).optional(),
  socios: z.array(z.object({
    nome: z.string(),
    cpf: cpfSchema.optional(),
    participacao: z.number().min(0).max(100).optional()
  })).optional()
});

// Schema para dados extraídos de Balanço Patrimonial
export const balancoPatrimonialSchema = z.object({
  cnpj: cnpjSchema,
  razao_social: z.string(),
  data_referencia: dataSchema,
  ativo_circulante: z.object({
    caixa_equivalentes: valorMonetarioSchema.optional(),
    aplicacoes_financeiras: valorMonetarioSchema.optional(),
    contas_receber: valorMonetarioSchema.optional(),
    estoques: valorMonetarioSchema.optional(),
    total: valorMonetarioSchema
  }).optional(),
  ativo_nao_circulante: z.object({
    realizavel_longo_prazo: valorMonetarioSchema.optional(),
    investimentos: valorMonetarioSchema.optional(),
    imobilizado: valorMonetarioSchema.optional(),
    intangivel: valorMonetarioSchema.optional(),
    total: valorMonetarioSchema
  }).optional(),
  passivo_circulante: z.object({
    fornecedores: valorMonetarioSchema.optional(),
    emprestimos: valorMonetarioSchema.optional(),
    impostos_pagar: valorMonetarioSchema.optional(),
    total: valorMonetarioSchema
  }).optional(),
  patrimonio_liquido: z.object({
    capital_social: valorMonetarioSchema,
    reservas: valorMonetarioSchema.optional(),
    lucros_acumulados: valorMonetarioSchema.optional(),
    total: valorMonetarioSchema
  }).optional()
});

// Schema para dados extraídos de DRE
export const dreSchema = z.object({
  cnpj: cnpjSchema,
  razao_social: z.string(),
  periodo_inicio: dataSchema,
  periodo_fim: dataSchema,
  receita_bruta: valorMonetarioSchema,
  deducoes: valorMonetarioSchema.optional(),
  receita_liquida: valorMonetarioSchema,
  custo_mercadorias_vendidas: valorMonetarioSchema.optional(),
  lucro_bruto: valorMonetarioSchema.optional(),
  despesas_operacionais: valorMonetarioSchema.optional(),
  lucro_operacional: valorMonetarioSchema.optional(),
  resultado_financeiro: valorMonetarioSchema.optional(),
  lucro_antes_impostos: valorMonetarioSchema.optional(),
  impostos: valorMonetarioSchema.optional(),
  lucro_liquido: valorMonetarioSchema
});

// Schema para dados extraídos de Extrato Bancário
export const extratoBancarioSchema = z.object({
  banco: z.string(),
  agencia: z.string().optional(),
  conta: z.string(),
  titular: z.string(),
  cnpj_titular: cnpjSchema.optional(),
  periodo_inicio: dataSchema,
  periodo_fim: dataSchema,
  saldo_inicial: valorMonetarioSchema,
  saldo_final: valorMonetarioSchema,
  total_creditos: valorMonetarioSchema.optional(),
  total_debitos: valorMonetarioSchema.optional(),
  transacoes: z.array(z.object({
    data: dataSchema,
    descricao: z.string(),
    valor: z.number(),
    tipo: z.enum(['credito', 'debito'])
  })).optional()
});

// Schema para validação de análise cruzada
export const analiseCruzadaInputSchema = z.object({
  documentos: z.array(z.object({
    id: z.string(),
    tipo: z.string(),
    dados_extraidos: z.record(z.any())
  })).min(2, 'Análise cruzada requer pelo menos 2 documentos'),
  tipo_analise: z.enum([
    'consistencia_cadastral',
    'capital_social',
    'saldos_bancarios',
    'disponibilidade_financeira'
  ]),
  regras: z.array(z.string()).optional()
});

/**
 * Valida dados extraídos de documento com base no tipo
 * @param {string} tipoDocumento - Tipo do documento
 * @param {object} dadosExtraidos - Dados extraídos do documento
 * @returns {object} Resultado da validação
 */
export const validarDadosDocumento = (tipoDocumento, dadosExtraidos) => {
  const schemas = {
    'CONTRATO_SOCIAL': contratoSocialSchema,
    'BALANCO_PATRIMONIAL': balancoPatrimonialSchema,
    'DRE': dreSchema,
    'EXTRATO_BANCARIO': extratoBancarioSchema
  };

  const schema = schemas[tipoDocumento];
  
  if (!schema) {
    return {
      sucesso: false,
      erro: `Tipo de documento não suportado: ${tipoDocumento}`
    };
  }

  try {
    const dadosValidados = schema.parse(dadosExtraidos);
    return {
      sucesso: true,
      dados: dadosValidados
    };
  } catch (erro) {
    return {
      sucesso: false,
      erro: erro.errors.map(e => ({
        campo: e.path.join('.'),
        mensagem: e.message
      }))
    };
  }
};

/**
 * Valida entrada para análise cruzada
 * @param {object} input - Dados de entrada para análise cruzada
 * @returns {object} Resultado da validação
 */
export const validarInputAnaliseCruzada = (input) => {
  try {
    const inputValidado = analiseCruzadaInputSchema.parse(input);
    return {
      sucesso: true,
      dados: inputValidado
    };
  } catch (erro) {
    return {
      sucesso: false,
      erro: erro.errors.map(e => ({
        campo: e.path.join('.'),
        mensagem: e.message
      }))
    };
  }
};
