/**
 * Construtor de prompts para análise de documentos
 * Centraliza lógica de geração de prompts
 */

import { getGuide } from '../analisisGuides';

/**
 * Constrói prompt para análise de documento individual
 * @param {string} tipoDocumento - Tipo do documento
 * @param {Object} cliente - Dados do cliente
 * @returns {string} Prompt otimizado
 */
export function construirPromptDocumento(tipoDocumento, cliente = {}) {
  const guide = getGuide(tipoDocumento);

  if (guide) {
    return construirPromptComGuia(guide, cliente);
  }

  return construirPromptGenerico(tipoDocumento);
}

/**
 * Constrói prompt com guia de análise
 */
function construirPromptComGuia(guide, cliente) {
  const regras = guide.regras.slice(0, 3).join(' | ');
  const criticos = guide.checklist
    .filter(c => c.critico)
    .map(c => c.item)
    .join(' | ');

  return `Analise RÁPIDO este documento RFB: ${guide.nome}

REGRAS: ${regras}
CRÍTICOS: ${criticos}

EMPRESA: ${cliente?.razao_social || 'N/A'} | CNPJ: ${cliente?.cnpj || 'N/A'}

RESPONDA EM JSON APENAS:
{
  "dados_extraidos": {},
  "checklist_verificacao": [{"item": "", "status": "OK|ALERTA|CRÍTICO", "observacao": ""}],
  "indicadores_alerta": [{"tipo": "", "severidade": "critica|media|leve", "descricao": ""}],
  "resumo": "análise breve",
  "classificacao_final": "APROVADO|INCONSISTENTE"
}`;
}

/**
 * Constrói prompt genérico
 */
function construirPromptGenerico(tipoDocumento) {
  return `Analise rapidamente documento: ${tipoDocumento}

1. Dados principais
2. Período de referência
3. Legibilidade
4. Alertas críticos
5. Aprovável?

RESPONDA EM JSON:
{
  "dados_extraidos": {},
  "checklist_verificacao": [{"item": "", "status": "OK|ALERTA|CRÍTICO"}],
  "indicadores_alerta": [{"tipo": "", "severidade": "critica|media|leve", "descricao": ""}],
  "resumo": "breve",
  "classificacao_final": "APROVADO|INCONSISTENTE"
}`;
}

/**
 * Constrói prompt para análise cruzada (balancete vs extratos)
 */
export function construirPromptBalanceteExtratos() {
  return {
    balancete: `Extraia RÁPIDO caixa/bancos do balancete.

Procure: Caixa, Bancos (todos), Aplicações
Retorne EM JSON APENAS:
{
  "data_balancete": "YYYY-MM-DD",
  "total_caixa": 0,
  "saldos_caixa": {"Banco X": valor},
  "observacoes": ""
}`,

    extratos: `Extraia RÁPIDO saldos finais dos extratos.

Para cada mês: banco, conta, saldo_final, data
RETORNE EM JSON APENAS:
{
  "extratos": [{"banco": "", "conta": "", "mes_ano": "", "saldo_final": 0, "saldo_data": ""}],
  "total_extratos": 0,
  "alertas": []
}`
  };
}

/**
 * Constrói prompt para análise de qualidade visual
 */
export function construirPromptQualidade() {
  return `Avalie rapidamente a LEGIBILIDADE e QUALIDADE deste documento.
      
Responda em JSON:
{
  "legivel": true/false,
  "qualidade": "otima|boa|aceitavel|ruim",
  "problemas": ["lista de problemas visuais se houver"]
}`;
}

/**
 * Constrói prompt para análise inteligente de caso completo
 */
export function construirPromptAnaliseCompleta(contexto) {
  return `Você é um especialista em habilitação de operadores de comércio exterior (Radar RFB).

CASO:
${JSON.stringify(contexto, null, 2)}

ANÁLISE SOLICITADA:
1. CONFORMIDADE: O caso está apto para protocolo? Quais os gaps críticos?
2. RISCOS: Identifique potenciais riscos de indeferimento
3. OPORTUNIDADES: Há formas de fortalecer o pedido?
4. PRAZO: Estimativa realista de tempo até deferimento
5. RECOMENDAÇÕES: Top 3 ações prioritárias

RETORNE EM JSON:
{
  "classificacao_final": "APTO|INAPTO|PARCIALMENTE_APTO",
  "score_conformidade": 0-100,
  "gaps_criticos": [{"tipo": "", "descricao": "", "impacto": "alto|medio|baixo"}],
  "riscos_identificados": [{"descricao": "", "probabilidade": "alta|media|baixa", "mitigacao": ""}],
  "oportunidades": [{"descricao": "", "beneficio": ""}],
  "estimativa_prazo_dias": 0,
  "acoes_prioritarias": ["", "", ""],
  "observacoes_gerais": ""
}`;
}

/**
 * Constrói prompt para cruzamento de documentos
 */
export function construirPromptCruzamentoDocumentos() {
  return `Analise CRUZAMENTO entre estes documentos:
          
Verifique:
- CNPJs consistentes?
- Datas compatíveis?
- Valores coerentes?
- Assinaturas e carimbos?

RETORNE EM JSON:
{
  "consistente": true/false,
  "inconsistencias": [{"tipo": "", "descricao": "", "severidade": "critica|media|leve"}],
  "pontos_fortes": [""],
  "recomendacoes": [""]
}`;
}