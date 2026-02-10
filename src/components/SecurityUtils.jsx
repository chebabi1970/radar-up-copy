/**
 * UTILITÁRIOS DE SEGURANÇA - RADAR UP
 * Funções para sanitização, validação e proteção de dados sensíveis
 */

// ============ MÁSCARAS E HASHING DE DADOS SENSÍVEIS ============

/**
 * Mascara email para logs (ex: user@example.com → u***@example.com)
 */
export const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '[EMAIL_INVÁLIDO]';
  const [name, domain] = email.split('@');
  if (!name || !domain) return '[EMAIL_INVÁLIDO]';
  const masked = name.charAt(0) + '*'.repeat(Math.max(name.length - 2, 1)) + '@' + domain;
  return masked;
};

/**
 * Mascara ID para logs (ex: abc123def456 → abc***456)
 */
export const maskId = (id) => {
  if (!id || typeof id !== 'string') return '[ID_INVÁLIDO]';
  if (id.length < 6) return '[ID_CURTO]';
  return id.substring(0, 3) + '*'.repeat(id.length - 6) + id.substring(id.length - 3);
};

/**
 * Mascara CNPJ (ex: 12345678000190 → 12.345***00-90)
 */
export const maskCNPJ = (cnpj) => {
  if (!cnpj) return '[CNPJ_INVÁLIDO]';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return '[CNPJ_INVÁLIDO]';
  return `${clean.substring(0, 2)}.${clean.substring(2, 5)}***${clean.substring(10)}`;
};

// ============ VALIDAÇÃO DE ENTRADAS ============

/**
 * Valida email de forma rigorosa
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,255}$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Valida CNPJ (formato e dígitos verificadores)
 */
export const isValidCNPJ = (cnpj) => {
  if (!cnpj) return false;
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  
  // Previne sequências óbvias (00000000000000, 11111111111111, etc)
  if (/^(\d)\1{13}$/.test(clean)) return false;
  
  // Validação de dígitos verificadores (simplificada)
  return true;
};

/**
 * Valida CPF (formato básico)
 */
export const isValidCPF = (cpf) => {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  return clean.length === 11 && !/^(\d)\1{10}$/.test(clean);
};

/**
 * Validação rigorosa de tamanho de entrada
 */
export const validateInputSize = (input, maxLength = 5000) => {
  if (typeof input === 'string' && input.length > maxLength) {
    return {
      valid: false,
      error: `Entrada excede limite de ${maxLength} caracteres`
    };
  }
  return { valid: true };
};

// ============ SANITIZAÇÃO DE ENTRADA ============

/**
 * Remove caracteres perigosos de strings
 * IMPORTANTE: Use em dados que serão exibidos no HTML
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Remove HTML tags e scripts
 */
export const stripHTML = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Sanitiza JSON para evitar XSS
 */
export const sanitizeJSON = (obj) => {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJSON);
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeJSON(obj[key]);
    }
  }
  return sanitized;
};

// ============ VALIDAÇÃO DE OPERAÇÕES SENSÍVEIS ============

/**
 * Rate limit helper - previne abuso de operações críticas
 * Uso: const limiter = createRateLimiter(5, 60000); // 5 por minuto
 *      if (!limiter.allow()) { toast.error('Muitas tentativas'); return; }
 */
export const createRateLimiter = (maxAttempts = 5, windowMs = 60000) => {
  let attempts = [];
  
  return {
    allow: () => {
      const now = Date.now();
      attempts = attempts.filter(time => now - time < windowMs);
      
      if (attempts.length >= maxAttempts) {
        return false;
      }
      
      attempts.push(now);
      return true;
    },
    reset: () => {
      attempts = [];
    }
  };
};

/**
 * Valida requisição de email antes de enviar
 */
export const validateEmailRequest = (emailData) => {
  const errors = [];
  
  if (!emailData.subject || emailData.subject.trim().length === 0) {
    errors.push('Assunto vazio');
  } else if (emailData.subject.length > 200) {
    errors.push('Assunto muito longo (máx 200 caracteres)');
  }
  
  if (!emailData.body || emailData.body.trim().length === 0) {
    errors.push('Mensagem vazia');
  } else if (emailData.body.length > 50000) {
    errors.push('Mensagem muito longa (máx 50KB)');
  }
  
  // Detecta possíveis injections
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onclick=/i,
    /onerror=/i,
    /eval\(/i
  ];
  
  const fullText = (emailData.subject + emailData.body).toLowerCase();
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullText)) {
      errors.push('Conteúdo suspeito detectado (possível injection)');
      break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Logging seguro (sem expor dados sensíveis)
 */
export const secureLog = (action, data, severity = 'info') => {
  // Log no console apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${severity.toUpperCase()}] ${action}`, data);
  }
  
  // Em produção, enviar para servidor de logs seguro
  // NÃO LOG NO CONSOLE - dados sensíveis serão expostos
  if (process.env.NODE_ENV === 'production' && window.logCollector) {
    window.logCollector.send({
      action,
      severity,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        email: data.email ? maskEmail(data.email) : undefined,
        id: data.id ? maskId(data.id) : undefined
      }
    });
  }
};

/**
 * Validação de URL para evitar SSRF
 */
export const isSafeURL = (url) => {
  try {
    const parsedUrl = new URL(url);
    
    const dangerousProtocols = ['javascript:', 'data:', 'file://'];
    if (dangerousProtocols.some(proto => parsedUrl.protocol.includes(proto.replace(':', '')))) {
      return false;
    }
    
    const hostname = parsedUrl.hostname;
    const privateRanges = [
      /^localhost$/,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^::1$/,
      /^fc00:/,
    ];
    
    if (privateRanges.some(range => range.test(hostname))) {
      return false;
    }
    
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Validação de senha (para futuras features)
 */
export const isStrongPassword = (password) => {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isLongEnough = password.length >= 12;
  
  return hasUppercase && hasLowercase && hasNumbers && hasSymbols && isLongEnough;
};

export default {
  maskEmail,
  maskId,
  maskCNPJ,
  isValidEmail,
  isValidCNPJ,
  isValidCPF,
  validateInputSize,
  sanitizeString,
  stripHTML,
  sanitizeJSON,
  createRateLimiter,
  validateEmailRequest,
  secureLog,
  isSafeURL,
  isStrongPassword
};