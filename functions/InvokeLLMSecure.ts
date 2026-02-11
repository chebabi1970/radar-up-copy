import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ========== RATE LIMITING ==========
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(userEmail) {
  const now = Date.now();
  const userLimits = rateLimitMap.get(userEmail) || { count: 0, windowStart: now };
  
  if (now - userLimits.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userEmail, { count: 1, windowStart: now });
    return true;
  }
  
  if (userLimits.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  userLimits.count++;
  rateLimitMap.set(userEmail, userLimits);
  return true;
}

// ========== VALIDAÇÃO DE PROMPT INJECTION ==========
const DANGEROUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions?/i,
  /forget\s+(everything|all|previous)/i,
  /new\s+instructions?/i,
  /system\s+prompt/i,
  /override\s+(settings?|rules?|instructions?)/i,
  /disregard\s+(previous|all)/i,
  /jailbreak/i,
  /pretend\s+you\s+are/i,
  /role[:\s]*admin/i,
  /\bsudo\b/i,
  /developer\s+mode/i,
];

const SUSPICIOUS_KEYWORDS = [
  'ignore', 'override', 'bypass', 'hack', 'exploit', 
  'jailbreak', 'prompt', 'system', 'instruction', 'forget'
];

function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { isValid: false, reason: 'Prompt inválido' };
  }

  if (prompt.length > 10000) {
    return { isValid: false, reason: 'Prompt muito longo' };
  }

  // Verifica padrões perigosos
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(prompt)) {
      return { 
        isValid: false, 
        reason: 'Prompt contém tentativa de manipulação detectada',
        pattern: pattern.toString()
      };
    }
  }

  // Verifica múltiplas palavras suspeitas
  const lowerPrompt = prompt.toLowerCase();
  const suspiciousCount = SUSPICIOUS_KEYWORDS.filter(kw => lowerPrompt.includes(kw)).length;
  
  if (suspiciousCount >= 3) {
    return { 
      isValid: false, 
      reason: 'Múltiplas palavras-chave suspeitas detectadas' 
    };
  }

  return { isValid: true };
}

// ========== SANITIZAÇÃO DE RESPOSTA ==========
function sanitizeResponse(response) {
  const FORBIDDEN_DISCLOSURES = [
    /system prompt/i,
    /my instructions/i,
    /i was programmed/i,
    /base44/i,
    /backend/i,
  ];

  let sanitized = response;
  
  for (const pattern of FORBIDDEN_DISCLOSURES) {
    if (pattern.test(sanitized)) {
      return {
        isSafe: false,
        message: 'Resposta bloqueada por conter informações confidenciais do sistema'
      };
    }
  }

  return { isSafe: true, content: sanitized };
}

// ========== LOGGING DE SEGURANÇA ==========
async function logSecurityEvent(base44, userEmail, eventType, details) {
  try {
    await base44.asServiceRole.entities.ReportErro.create({
      titulo: `[SEGURANÇA AI] ${eventType}`,
      descricao: JSON.stringify(details),
      usuario_email: userEmail,
      status: 'novo',
      prioridade: 'alta',
      pagina_origem: 'InvokeLLMSecure'
    });
  } catch (err) {
    console.error('Erro ao registrar evento de segurança:', err);
  }
}

// ========== HANDLER PRINCIPAL ==========
Deno.serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate Limiting
    if (!checkRateLimit(user.email)) {
      await logSecurityEvent(base44, user.email, 'RATE_LIMIT_EXCEEDED', {
        timestamp: new Date().toISOString()
      });
      
      return Response.json({ 
        error: 'Limite de requisições excedido. Tente novamente em 1 minuto.' 
      }, { status: 429 });
    }

    // Parse do corpo da requisição
    const { prompt, add_context_from_internet, response_json_schema, file_urls } = await req.json();

    // Validação do Prompt
    const validation = validatePrompt(prompt);
    if (!validation.isValid) {
      await logSecurityEvent(base44, user.email, 'PROMPT_INJECTION_ATTEMPT', {
        reason: validation.reason,
        pattern: validation.pattern,
        prompt_preview: prompt?.substring(0, 100)
      });
      
      return Response.json({ 
        error: 'Prompt bloqueado por medidas de segurança',
        reason: validation.reason
      }, { status: 400 });
    }

    // Validação do JSON Schema
    if (response_json_schema && typeof response_json_schema !== 'object') {
      return Response.json({ 
        error: 'response_json_schema deve ser um objeto' 
      }, { status: 400 });
    }

    // Invocar LLM com Service Role
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: add_context_from_internet || false,
      response_json_schema: response_json_schema || null,
      file_urls: file_urls || null
    });

    // Sanitizar resposta (apenas para texto)
    if (typeof result === 'string') {
      const sanitized = sanitizeResponse(result);
      
      if (!sanitized.isSafe) {
        await logSecurityEvent(base44, user.email, 'UNSAFE_RESPONSE_BLOCKED', {
          message: sanitized.message
        });
        
        return Response.json({ 
          error: 'Resposta bloqueada por conter informações confidenciais' 
        }, { status: 403 });
      }
      
      return Response.json({ result: sanitized.content });
    }

    // Resposta JSON já validada pelo schema
    return Response.json({ result });

  } catch (error) {
    console.error('Erro em InvokeLLMSecure:', error);
    return Response.json({ 
      error: 'Erro ao processar requisição',
      message: error.message 
    }, { status: 500 });
  }
});