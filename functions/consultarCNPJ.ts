import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const TOKEN_URL = 'https://apigateway.conectagov.estaleiro.serpro.gov.br/oauth2/jwt-token';
const EMPRESA_URL = 'https://apigateway.conectagov.estaleiro.serpro.gov.br/api-cnpj-empresa/v2/empresa';

async function getToken() {
  const key = Deno.env.get('SERPRO_CONSUMER_KEY');
  const secret = Deno.env.get('SERPRO_CONSUMER_SECRET');
  const credentials = btoa(`${key}:${secret}`);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Role-Type': 'TERCEIROS'
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Erro ao obter token SERPRO:', err);
    throw new Error('Falha na autenticação com a API da Receita Federal');
  }

  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cnpj } = await req.json();
    if (!cnpj || cnpj.length !== 14) {
      return Response.json({ error: 'CNPJ inválido' }, { status: 400 });
    }

    const token = await getToken();

    const res = await fetch(`${EMPRESA_URL}/${cnpj}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Erro SERPRO:', res.status, err);
      if (res.status === 404) {
        return Response.json({ error: 'CNPJ não encontrado na Receita Federal' }, { status: 404 });
      }
      return Response.json({ error: 'Erro ao consultar Receita Federal' }, { status: res.status });
    }

    const d = await res.json();

    // Montar endereço
    const end = d.endereco || {};
    const endereco = [
      end.tipoLogradouro,
      end.logradouro,
      end.numero,
      end.complemento,
      end.bairro,
      end.municipio?.descricao,
      end.uf
    ].filter(Boolean).join(', ');

    // Data de abertura: AAAAMMDD → AAAA-MM-DD
    const dataAbertura = d.dataAbertura
      ? `${d.dataAbertura.substring(0, 4)}-${d.dataAbertura.substring(4, 6)}-${d.dataAbertura.substring(6, 8)}`
      : '';

    // Capital social: últimos 2 dígitos são centavos
    const capitalSocial = d.capitalSocial
      ? parseFloat(d.capitalSocial) / 100
      : null;

    // Telefone principal
    const telefone = d.telefone?.length
      ? `(${d.telefone[0].ddd}) ${d.telefone[0].numero}`
      : '';

    // Sócios
    const qsa = d.socios?.length
      ? d.socios.map(s => `${s.nome} (${s.qualificacao?.descricao || 'Sócio'})`).join('\n')
      : '';

    // Simples Nacional
    const optanteSimples = d.informacoesAdicionais?.optanteSimples === 'S';

    return Response.json({
      razao_social: d.nomeEmpresarial || '',
      nome_fantasia: d.nomefantasia || '',
      email: d.correioEletronico || '',
      telefone,
      endereco,
      data_abertura_empresa: dataAbertura,
      capital_social: capitalSocial,
      qsa,
      optante_simples_nacional: optanteSimples,
      situacao_cadastral: d.situacaoCadastral?.motivo || ''
    });

  } catch (error) {
    console.error('Erro consultarCNPJ:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});