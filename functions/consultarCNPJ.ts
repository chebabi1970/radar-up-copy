import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cnpj } = await req.json();
    if (!cnpj || cnpj.length !== 14) {
      return Response.json({ error: 'CNPJ inválido' }, { status: 400 });
    }

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'RADAR-UP/1.0' }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return Response.json({ error: err.message || 'CNPJ não encontrado na Receita Federal' }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});