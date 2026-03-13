// Guias de análise baseados no Sistema de Análise Documental — RADAR
// Conforme IN RFB nº 1.984/2020 e Portaria Coana nº 72/2020

export const analysisGuides = {

  // ─── DOCUMENTO 1: Requerimento de Revisão (1100) ───
  requerimento_das: {
    nome: 'Requerimento de Revisão de Estimativa',
    codigo: '1100',
    regras: [
      'O documento deve estar totalmente preenchido',
      'A identificação do procurador só deve existir quando houver procurador',
      'Os documentos anexos devem estar etiquetados',
      'O requerimento deve conter assinatura digital válida'
    ],
    checklist: [
      { item: 'Nome da empresa presente', critico: true },
      { item: 'CNPJ da empresa presente', critico: true },
      { item: 'CPF do responsável presente', critico: true },
      { item: 'Identificação do procurador (se houver procurador)', critico: false },
      { item: 'Justificativa do pedido preenchida', critico: true },
      { item: 'Valor pretendido de estimativa informado', critico: true },
      { item: 'Assinatura digital válida', critico: true },
      { item: 'Documentos anexos etiquetados', critico: false }
    ],
    validacoes: ['cnpj', 'cpf_responsavel', 'valor_pretendido', 'assinatura'],
    cruzamentos: ['documento_identificacao_responsavel', 'procuracao']
  },

  // ─── DOCUMENTO 2: Identificação do responsável (2100) ───
  documento_identificacao_responsavel: {
    nome: 'Documento de Identificação do Responsável',
    codigo: '2100',
    regras: [
      'Documentos aceitos: RG, CNH ou Passaporte',
      'Deve conter nome completo',
      'Deve conter CPF',
      'Deve corresponder ao responsável pela empresa (sócio/administrador conforme contrato social)',
      'Documento não pode estar vencido'
    ],
    checklist: [
      { item: 'Tipo de documento válido (RG, CNH ou Passaporte)', critico: true },
      { item: 'Nome completo legível', critico: true },
      { item: 'CPF presente', critico: true },
      { item: 'Documento não vencido', critico: true },
      { item: 'Corresponde ao responsável da empresa', critico: true }
    ],
    validacoes: ['nome_completo', 'cpf', 'validade'],
    cruzamentos: ['requerimento_das', 'contrato_social']
  },

  // ─── DOCUMENTO 3: Procuração (2110) ───
  procuracao: {
    nome: 'Procuração',
    codigo: '2110',
    regras: [
      'Este documento somente existe se houver procurador',
      'Rogério Zarattini Chebabi deve estar como outorgado (obrigatório)',
      'Outros advogados podem estar presentes',
      'Nome deve coincidir EXATAMENTE com OAB ou CNH do procurador',
      'Divergência de nome = inconsistência crítica',
      'Deve conter poderes expressos para atuação perante a Receita Federal',
      'Deve conter poderes relacionados à habilitação ou revisão de estimativa',
      'Deve conter reconhecimento de firma em cartório'
    ],
    checklist: [
      { item: 'Rogério Zarattini Chebabi como outorgado', critico: true },
      { item: 'Nome idêntico ao documento de identidade do procurador', critico: true },
      { item: 'Poderes expressos para atuar perante a Receita Federal', critico: true },
      { item: 'Poderes relacionados à habilitação ou revisão de estimativa', critico: true },
      { item: 'Reconhecimento de firma em cartório', critico: false }
    ],
    validacoes: ['nome_rogerio', 'poderes_rfb', 'reconhecimento_firma'],
    cruzamentos: ['documento_identificacao_procurador']
  },

  // ─── DOCUMENTO 4: Identificação do procurador (2120) ───
  documento_identificacao_procurador: {
    nome: 'Documento de Identificação do Procurador',
    codigo: '2120',
    regras: [
      'Documentos aceitos: RG, CNH, Passaporte ou carteira OAB',
      'Deve conter nome completo',
      'Deve conter CPF',
      'Documento não pode estar vencido',
      'Deve coincidir EXATAMENTE com nome na procuração (crítico)'
    ],
    checklist: [
      { item: 'Tipo de documento válido (RG, CNH, Passaporte ou OAB)', critico: true },
      { item: 'Nome completo legível', critico: true },
      { item: 'CPF presente', critico: true },
      { item: 'Documento não vencido', critico: true },
      { item: 'Nome = nome na procuração (tolerância zero)', critico: true }
    ],
    validacoes: ['nome_vs_procuracao', 'cpf_vs_procuracao', 'validade'],
    cruzamentos: ['procuracao']
  },

  // ─── DOCUMENTO 5: Contrato Social (3100) ───
  contrato_social: {
    nome: 'Contrato Social e Alterações',
    codigo: '3100',
    regras: [
      'Devem ser apresentados o contrato social inicial E todas as alterações posteriores',
      'Não é suficiente apresentar apenas consolidação',
      'Identificar se o capital social está subscrito e integralizado OU subscrito e a integralizar (CRÍTICO)',
      'Mapear datas exatas de capital/aportes',
      'Se capital nos últimos 60 meses = exigir comprovação bancária',
      'Alertar integralização em bens',
      'Identificar mudanças de endereço, entrada/saída de sócios, aumentos e reduções de capital'
    ],
    checklist: [
      { item: 'Contrato social inicial presente', critico: true },
      { item: 'Todas as alterações posteriores presentes (não apenas consolidado)', critico: true },
      { item: 'Capital social identificado (valor)', critico: true },
      { item: 'Capital está subscrito e integralizado (não apenas subscrito)', critico: true },
      { item: 'Datas de todos os aportes mapeadas', critico: true },
      { item: 'Se aporte nos últimos 60 meses: comprovação bancária exigida', critico: true },
      { item: 'Sócios identificados com CPF', critico: false },
      { item: 'Histórico societário completo (entradas/saídas)', critico: false }
    ],
    validacoes: ['capital_integralizado', 'datas_aportes', 'todas_alteracoes'],
    cruzamentos: ['certidao_junta_comercial', 'extrato_bancario_corrente', 'contrato_mutuo']
  },

  // ─── DOCUMENTO 6: Certidão da Junta Comercial (3110) ───
  certidao_junta_comercial: {
    nome: 'Certidão da Junta Comercial',
    codigo: '3110',
    regras: [
      'Apenas uma, a mais recente',
      'Deve conter: razão social, CNPJ, capital social, sócios, histórico societário e alterações',
      'Divergência com contratos = inconsistência grave',
      'É a âncora de referência após Cartão CNPJ',
      'Certidão deve ter menos de 3 meses'
    ],
    checklist: [
      { item: 'Certidão recente (menos de 3 meses)', critico: true },
      { item: 'Razão social correta', critico: true },
      { item: 'CNPJ correto', critico: true },
      { item: 'Capital social informado', critico: true },
      { item: 'Sócios listados com dados', critico: true },
      { item: 'Histórico de alterações presente', critico: false },
      { item: 'Endereço coincide com CNPJ', critico: true }
    ],
    validacoes: ['cnpj', 'razao_social', 'endereco', 'socios'],
    cruzamentos: ['contrato_social', 'conta_energia', 'plano_internet', 'contrato_locacao']
  },

  // ─── DOCUMENTOS 7/8: Comprovante de Endereço — Energia (4100) ───
  conta_energia: {
    nome: 'Conta de Energia Elétrica',
    codigo: '4100',
    regras: [
      'Últimos 3 meses anteriores ao protocolo',
      'Deve conter nome da empresa',
      'Deve conter CNPJ',
      'Deve conter endereço',
      'Endereço deve ser IDÊNTICO ao endereço do CNPJ',
      'Se apresentado, dispensa o plano de internet (e vice-versa)',
      'Conta não pode estar com débito em aberto'
    ],
    checklist: [
      { item: 'Últimos 3 meses anteriores ao protocolo', critico: true },
      { item: 'Em nome da empresa', critico: true },
      { item: 'CNPJ da empresa presente', critico: true },
      { item: 'Endereço = endereço do CNPJ', critico: true },
      { item: 'Sem débitos em aberto', critico: false }
    ],
    validacoes: ['endereco_vs_cnpj', 'titularidade', 'periodo'],
    cruzamentos: ['certidao_junta_comercial', 'contrato_social']
  },

  // ─── DOCUMENTO 8: Plano de Internet (4110) ───
  plano_internet: {
    nome: 'Plano de Internet',
    codigo: '4110',
    regras: [
      'Últimos 3 meses anteriores ao protocolo',
      'Deve conter nome da empresa',
      'Deve conter CNPJ',
      'Deve conter endereço',
      'Endereço deve ser IDÊNTICO ao endereço do CNPJ',
      'Serviço deve estar ativo',
      'Se apresentado, dispensa a conta de energia (e vice-versa)'
    ],
    checklist: [
      { item: 'Últimos 3 meses anteriores ao protocolo', critico: true },
      { item: 'Em nome da empresa', critico: true },
      { item: 'CNPJ da empresa presente', critico: true },
      { item: 'Endereço = endereço do CNPJ', critico: true },
      { item: 'Serviço ativo', critico: false }
    ],
    validacoes: ['endereco_vs_cnpj', 'titularidade', 'periodo'],
    cruzamentos: ['certidao_junta_comercial', 'contrato_social']
  },

  // ─── DOCUMENTO 9: Guia de IPTU (3120) ───
  guia_iptu: {
    nome: 'Guia de IPTU',
    codigo: '3120',
    regras: [
      'Deve conter endereço do imóvel',
      'Deve conter identificação do proprietário',
      'Pode estar em nome de terceiros',
      'Se estiver em nome de terceiros: deve existir contrato de locação ou comodato',
      'Endereço deve coincidir com endereço da empresa'
    ],
    checklist: [
      { item: 'Endereço do imóvel presente', critico: true },
      { item: 'Proprietário identificado', critico: true },
      { item: 'Endereço coincide com endereço da empresa', critico: true },
      { item: 'Se em nome de terceiros: contrato de locação ou comodato exigido', critico: true }
    ],
    validacoes: ['endereco', 'proprietario'],
    cruzamentos: ['contrato_locacao', 'certidao_junta_comercial']
  },

  // ─── DOCUMENTO 10: Escritura do Imóvel (3130) ───
  escritura_imovel: {
    nome: 'Escritura do Imóvel',
    codigo: '3130',
    regras: [
      'Somente apresentada se a empresa for proprietária do imóvel',
      'Escritura deve estar no nome da empresa',
      'Endereço da escritura deve coincidir com endereço da empresa',
      'Divergência de endereço = inconsistência crítica'
    ],
    checklist: [
      { item: 'Escritura no nome da empresa', critico: true },
      { item: 'Endereço = endereço da empresa', critico: true },
      { item: 'Documento registrado em cartório', critico: false }
    ],
    validacoes: ['titularidade_empresa', 'endereco_vs_cnpj'],
    cruzamentos: ['certidao_junta_comercial', 'guia_iptu']
  },

  // ─── DOCUMENTO 11: Contrato de Locação (3140) ───
  contrato_locacao: {
    nome: 'Contrato de Locação',
    codigo: '3140',
    regras: [
      'Deve conter contrato de locação válido (não vencido)',
      'Em nome da empresa',
      'Comprovantes de pagamento dos últimos 3 meses',
      'Se contrato recente: apresentar comprovantes disponíveis e justificar ausência dos demais',
      'Pagamento deve sair da conta da empresa',
      'Endereço = endereço do CNPJ',
      'Contrato vencido não é aceito'
    ],
    checklist: [
      { item: 'Contrato de locação em nome da empresa', critico: true },
      { item: 'Contrato válido (não vencido)', critico: true },
      { item: '3 últimos comprovantes de pagamento (ou disponíveis se recente)', critico: true },
      { item: 'Endereço = endereço do CNPJ', critico: true },
      { item: 'Pagamento rastreável no extrato bancário da empresa', critico: true }
    ],
    validacoes: ['titularidade', 'endereco_vs_cnpj', 'pagamentos_rastreados', 'validade_contrato'],
    cruzamentos: ['extrato_bancario_corrente', 'certidao_junta_comercial']
  },

  // ─── DOCUMENTO 12: Espaço de Armazenagem (3150) ───
  comprovante_espaco_armazenamento: {
    nome: 'Comprovante de Espaço de Armazenagem',
    codigo: '3150',
    regras: [
      'Pode ser comprovado por: contrato de armazenagem, contrato de locação de box ou uso do próprio espaço',
      'Se usar espaço próprio: anexar fotos + petição explicativa informando metragem e características',
      'Deve identificar o local de armazenagem',
      'Deve vincular à empresa requerente'
    ],
    checklist: [
      { item: 'Tipo de comprovação identificado (contrato ou espaço próprio)', critico: true },
      { item: 'Se espaço próprio: fotos do espaço presentes', critico: true },
      { item: 'Se espaço próprio: petição com metragem e características', critico: true },
      { item: 'Local vinculado à empresa', critico: true }
    ],
    validacoes: ['tipo_comprovacao', 'vinculacao_empresa'],
    cruzamentos: ['certidao_junta_comercial']
  },

  // ─── DOCUMENTO 13: Extratos Bancários (5100) ───
  extrato_bancario_corrente: {
    nome: 'Extratos Bancários (Últimos 3 Meses)',
    codigo: '5100',
    regras: [
      'Devem ser apresentados extratos de TODOS os bancos da empresa',
      'Período: 3 meses anteriores ao protocolo',
      'Devem incluir: contas correntes, aplicações e contas sem movimentação',
      'Identificar saldo no último dia de cada mês',
      'Gerar alerta automático para TODAS as entradas — exigindo origem e lastro',
      'Se menos de 3 meses = alerta de falta de documentação'
    ],
    checklist: [
      { item: 'Período de 3 meses anteriores ao protocolo coberto', critico: true },
      { item: 'Extratos de TODOS os bancos da empresa', critico: true },
      { item: 'Contas correntes incluídas', critico: true },
      { item: 'Aplicações financeiras incluídas', critico: false },
      { item: 'Contas sem movimentação incluídas', critico: false },
      { item: 'Saldo final do último dia de cada mês identificado', critico: true },
      { item: 'Todas as entradas com origem rastreável', critico: true }
    ],
    validacoes: ['saldo_final_mes', 'origem_depositos', 'todos_bancos'],
    cruzamentos: ['balancete_verificacao', 'contrato_mutuo', 'comprovante_transferencia_integralizacao']
  },

  // ─── DOCUMENTO 13b: Extratos Bancários de Aplicações ───
  extrato_bancario_aplicacoes: {
    nome: 'Extratos Bancários — Aplicações',
    codigo: '5100b',
    regras: [
      'Período: 3 meses anteriores ao protocolo',
      'Incluir todas as aplicações financeiras',
      'Identificar saldo final de cada mês',
      'Origem dos recursos deve ser rastreável'
    ],
    checklist: [
      { item: 'Período de 3 meses coberto', critico: true },
      { item: 'Todas as aplicações listadas', critico: true },
      { item: 'Saldo final de cada mês identificado', critico: true },
      { item: 'Origem dos aportes rastreável', critico: true }
    ],
    validacoes: ['saldo_final_mes', 'origem_depositos'],
    cruzamentos: ['balancete_verificacao']
  },

  // ─── DOCUMENTO 14: Balancetes de Verificação (6100) ───
  balancete_verificacao: {
    nome: 'Balancetes de Verificação',
    codigo: '6100',
    regras: [
      'Devem ser apresentados 3 balancetes correspondentes aos mesmos meses dos extratos bancários',
      'Devem conter: conta bancos, contas correntes, aplicações financeiras, saldo bancário',
      'Saldo de Bancos deve ser IDÊNTICO ao saldo final do extrato (tolerância zero)',
      'Balancete deve estar equilibrado (débitos = créditos)',
      'Qualquer divergência entre balancete e extrato = inconsistência crítica'
    ],
    checklist: [
      { item: 'Período: 3 meses correspondentes aos extratos bancários', critico: true },
      { item: 'Conta Bancos/Caixa existe no balancete', critico: true },
      { item: 'Saldo Bancos = saldo extrato (tolerância zero)', critico: true },
      { item: 'Balancete equilibrado (débitos = créditos)', critico: true },
      { item: 'Aplicações financeiras refletidas', critico: false },
      { item: 'Contas de capital social compatíveis com contrato social', critico: false }
    ],
    validacoes: ['saldo_bancos_vs_extrato', 'balancete_equilibrado'],
    cruzamentos: ['extrato_bancario_corrente', 'contrato_social']
  },

  // ─── DOCUMENTO 15: Origem dos Recursos (5160) ───
  comprovante_transferencia_integralizacao: {
    nome: 'Origem das Entradas de Recursos / Transferências de Integralização',
    codigo: '5160',
    regras: [
      'Toda entrada de dinheiro nos extratos deve ter origem explicada',
      'Origens aceitas: nota fiscal, empréstimo, mútuo, aumento de capital, adiantamento de cliente',
      'Preferencialmente deve existir planilha de origem dos recursos',
      'Se houve aumento ou integralização nos últimos 60 meses: apresentar comprovantes de transferência dos sócios E extratos da empresa com entrada do valor'
    ],
    checklist: [
      { item: 'Todas as entradas dos extratos têm origem explicada', critico: true },
      { item: 'Planilha de origem dos recursos presente (recomendado)', critico: false },
      { item: 'Comprovantes de transferência dos sócios (se houve integralização)', critico: true },
      { item: 'Extratos da empresa mostrando entrada do valor integralizado', critico: true }
    ],
    validacoes: ['origem_entradas', 'comprovantes_transferencia'],
    cruzamentos: ['extrato_bancario_corrente', 'contrato_social', 'balancete_verificacao']
  },

  // ─── DOCUMENTO 16: Contrato de Empréstimo Bancário (5130) ───
  contrato_mutuo: {
    nome: 'Contrato de Empréstimo / Mútuo',
    codigo: '5120/5130',
    regras: [
      'Contrato de empréstimo bancário (5130): só apresentar se houver crédito de empréstimo nos extratos',
      'Contrato de mútuo (5120): apresentado quando houver empréstimo entre particulares',
      'O contrato de mútuo deve estar registrado em cartório (não basta reconhecimento de firma)',
      'Deve conter: valor, taxa de juros, prazo, garantias e custos',
      'Se mutuante for pessoa jurídica: exigir IOF + balancetes 3 meses + contrato social do mutuante',
      'Se mutuante for pessoa física: IOF não se aplica',
      'Valor do contrato deve corresponder EXATAMENTE ao depósito no extrato (tolerância zero)',
      'Contrato em nome da empresa, deve conter CNPJ'
    ],
    checklist: [
      { item: 'Contrato em nome da empresa com CNPJ', critico: true },
      { item: 'Registrado em cartório (mútuo entre particulares)', critico: true },
      { item: 'Valor definido no contrato', critico: true },
      { item: 'Taxa de juros definida', critico: false },
      { item: 'Prazo definido', critico: false },
      { item: 'Garantias descritas', critico: false },
      { item: 'Se mutuante PJ: IOF recolhido (DARF código 1150)', critico: true },
      { item: 'Valor = depósito no extrato (tolerância zero)', critico: true }
    ],
    validacoes: ['valor_mutuo', 'iof_recolhido', 'registro_cartorio'],
    cruzamentos: ['extrato_bancario_corrente', 'comprovante_iof', 'balancete_verificacao']
  },

  // ─── DOCUMENTO 18: Contrato Social do Mutuante (2130) ───
  contrato_social_mutuante: {
    nome: 'Contrato Social do Mutuante',
    codigo: '2130',
    regras: [
      'Somente exigido se existir contrato de mútuo E mutuante for pessoa jurídica',
      'Deve demonstrar capacidade da empresa mutuante',
      'Deve conter CNPJ do mutuante',
      'Deve identificar sócios do mutuante'
    ],
    checklist: [
      { item: 'Documento aplicável apenas se mútuo PJ', critico: false },
      { item: 'CNPJ do mutuante presente', critico: true },
      { item: 'Sócios do mutuante identificados', critico: false },
      { item: 'Capital social do mutuante informado', critico: false }
    ],
    validacoes: ['cnpj_mutuante'],
    cruzamentos: ['contrato_mutuo', 'balancete_mutuante']
  },

  // ─── DOCUMENTO 19: Balancetes do Mutuante (6110) ───
  balancete_mutuante: {
    nome: 'Balancetes do Mutuante',
    codigo: '6110',
    regras: [
      'Devem ser apresentados 3 meses anteriores ao empréstimo',
      'Devem demonstrar capacidade financeira do mutuante para realizar o empréstimo',
      'O saldo disponível do mutuante deve ser compatível com o valor emprestado',
      'Somente exigido se mutuante for pessoa jurídica'
    ],
    checklist: [
      { item: 'Período: 3 meses anteriores ao empréstimo', critico: true },
      { item: 'Capacidade financeira do mutuante demonstrada', critico: true },
      { item: 'Saldo disponível compatível com valor emprestado', critico: true }
    ],
    validacoes: ['capacidade_financeira_mutuante'],
    cruzamentos: ['contrato_mutuo', 'contrato_social_mutuante']
  },

  // ─── DOCUMENTO 20: IOF do Mútuo (5140) ───
  comprovante_iof: {
    nome: 'DARF IOF do Mútuo',
    codigo: '5140',
    regras: [
      'Obrigatório SOMENTE quando mutuante for pessoa jurídica',
      'Deve ser DARF com código 1150',
      'Fórmula de cálculo: IOF = (Valor × alíquota_diária_PJ × dias) + (Valor × 0,38%)',
      'Alíquota diária PJ: 0,0041% ao dia',
      'Data deve ser próxima à data do contrato de mútuo (menos de 30 dias)',
      'Valor do IOF calculado deve corresponder ao DARF apresentado'
    ],
    checklist: [
      { item: 'DARF com código de receita 1150', critico: true },
      { item: 'Data próxima ao contrato de mútuo (< 30 dias)', critico: true },
      { item: 'Valor do IOF calculado corretamente: (Valor × 0,0041% × dias) + (Valor × 0,38%)', critico: true },
      { item: 'Valor do DARF = valor calculado do IOF (tolerância mínima)', critico: true }
    ],
    validacoes: ['valor_iof', 'data_iof', 'codigo_darf'],
    cruzamentos: ['contrato_mutuo']
  },

  // ─── DOCUMENTO 21: Extratos do Mês do Aporte (5150) ───
  extrato_bancario_integralizacao: {
    nome: 'Extratos Bancários do Mês do Aporte',
    codigo: '5150',
    regras: [
      'Obrigatório se houve aumento de capital nos últimos 60 meses',
      'Apresentar extratos do mês em que ocorreu o aporte de capital',
      'Deve mostrar claramente a entrada do valor integralizado',
      'Valor da entrada = valor do aporte no contrato social'
    ],
    checklist: [
      { item: 'Extrato do mês do aporte de capital presente', critico: true },
      { item: 'Entrada do valor do aporte identificada no extrato', critico: true },
      { item: 'Valor da entrada = valor do aporte no contrato social (tolerância zero)', critico: true },
      { item: 'Data do depósito compatível com data do aporte', critico: true }
    ],
    validacoes: ['entrada_aporte', 'valor_aporte_vs_contrato'],
    cruzamentos: ['contrato_social', 'balancete_verificacao']
  },

  // ─── DOCUMENTO 22: Balanço Patrimonial (6120) ───
  balancete_patrimonial: {
    nome: 'Balanço Patrimonial',
    codigo: '6120',
    regras: [
      'Obrigatório se houve aumento de capital nos últimos 60 meses',
      'Mesmo sem aumento de capital, é recomendável apresentar pelo menos um balanço',
      'Deve demonstrar situação patrimonial da empresa',
      'Capital social no balanço deve coincidir com contrato social'
    ],
    checklist: [
      { item: 'Balanço patrimonial presente', critico: true },
      { item: 'Assinado por contador responsável com CRC', critico: true },
      { item: 'Capital social = contrato social', critico: true },
      { item: 'Ativo e Passivo equilibrados', critico: false }
    ],
    validacoes: ['capital_vs_contrato', 'assinatura_contador'],
    cruzamentos: ['contrato_social', 'extrato_bancario_corrente']
  },

  // ─── ALIAS para compatibilidade ───
  balanco_patrimonial_integralizacao: {
    nome: 'Balanço Patrimonial',
    codigo: '6120',
    regras: [
      'Obrigatório se houve aumento de capital nos últimos 60 meses',
      'Deve demonstrar situação patrimonial da empresa',
      'Capital social no balanço deve coincidir com contrato social'
    ],
    checklist: [
      { item: 'Balanço patrimonial presente', critico: true },
      { item: 'Assinado por contador com CRC', critico: true },
      { item: 'Capital social = contrato social', critico: true }
    ],
    validacoes: ['capital_vs_contrato', 'assinatura_contador'],
    cruzamentos: ['contrato_social', 'extrato_bancario_corrente']
  },

  // ─── DAS / Simples Nacional (das_simples_nacional) ───
  das_simples_nacional: {
    nome: 'DAS — Simples Nacional',
    codigo: 'DAS',
    regras: [
      'Apresentar guias dos últimos 3 meses anteriores ao protocolo',
      'Verificar se há débitos em aberto',
      'CNPJ da empresa deve constar nas guias'
    ],
    checklist: [
      { item: 'Últimos 3 meses de DAS presentes', critico: true },
      { item: 'CNPJ correto nas guias', critico: true },
      { item: 'Sem guias em aberto / inadimplência', critico: false }
    ],
    validacoes: ['cnpj', 'periodo'],
    cruzamentos: ['extrato_bancario_corrente']
  },

  // ─── DARF CPRB ───
  darf_cprb: {
    nome: 'DARF — CPRB',
    codigo: 'DARF_CPRB',
    regras: [
      'Apresentar últimos 3 meses',
      'Verificar código de receita correto',
      'CNPJ da empresa deve constar'
    ],
    checklist: [
      { item: 'Últimos 3 meses presentes', critico: true },
      { item: 'Código de receita correto', critico: true },
      { item: 'CNPJ correto', critico: true }
    ],
    validacoes: ['cnpj', 'periodo', 'codigo_receita'],
    cruzamentos: ['extrato_bancario_corrente']
  }
};

export const getGuide = (tipoDocumento) => {
  return analysisGuides[tipoDocumento] || null;
};