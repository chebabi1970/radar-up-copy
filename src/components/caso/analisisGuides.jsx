// Guias de análise baseadas no Prompt-Mestre
// IN RFB nº 1.984/2020 e Portaria Coana nº 72/2020

export const analysisGuides = {
  procuracao: {
    nome: 'Procuração',
    regras: [
      'Rogério Zarattini Chebabi deve ser outorgado (obrigatório)',
      'Outros advogados podem estar presentes',
      'Nome deve coincidir com OAB ou CNH',
      'Divergência de nome = inconsistência crítica',
      'Deve conter reconhecimento de firma'
    ],
    checklist: [
      { item: 'Rogério Zarattini Chebabi como outorgado', critico: true },
      { item: 'Nome idêntico ao documento de identidade', critico: true },
      { item: 'Reconhecimento de firma em cartório', critico: false },
      { item: 'Poderes para comércio exterior', critico: false }
    ],
    validacoes: ['nome_rogério', 'reconhecimento_firma'],
    cruzamentos: ['documento_identificacao_procurador']
  },

  extrato_bancario_corrente: {
    nome: 'Extrato Bancário',
    regras: [
      'Exigir 3 meses imediatamente anteriores ao protocolo',
      'Aceitar múltiplos bancos e aplicações',
      'Identificar saldo do último dia do mês para cada extrato',
      'Gerar alerta automático de TODAS as entradas, exigindo origem e lastro',
      'Se <3 meses = alerta de falta de documentação'
    ],
    checklist: [
      { item: 'Período: 3 meses anteriores ao protocolo', critico: true },
      { item: 'Saldo final do último dia do mês identificado', critico: true },
      { item: 'Banco e agência identificados', critico: false },
      { item: 'Todos os depósitos com origem rastreável', critico: true }
    ],
    validacoes: ['saldo_final_mes', 'origem_depositos'],
    cruzamentos: ['balancete_verificacao', 'contrato_mutuo', 'comprovante_transferencia']
  },

  balancete_verificacao: {
    nome: 'Balancete de Verificação',
    regras: [
      'Exigir 3 últimos meses anteriores ao protocolo',
      'Conta Bancos deve existir no balancete mais recente',
      'Saldo de Bancos deve ser idêntico ao saldo final do extrato',
      'Qualquer divergência = inconsistência crítica (tolerância zero)',
      'Balancete deve estar equilibrado (débitos = créditos)'
    ],
    checklist: [
      { item: 'Período: 3 meses anteriores ao protocolo', critico: true },
      { item: 'Conta Bancos/Caixa existe', critico: true },
      { item: 'Saldo Bancos = saldo extrato (tolerância zero)', critico: true },
      { item: 'Balancete equilibrado', critico: true },
      { item: 'Contas de capital social compatíveis', critico: false }
    ],
    validacoes: ['saldo_bancos_vs_extrato', 'balancete_equilibrado'],
    cruzamentos: ['extrato_bancario_corrente', 'contrato_social']
  },

  contrato_social: {
    nome: 'Contrato Social / Ato Constitutivo',
    regras: [
      'Juntar TODOS os contratos e alterações (não apenas consolidado)',
      'Identificar capital inicial, datas, aportes, forma de integralização',
      'Mapear datas exatas de capital/aportes',
      'Se capital nos últimos 60 meses = exigir comprovação bancária',
      'Alertar capital subscrito vs integralizado',
      'Alertar integralização em bens'
    ],
    checklist: [
      { item: 'Todos os contratos e alterações presentes', critico: true },
      { item: 'Capital inicial identificado', critico: true },
      { item: 'Datas de aportes mapeadas', critico: true },
      { item: 'Se <60 meses: integralização comprovada bancariamente', critico: true },
      { item: 'Sócios identificados com CPF', critico: false }
    ],
    validacoes: ['capital_integralizado', 'datas_aportes'],
    cruzamentos: ['extrato_bancario_corrente', 'certidao_junta_comercial', 'contrato_mutuo']
  },

  contrato_mutuo: {
    nome: 'Contrato de Mútuo',
    regras: [
      'Obrigatório registro em cartório',
      'Deve conter: valor, parcelas, juros, garantias',
      'Se mutuante PJ: exigir IOF + balancetes (3m) + contrato social',
      'Se mutuante PF: IOF não aplicável',
      'Valor deve corresponder EXATAMENTE ao depósito no extrato'
    ],
    checklist: [
      { item: 'Registrado em cartório', critico: true },
      { item: 'Valor definido', critico: true },
      { item: 'Prazo definido', critico: false },
      { item: 'Se mutuante PJ: IOF recolhido', critico: true },
      { item: 'Valor = depósito no extrato (tolerância zero)', critico: true }
    ],
    validacoes: ['valor_mutuo', 'iof_recolhido'],
    cruzamentos: ['extrato_bancario_corrente', 'comprovante_iof', 'balancete_verificacao']
  },

  comprovante_iof: {
    nome: 'Comprovante IOF',
    regras: [
      'Exigido se mutuante for PJ',
      'Deve conter: DARF, código receita correto, valor, data',
      'Data deve ser próxima à data do contrato (<30 dias)',
      'Valor deve corresponder ao contrato de mútuo'
    ],
    checklist: [
      { item: 'DARF ou comprovante oficial', critico: true },
      { item: 'Código de receita correto', critico: true },
      { item: 'Data próxima ao contrato (<30 dias)', critico: true },
      { item: 'Valor = mútuo (tolerância zero)', critico: true }
    ],
    validacoes: ['valor_iof', 'data_iof'],
    cruzamentos: ['contrato_mutuo']
  },

  conta_energia: {
    nome: 'Comprovante de Domicílio - Energia',
    regras: [
      'Exigir 3 últimos meses',
      'Sempre em nome da empresa',
      'Endereço deve ser IDÊNTICO ao CNPJ',
      'Conta não pode estar com débito'
    ],
    checklist: [
      { item: 'Últimos 3 meses presentes', critico: true },
      { item: 'Sempre em nome da empresa', critico: true },
      { item: 'Endereço = CNPJ', critico: true },
      { item: 'Sem débitos', critico: false }
    ],
    validacoes: ['endereco_vs_cnpj', 'titularidade'],
    cruzamentos: ['certidao_junta_comercial', 'contrato_social']
  },

  plano_internet: {
    nome: 'Comprovante de Domicílio - Internet',
    regras: [
      'Exigir 3 últimos meses',
      'Sempre em nome da empresa',
      'Endereço deve ser IDÊNTICO ao CNPJ',
      'Serviço deve estar ativo'
    ],
    checklist: [
      { item: 'Últimos 3 meses presentes', critico: true },
      { item: 'Sempre em nome da empresa', critico: true },
      { item: 'Endereço = CNPJ', critico: true },
      { item: 'Serviço ativo', critico: false }
    ],
    validacoes: ['endereco_vs_cnpj', 'titularidade'],
    cruzamentos: ['certidao_junta_comercial', 'contrato_social']
  },

  contrato_locacao: {
    nome: 'Contrato de Locação',
    regras: [
      'Sempre em nome da empresa',
      'Exigir 3 últimos recibos (se contrato antigo)',
      'Pagamento deve sair da conta da empresa',
      'Endereço = endereço do CNPJ',
      'Contrato deve ser válido'
    ],
    checklist: [
      { item: 'Em nome da empresa', critico: true },
      { item: '3 últimos recibos ou contrato recente', critico: true },
      { item: 'Endereço = CNPJ', critico: true },
      { item: 'Pagamento rastreável no extrato', critico: true },
      { item: 'Contrato válido', critico: false }
    ],
    validacoes: ['titularidade', 'endereco_vs_cnpj', 'pagamentos_rastreados'],
    cruzamentos: ['extrato_bancario_corrente', 'certidao_junta_comercial']
  },

  certidao_junta_comercial: {
    nome: 'Certidão da Junta Comercial',
    regras: [
      'Apenas uma, a mais recente',
      'Deve conter: empresa, CNPJ, endereço, sócios, histórico completo',
      'Divergência com contratos = inconsistência grave',
      'É a âncora após Cartão CNPJ'
    ],
    checklist: [
      { item: 'Certidão recente (< 3 meses)', critico: true },
      { item: 'CNPJ correto', critico: true },
      { item: 'Razão social correta', critico: true },
      { item: 'Endereço correto', critico: true },
      { item: 'Sócios = contrato social', critico: true }
    ],
    validacoes: ['cnpj', 'razao_social', 'endereco', 'socios'],
    cruzamentos: ['contrato_social', 'conta_energia', 'plano_internet', 'contrato_locacao']
  },

  documento_identificacao_procurador: {
    nome: 'Documento de Identificação do Procurador',
    regras: [
      'Documento válido (não expirado)',
      'Foto legível',
      'Dados completos (nome, CPF)',
      'Deve coincidir EXATAMENTE com procuração (crítico)',
      'Original ou cópia autenticada'
    ],
    checklist: [
      { item: 'Documento válido (não expirado)', critico: true },
      { item: 'Nome = procuração', critico: true },
      { item: 'CPF = procuração', critico: true },
      { item: 'Foto legível', critico: false }
    ],
    validacoes: ['nome_vs_procuracao', 'cpf_vs_procuracao', 'validade'],
    cruzamentos: ['procuracao']
  }
};

export const getGuide = (tipoDocumento) => {
  return analysisGuides[tipoDocumento] || null;
};