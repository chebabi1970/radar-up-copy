// ========== LOGGING SEGURO (SEM DADOS SENSÍVEIS) ==========

const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '[EMAIL]';
  const [name, domain] = email.split('@');
  if (!name || !domain) return '[EMAIL]';
  return name.charAt(0) + '*'.repeat(Math.max(name.length - 2, 1)) + '@' + domain;
};

const maskId = (id) => {
  if (!id || typeof id !== 'string') return '[ID]';
  if (id.length < 6) return '[ID_CURTO]';
  return id.substring(0, 3) + '*'.repeat(id.length - 6) + id.substring(id.length - 3);
};

export const secureLog = (action, data = {}, severity = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    // Mascarar dados sensíveis antes de logar
    const safeData = { ...data };
    
    if (safeData.email) safeData.email = maskEmail(safeData.email);
    if (safeData.user_id) safeData.user_id = maskId(safeData.user_id);
    if (safeData.id) safeData.id = maskId(safeData.id);
    
    // Nunca logar senhas, tokens ou chaves
    delete safeData.password;
    delete safeData.token;
    delete safeData.secret;
    delete safeData.api_key;
    
    console.log(`[${severity.toUpperCase()}] ${action}`, safeData);
  }
};

export const logSecurityEvent = (eventType, details = {}) => {
  const event = {
    timestamp: new Date().toISOString(),
    type: eventType,
    details,
  };
  secureLog(`SECURITY_EVENT: ${eventType}`, event, 'warn');
};