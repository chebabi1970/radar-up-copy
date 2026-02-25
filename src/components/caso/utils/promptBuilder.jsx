/**
 * Construtor de prompts para análise de documentos
 * Centraliza lógica de geração de prompts
 */

import { getGuide } from '../analisisGuides';

/**
 * Constrói prompt para análise de documento individual
 * @param {string} tipoDocumento - Tipo do documento
 * @param {Object} cliente - Dados do cliente
 * @param {Object} opcoes - Opções adicionais
 * @param {Array} opcoes.correcoesUsuario - Correções do usuário sobre análise anterior
 * @param {string} opcoes.observacoesUsuario - Observações livres do usuário
 * @returns {string} Prompt otimizado
 */
export function construirPromptDocumento(tipoDocumento, cliente = {}, opcoes = {}) {
  const guide = getGuide(tipoDocumento);
  const { correcoesUsuario, observacoesUsuario } = opcoes;

  let prompt;
  if (guide) {
    prompt = construirPromptComGuia(guide, cliente);
  } else {
    prompt = construirPromptGenerico(tipoDocumento);
  }

  // Se há correções do usuário, incluir no prompt para reanálise
  if (correcoesUsuario?.length > 0 || observacoesUsuario) {
    prompt += '\n\nIMPORTANTE - CORREÇÕES DO REVISOR HUMANO sobre análise anterior:';
    if (correcoesUsuario?.length > 0) {
      correcoesUsuario.forEach(c => {
        prompt += `\n- O item "${c.item}" foi marcado como INCORRETO pelo revisor.`;
        if (c.nota) prompt += ` Motivo: ${c.nota}`;
      });
    }
    if (observacoesUsuario) {
      prompt += `\n\nOBSERVAÇÕES DO REVISOR: ${observacoesUsuario}`;
    }
    prompt += '\n\nReleia o documento com atenção redobrada nos pontos acima. O revisor afirma que esses dados EXISTEM no documento. Procure com cuidado antes de reportar como ausente.';
  }

  return prompt;
}

/**
 * Constrói prompt com guia de análise
 */
function construirPromptComGuia(guide, cliente) {
  const regras = guide.regras.join('\n- ');
  const checklistItems = guide.checklist
    .map(c => `- ${c.item}${c.critico ? ' (CRÍTICO)' : ''}`)
    .join('\n');

  return `Você está analisando o documento "${guide.nome}" anexado nas imagens/arquivos abaixo.

IMPORTANTE: O documento FOI ANEXADO. Leia atentamente TODO o conteúdo visível nas imagens antes de responder. NÃO diga que o documento não foi anexado ou que informações estão ausentes sem antes procurar cuidadosamente em todas as páginas do documento.

EMPRESA: ${cliente?.razao_social || 'N/A'} | CNPJ: ${cliente?.cnpj || 'N/A'}

REGRAS DE ANÁLISE:
- ${regras}

CHECKLIST DE VERIFICAÇÃO:
${checklistItems}

INSTRUÇÕES:
1. Leia o documento anexado com atenção
2. Extraia todos os dados visíveis (titular, endereço, datas, valores, etc.)
3. Para cada item do checklist, verifique se o documento atende
4. Só marque como CRÍTICO se realmente NÃO encontrar a informação após leitura cuidadosa
5. Se encontrar a informação, marque como OK e inclua o dado na observação

RESPONDA EM JSON APENAS:
{
  "dados_extraidos": {"titular": "", "endereco": "", "data_referencia": "", "valor": "", ...},
  "checklist_verificacao": [{"item": "", "status": "OK|ALERTA|CRÍTICO", "observacao": "descreva o que encontrou ou não"}],
  "indicadores_alerta": [{"tipo": "", "severidade": "critica|media|leve", "descricao": ""}],
  "resumo": "análise breve do documento",
  "classificacao_final": "APROVADO|INCONSISTENTE"
}`;
}

/**
 * Constrói prompt genérico
 */
function construirPromptGenerico(tipoDocumento) {
  return `Você está analisando um documento do tipo "${tipoDocumento}" anexado nas imagens/arquivos abaixo.

IMPORTANTE: O documento FOI ANEXADO. Leia atentamente TODO o conteúdo visível antes de responder. NÃO diga que o documento não foi anexado ou que informações estão ausentes sem antes procurar cuidadosamente.

ANALISE:
1. Extraia todos os dados principais visíveis no documento (nomes, datas, valores, endereços, etc.)
2. Verifique período de referência
3. Avalie legibilidade
4. Identifique alertas críticos (somente se realmente houver)
5. Classifique se aprovável

RESPONDA EM JSON:
{
  "dados_extraidos": {"titular": "", "endereco": "", "data_referencia": "", "valor": "", ...},
  "checklist_verificacao": [{"item": "", "status": "OK|ALERTA|CRÍTICO", "observacao": "descreva o que encontrou"}],
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