/**
 * Módulo de Sanitização de Prompts para Proteção contra LLM Injection
 * 
 * Protege contra ataques de prompt injection que tentam manipular
 * a IA para revelar dados sensíveis ou gerar resultados fraudulentos.
 */

/**
 * Padrões perigosos que podem indicar tentativa de prompt injection
 */
const DANGEROUS_PATTERNS = [
  /ignore\s+(previous|all|above|prior)\s+instructions?/gi,
  /forget\s+(everything|all|previous)/gi,
  /new\s+instructions?:/gi,
  /system\s*:/gi,
  /you\s+are\s+now/gi,
  /act\s+as\s+(a|an)/gi,
  /pretend\s+(you|to\s+be)/gi,
  /reveal\s+(all|the|confidential)/gi,
  /show\s+me\s+(all|the)/gi,
  /return\s+(all|everything)/gi,
  /database/gi,
  /sql\s+query/gi,
  /admin\s+access/gi,
  /bypass/gi,
  /override/gi,
  /<script>/gi,
  /javascript:/gi,
  /eval\(/gi,
  /exec\(/gi
];

/**
 * Caracteres especiais que devem ser escapados
 */
const SPECIAL_CHARS = /[<>\"'`${}]/g;

/**
 * Sanitiza texto extraído de documentos antes de enviar para LLM
 * 
 * @param {string} text - Texto a ser sanitizado
 * @param {Object} options - Opções de sanitização
 * @param {number} options.maxLength - Comprimento máximo permitido (default: 10000)
 * @param {boolean} options.removeSpecialChars - Remover caracteres especiais (default: true)
 * @param {boolean} options.checkDangerousPatterns - Verificar padrões perigosos (default: true)
 * @returns {Object} { sanitized: string, warnings: string[] }
 */
export function sanitizePromptInput(text, options = {}) {
  const {
    maxLength = 10000,
    removeSpecialChars = true,
    checkDangerousPatterns = true
  } = options;

  const warnings = [];
  let sanitized = text || '';

  // 1. Limitar comprimento
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    warnings.push(`Texto truncado para ${maxLength} caracteres`);
  }

  // 2. Verificar padrões perigosos
  if (checkDangerousPatterns) {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        warnings.push(`Padrão suspeito detectado: ${pattern.source}`);
        // Remover o padrão perigoso
        sanitized = sanitized.replace(pattern, '[REMOVIDO]');
      }
    }
  }

  // 3. Remover/escapar caracteres especiais
  if (removeSpecialChars) {
    sanitized = sanitized.replace(SPECIAL_CHARS, '');
  }

  // 4. Normalizar espaços em branco
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // 5. Remover sequências repetitivas suspeitas
  sanitized = sanitized.replace(/(.)\1{10,}/g, '$1$1$1'); // Limita repetições a 3

  return {
    sanitized,
    warnings,
    isSafe: warnings.length === 0
  };
}

/**
 * Templates seguros de prompts para análise de documentos
 * Usa placeholders que são substituídos por dados sanitizados
 */
export const SAFE_PROMPT_TEMPLATES = {
  ANALISE_DOCUMENTO: `Analise o seguinte documento do tipo {{TIPO_DOCUMENTO}}.
  
Extraia as seguintes informações:
- CNPJ/CPF (se houver)
- Razão Social/Nome
- Endereço
- Valores financeiros
- Datas relevantes

Documento:
{{CONTEUDO_DOCUMENTO}}

Retorne APENAS um objeto JSON com as informações extraídas, sem comentários adicionais.`,

  ANALISE_CRUZADA: `Compare os seguintes dados extraídos de dois documentos:

Documento 1 ({{TIPO_DOC_1}}):
{{DADOS_DOC_1}}

Documento 2 ({{TIPO_DOC_2}}):
{{DADOS_DOC_2}}

Identifique inconsistências entre:
- CNPJ/Razão Social
- Valores financeiros
- Datas
- Endereços

Retorne APENAS um objeto JSON com as inconsistências encontradas.`,

  VALIDACAO_CONFORMIDADE: `Valide se o documento do tipo {{TIPO_DOCUMENTO}} está conforme os requisitos:

Requisitos:
{{REQUISITOS}}

Dados do documento:
{{DADOS_DOCUMENTO}}

Retorne APENAS um objeto JSON indicando conformidade (true/false) e motivos de não conformidade.`
};

/**
 * Cria um prompt seguro usando template e dados sanitizados
 * 
 * @param {string} templateKey - Chave do template (ex: 'ANALISE_DOCUMENTO')
 * @param {Object} data - Dados para substituir nos placeholders
 * @returns {Object} { prompt: string, warnings: string[] }
 */
export function createSafePrompt(templateKey, data) {
  const template = SAFE_PROMPT_TEMPLATES[templateKey];
  
  if (!template) {
    throw new Error(`Template não encontrado: ${templateKey}`);
  }

  let prompt = template;
  const allWarnings = [];

  // Substituir cada placeholder por dados sanitizados
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    
    if (prompt.includes(placeholder)) {
      // Sanitizar o valor antes de inserir
      const { sanitized, warnings } = sanitizePromptInput(String(value), {
        maxLength: key.includes('CONTEUDO') ? 10000 : 1000
      });
      
      prompt = prompt.replace(placeholder, sanitized);
      allWarnings.push(...warnings);
    }
  }

  // Verificar se ainda há placeholders não substituídos
  const remainingPlaceholders = prompt.match(/{{[A-Z_]+}}/g);
  if (remainingPlaceholders) {
    allWarnings.push(`Placeholders não substituídos: ${remainingPlaceholders.join(', ')}`);
  }

  return {
    prompt,
    warnings: allWarnings,
    isSafe: allWarnings.length === 0
  };
}

/**
 * Valida resposta da LLM para garantir que está no formato esperado
 * 
 * @param {string} response - Resposta da LLM
 * @param {Object} expectedSchema - Schema esperado (opcional)
 * @returns {Object} { isValid: boolean, parsed: any, errors: string[] }
 */
export function validateLLMResponse(response, expectedSchema = null) {
  const errors = [];
  let parsed = null;

  try {
    // Tentar parsear como JSON
    parsed = JSON.parse(response);
  } catch (e) {
    errors.push('Resposta não é um JSON válido');
    return { isValid: false, parsed: null, errors };
  }

  // Verificar se não contém padrões suspeitos
  const responseStr = JSON.stringify(parsed);
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(responseStr)) {
      errors.push(`Padrão suspeito na resposta: ${pattern.source}`);
    }
  }

  // Validar contra schema se fornecido
  if (expectedSchema && parsed) {
    for (const key of Object.keys(expectedSchema)) {
      if (!(key in parsed)) {
        errors.push(`Campo obrigatório ausente: ${key}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    parsed,
    errors
  };
}

/**
 * Exemplo de uso:
 * 
 * // Criar prompt seguro
 * const { prompt, warnings } = createSafePrompt('ANALISE_DOCUMENTO', {
 *   TIPO_DOCUMENTO: 'Balancete de Verificação',
 *   CONTEUDO_DOCUMENTO: textoExtraidoDoPDF
 * });
 * 
 * if (!warnings.length) {
 *   // Enviar para LLM
 *   const response = await callLLM(prompt);
 *   
 *   // Validar resposta
 *   const { isValid, parsed, errors } = validateLLMResponse(response);
 *   
 *   if (isValid) {
 *     // Usar dados extraídos
 *     console.log(parsed);
 *   } else {
 *     console.error('Resposta inválida:', errors);
 *   }
 * } else {
 *   console.warn('Avisos de sanitização:', warnings);
 * }
 */
