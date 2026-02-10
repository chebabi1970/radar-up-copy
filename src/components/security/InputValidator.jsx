// ========== VALIDAÇÃO DE INPUTS ==========

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const sanitizeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  // Remove tags HTML/scripts
  let clean = text.replace(/<[^>]*>/g, '');
  clean = clean.replace(/javascript:/gi, '');
  clean = clean.replace(/on\w+\s*=/gi, '');
  return clean;
};

export const validateFileUpload = (file, maxSizeMB = 10, allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']) => {
  const errors = [];
  
  if (!file) {
    errors.push('Arquivo não selecionado');
    return { valid: false, errors };
  }

  // Validar tamanho
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    errors.push(`Arquivo excede tamanho máximo de ${maxSizeMB}MB`);
  }

  // Validar tipo (whitelist)
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Tipo de arquivo não permitido. Aceitos: ${allowedTypes.join(', ')}`);
  }

  // Validar nome do arquivo (evitar path traversal)
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    errors.push('Nome de arquivo inválido');
  }

  return { valid: errors.length === 0, errors };
};

export const validateInputLength = (input, maxLength = 5000) => {
  if (typeof input === 'string' && input.length > maxLength) {
    return { valid: false, error: `Entrada excede limite de ${maxLength} caracteres` };
  }
  return { valid: true };
};

export const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};