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
    .map(c => `- ${c.item}${c.critico ? ' ⚠️ CRÍTICO' : ''}`)
    .join('\n');

  // Contexto adicional por tipo de documento
  const contextosEspeciais = obterContextoEspecial(guide, cliente);

  return `Você é um motor de auditoria documental especializado em processos de revisão de estimativa de capacidade financeira para habilitação no comércio exterior, conforme IN RFB nº 1.984/2020 e Portaria Coana nº 72/2020.

Você está analisando o documento: "${guide.nome}" (Código: ${guide.codigo || 'N/A'})

IMPORTANTE: O documento FOI ANEXADO. Leia atentamente TODO o conteúdo visível nas imagens antes de responder. NÃO diga que o documento não foi anexado ou que informações estão ausentes sem antes procurar cuidadosamente em TODAS as páginas.

━━━ DADOS DA EMPRESA ━━━
Razão Social: ${cliente?.razao_social || 'N/A'}
CNPJ: ${cliente?.cnpj || 'N/A'}
${cliente?.responsavel ? `Responsável: ${cliente.responsavel}` : ''}
${cliente?.endereco ? `Endereço: ${cliente.endereco}` : ''}

━━━ REGRAS DE ANÁLISE ━━━
- ${regras}
${contextosEspeciais}

━━━ CHECKLIST DE VERIFICAÇÃO ━━━
${checklistItems}

━━━ INSTRUÇÕES ━━━
1. Leia o documento com atenção total — verifique TODAS as páginas
2. Extraia todos os dados visíveis (titular, CNPJ, endereço, datas, valores, assinaturas, etc.)
3. Para cada item do checklist:
   - "OK": encontrou e confirma a informação (inclua o dado exato na observação)
   - "ALERTA": encontrou mas com ressalvas
   - "CRÍTICO": realmente NÃO encontrou após busca cuidadosa
4. Só marque CRÍTICO se realmente a informação está ausente — não assuma ausência sem procurar
5. Identifique inconsistências internas do documento (dados contraditórios entre si)

RESPONDA APENAS EM JSON:
{
  "dados_extraidos": {
    "titular": "",
    "cnpj": "",
    "endereco": "",
    "data_referencia": "",
    "valor": "",
    "periodo": "",
    "assinatura_presente": true
  },
  "checklist_verificacao": [
    {"item": "", "status": "OK|ALERTA|CRÍTICO", "observacao": "descreva exatamente o que encontrou ou não encontrou"}
  ],
  "indicadores_alerta": [
    {"tipo": "", "severidade": "critica|media|leve", "descricao": ""}
  ],
  "resumo": "análise objetiva do documento em 2-3 frases",
  "classificacao_final": "APROVADO|INCONSISTENTE"
}`;
}

/**
 * Retorna contexto especial para documentos com regras complexas
 */
function obterContextoEspecial(guide, cliente) {
  const extras = [];

  // IOF: incluir fórmula de cálculo
  if (guide.codigo === '5140') {
    extras.push(`
━━━ CÁLCULO DO IOF (OBRIGATÓRIO VERIFICAR) ━━━
Fórmula: IOF = (Valor do Mútuo × 0,0041% × Número de Dias) + (Valor do Mútuo × 0,38%)
Alíquota diária PJ: 0,0041% ao dia
Adicional fixo: 0,38% sobre o valor total
Código DARF obrigatório: 1150
Verifique se o valor do DARF corresponde ao cálculo acima.`);
  }

  // Extratos: alerta para todas as entradas
  if (guide.codigo === '5100' || guide.codigo === '5100b') {
    extras.push(`
━━━ ATENÇÃO ESPECIAL — ENTRADAS/CRÉDITOS NOS EXTRATOS ━━━
CRÍTICO: Este documento DEVE CONTER créditos/entradas que comprovem a capacidade financeira.
Para CADA entrada/crédito identificado no extrato:
  1. Registre o valor, data e descrição exata
  2. Gere um alerta específico solicitando comprovação de ORIGEM
  3. Origens aceitas: NF de venda, contrato de mútuo, aumento de capital integralizado, adiantamento de cliente, empréstimo bancário
  4. Qualquer entrada sem origem clara = alerta crítico

No checklist, inclua obrigatoriamente:
  - "Existência de créditos/entradas no período" (OK se houver, CRÍTICO se período vazio/apenas débitos)
  - Para cada entrada significativa: "Origem comprovada para crédito de R$ [valor] em [data]" (ALERTA se sem comprovante)

Se o extrato mostrar apenas débitos ou movimentação nula, classifique como CRÍTICO.`);
  }

  // Balancete: cruzamento obrigatório com extratos
  if (guide.codigo === '6100') {
    extras.push(`
━━━ CRUZAMENTO CRÍTICO — BALANCETE vs EXTRATO ━━━
O saldo da conta Bancos/Caixa no balancete DEVE SER IDÊNTICO ao saldo final do extrato bancário do mesmo mês.
Qualquer diferença, por menor que seja, é uma INCONSISTÊNCIA CRÍTICA (tolerância zero).`);
  }

  // Contrato social: capital integralizado
  if (guide.codigo === '3100') {
    extras.push(`
━━━ VERIFICAÇÃO CRÍTICA — CAPITAL SOCIAL ━━━
Identifique se o capital social está:
a) "Subscrito e integralizado" → situação regular
b) "Subscrito e a integralizar" → situação pendente (gerar alerta crítico)
c) Integralização em bens → gerar alerta (RFB pode questionar)
Se houve aporte de capital nos últimos 60 meses, a comprovação bancária é OBRIGATÓRIA.`);
  }

  // Mútuo: identificar se mutuante é PJ ou PF
  if (guide.codigo === '5120/5130') {
    extras.push(`
━━━ VERIFICAÇÃO — NATUREZA DO MUTUANTE ━━━
Identifique se o mutuante (quem emprestou) é:
- Pessoa Jurídica (PJ): IOF obrigatório (DARF código 1150) + balancetes 3 meses + contrato social do mutuante
- Pessoa Física (PF): IOF não se aplica
Informe na análise a natureza do mutuante identificada.`);
  }

  // IPTU: em nome de terceiros
  if (guide.codigo === '3120') {
    extras.push(`
━━━ VERIFICAÇÃO — TITULARIDADE DO IPTU ━━━
Se o IPTU estiver em nome de terceiros (não da empresa), é OBRIGATÓRIO que exista:
- Contrato de locação válido, OU
- Contrato de comodato
Informe na análise o nome do proprietário identificado no IPTU.`);
  }

  return extras.join('\n');
}

/**
 * Constrói prompt genérico
 */
function construirPromptGenerico(tipoDocumento) {
  return `Você é um motor de auditoria documental especializado em processos de revisão de estimativa de capacidade financeira para habilitação no comércio exterior, conforme IN RFB nº 1.984/2020 e Portaria Coana nº 72/2020.

Você está analisando um documento do tipo "${tipoDocumento}" anexado nas imagens/arquivos abaixo.

IMPORTANTE: O documento FOI ANEXADO. Leia atentamente TODO o conteúdo visível antes de responder. NÃO diga que o documento não foi anexado ou que informações estão ausentes sem antes procurar cuidadosamente em TODAS as páginas.

ANALISE:
1. Extraia todos os dados principais visíveis (nomes, CNPJ, datas, valores, endereços, assinaturas, etc.)
2. Verifique período de referência e validade
3. Verifique titularidade (se pertence à empresa correta)
4. Identifique inconsistências internas do documento
5. Identifique alertas críticos (somente se realmente houver, após busca cuidadosa)
6. Classifique se aprovável para o processo de habilitação RADAR

RESPONDA APENAS EM JSON:
{
  "dados_extraidos": {"titular": "", "cnpj": "", "endereco": "", "data_referencia": "", "valor": "", "periodo": ""},
  "checklist_verificacao": [{"item": "", "status": "OK|ALERTA|CRÍTICO", "observacao": "descreva exatamente o que encontrou ou não"}],
  "indicadores_alerta": [{"tipo": "", "severidade": "critica|media|leve", "descricao": ""}],
  "resumo": "análise objetiva do documento em 2-3 frases",
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