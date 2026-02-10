/**
 * POLÍTICA DE SEGURANÇA DE CONTEÚDO (CSP)
 * RADAR UP - Proteção contra XSS e Injection Attacks
 * 
 * ⚠️ IMPLEMENTAR NO BACKEND:
 * Este arquivo documenta a CSP que deve ser configurada no servidor
 */

// ========== IMPLEMENTAÇÃO NO BACKEND (Node.js/Express) ==========
// Instalar: npm install helmet
// 
// import helmet from 'helmet';
// app.use(helmet.contentSecurityPolicy({
//   directives: {
//     defaultSrc: ["'self'"],
//     scriptSrc: [
//       "'self'",
//       "'unsafe-inline'", // React needs this (considerar remover com refinamento)
//       "https://trusted-cdn.com" // CDNs confiáveis apenas
//     ],
//     styleSrc: [
//       "'self'",
//       "'unsafe-inline'",
//       "https://fonts.googleapis.com"
//     ],
//     fontSrc: [
//       "'self'",
//       "https://fonts.gstatic.com"
//     ],
//     imgSrc: [
//       "'self'",
//       "data:",
//       "https:" // HTTPS apenas
//     ],
//     connectSrc: [
//       "'self'",
//       "https://api.example.com" // Seu domínio de API
//     ],
//     frameSrc: ["'none'"], // Previne clickjacking
//     objectSrc: ["'none'"],
//     mediaSrc: ["'self'"],
//     childSrc: ["'none'"]
//   }
// }));

// ========== HEADERS DE SEGURANÇA ADICIONAIS ==========
// app.use(helmet.hsts({
//   maxAge: 31536000, // 1 ano
//   includeSubDomains: true,
//   preload: true
// }));
// 
// app.use(helmet.frameguard({ action: 'deny' })); // Previne clickjacking
// app.use(helmet.xssFilter()); // Proteção XSS do navegador
// app.use(helmet.noSniff()); // Previne MIME-sniffing
// app.use(helmet.hidePoweredBy()); // Remove header X-Powered-By

// ========== CORS RESTRITIVO ==========
// import cors from 'cors';
// 
// app.use(cors({
//   origin: [
//     'https://app.example.com',
//     'https://admin.example.com'
//     // NUNCA: 'http://localhost' em produção
//   ],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   maxAge: 86400 // 24 horas
// }));

// ========== PROTEÇÃO CONTRA CSRF ==========
// import csrf from 'csurf';
// const csrfProtection = csrf({ cookie: false }); // Token-based
// 
// app.post('/api/sensitive-operation', csrfProtection, (req, res) => {
//   // CSRF token validado automaticamente
// });

/**
 * Frontend: Inclui este hook para requisições seguras
 * 
 * import { useEffect, useState } from 'react';
 * 
 * export const useCSRFToken = () => {
 *   const [token, setToken] = useState(null);
 *   
 *   useEffect(() => {
 *     // Buscar token CSRF do servidor
 *     fetch('/api/csrf-token')
 *       .then(r => r.json())
 *       .then(data => setToken(data.token))
 *       .catch(e => console.error('CSRF token fetch failed', e));
 *   }, []);
 *   
 *   return token;
 * };
 */

/**
 * EXEMPLO: Requisição com proteção CSRF
 * 
 * const csrfToken = useCSRFToken();
 * 
 * fetch('/api/sensitive-operation', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-CSRF-Token': csrfToken  // ← CSRF token
 *   },
 *   body: JSON.stringify({ data })
 * });
 */

/**
 * PROTEÇÃO CONTRA XSS NO FRONTEND
 */
export const xssProtectionHeaders = {
  // Use sempre em requisições sensíveis
  'X-Requested-With': 'XMLHttpRequest',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

/**
 * VALIDAÇÃO DE URL ANTES DE REDIRECIONAR
 */
export const isSafeRedirectURL = (url) => {
  try {
    // Se for URL relativa, é segura
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }
    
    // Se for URL absoluta, validar protocolo e host
    const urlObj = new URL(url);
    
    // Apenas HTTPS em produção
    if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Validar domínio
    const allowedDomains = [
      'app.example.com',
      'admin.example.com',
      // Adicionar apenas domínios confiáveis
    ];
    
    return allowedDomains.includes(urlObj.hostname);
  } catch (e) {
    return false;
  }
};

/**
 * SANITIZAÇÃO DE ATRIBUTOS HTML
 */
export const sanitizeHTMLAttributes = (element, allowedAttrs = []) => {
  // Remover todos os atributos exceto os permitidos
  const attrs = element.attributes;
  for (let i = attrs.length - 1; i >= 0; i--) {
    const attr = attrs[i];
    if (!allowedAttrs.includes(attr.name)) {
      element.removeAttribute(attr.name);
    }
  }
  return element;
};

/**
 * PROTEÇÃO CONTRA CLICKJACKING
 * Use no Layout.js:
 * 
 * useEffect(() => {
 *   // Verificar se está em iframe
 *   if (window.self !== window.top) {
 *     // Está sendo exibido em iframe não autorizado
 *     window.top.location = window.self.location;
 *   }
 * }, []);
 */

export default {
  xssProtectionHeaders,
  isSafeRedirectURL,
  sanitizeHTMLAttributes
};