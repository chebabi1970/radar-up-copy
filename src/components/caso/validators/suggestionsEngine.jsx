// Motor de sugestões para corrigir discrepâncias encontradas

export const suggestionTemplates = {
  // Nome divergente
  nome_divergente: {
    titulo: 'Correção de Nome',
    gerarSugestao: (dados) => ({
      tipo: 'nome_divergente',
      problema: `Nome diferente encontrado: "${dados.valor1}" vs "${dados.valor2}"`,
      passos: [
        '1. Verifique qual é o nome correto no documento original',
        '2. Se for erro de digitação: digitalize novamente ou corrija no sistema',
        `3. Nome correto é: "${dados.valorCorreto || dados.valor1}"`,
        '4. Atualize em todos os documentos relacionados'
      ],
      acao: 'Submeta documento corrigido ou autorize uso do nome do contrato social'
    })
  },

  // Saldo divergente
  saldo_divergente: {
    titulo: 'Reconciliação de Saldo',
    gerarSugestao: (dados) => ({
      tipo: 'saldo_divergente',
      problema: `Diferença de R$ ${dados.diferenca?.toFixed(2)} entre balancete (R$ ${dados.valor1?.toFixed(2)}) e extrato (R$ ${dados.valor2?.toFixed(2)})`,
      percentual: `${dados.percentual || 0}% de divergência`,
      passos: [
        '1. Verifique se há transações não compensadas',
        '2. Procure por cheques em circulação ou DOCs pendentes',
        '3. Se diferença < 1%: pode ser arredondamento ou taxa bancária',
        '4. Se diferença > 1%: solicite novo extrato ao banco ou balancete revisado',
        `5. Diferença encontrada: R$ ${dados.diferenca?.toFixed(2)}`
      ],
      acao: 'Forneça conciliação bancária ou balancete corrigido'
    })
  },

  // Data divergente
  data_divergente: {
    titulo: 'Ajuste de Data',
    gerarSugestao: (dados) => ({
      tipo: 'data_divergente',
      problema: `Data diferente: "${dados.valor1}" vs "${dados.valor2}" (${dados.diasDiferenca} dias de diferença)`,
      passos: [
        '1. Identifique qual data é correta (documento vs protocolo)',
        dados.diasDiferenca > 90 
          ? '2. Diferença muito grande (>90 dias) - Pode invalidar o documento'
          : '2. Diferença aceitável se for data de documento vs protocolo',
        '3. Verifique assinatura e carimbo do cartório/banco',
        `4. Data correta: "${dados.valorCorreto || dados.valor1}"`
      ],
      acao: 'Verifique data original em documento físico'
    })
  },

  // Documento faltante
  documento_faltante: {
    titulo: 'Documento Obrigatório Faltante',
    gerarSugestao: (dados) => ({
      tipo: 'documento_faltante',
      problema: `${dados.tipoDocumento} é obrigatório`,
      base_legal: dados.baseLegal,
      passos: [
        `1. O ${dados.tipoDocumento} é exigido por: ${dados.baseLegal}`,
        `2. Critério de aplicação: ${dados.criterio}`,
        `3. Prazo: ${dados.prazo}`,
        '4. Se não aplicável: justifique e submeta parecer técnico',
        '5. Se aplicável: digitalize e envie via sistema'
      ],
      acao: `Forneça ${dados.tipoDocumento} ou justificativa de não aplicabilidade`
    })
  },

  // Valor exato divergente
  valor_exato_divergente: {
    titulo: 'Valor Não Coincide com Transferência',
    gerarSugestao: (dados) => ({
      tipo: 'valor_exato_divergente',
      problema: `Valor do ${dados.documento1} (R$ ${dados.valor1?.toFixed(2)}) ≠ Transferência (R$ ${dados.valor2?.toFixed(2)})`,
      passos: [
        '1. Verifique se há juros ou multas envolvidas',
        '2. Procure por IOF, taxas bancárias ou outros encargos',
        `3. Diferença: R$ ${(dados.valor1 - dados.valor2)?.toFixed(2)}`,
        '4. Se for taxa: identifique cobrador e motivo',
        '5. Corrija o valor ou justifique a diferença'
      ],
      acao: 'Submeta comprovante de cobrança ou contrato modificado'
    })
  },

  // IOF não recolhido
  iof_nao_recolhido: {
    titulo: 'IOF Não Recolhido',
    gerarSugestao: (dados) => ({
      tipo: 'iof_nao_recolhido',
      problema: 'IOF é obrigatório quando mutuante é pessoa jurídica',
      regra: 'Lei nº 4.728/1965 - Operações de crédito entre PJ',
      passos: [
        '1. Verifique se mutuante é PJ (sociedade empresária ou PJ)',
        '2. Se SIM: IOF é obrigatório (0,0082% ao dia, máx. 15%)',
        '3. Calcule: valor_emprestimo × taxa_diária × dias',
        '4. Recolha via DARF (código 6016) - Serviços do Banco Central',
        '5. Anexe comprovante de recolhimento (DARF)'
      ],
      acao: 'Recolha IOF e submeta comprovante, ou reformule como mútuo entre PF'
    })
  },

  // Reconhecimento de firma faltante
  cartorio_nao_reconhecido: {
    titulo: 'Documento Sem Reconhecimento de Firma',
    gerarSugestao: (dados) => ({
      tipo: 'cartorio_nao_reconhecido',
      problema: `${dados.documento} não possui reconhecimento de firma em cartório`,
      regra: 'Portaria Coana 72/2020 - Exigência de autenticação',
      passos: [
        '1. Localize o documento original',
        '2. Dirija-se a um cartório de tabelião autorizado',
        '3. Solicite: "Reconhecimento de firma por comparação"',
        '4. Custos: variam por estado (geralmente R$ 30-50)',
        '5. Retorne com cópia autenticada pelo cartório'
      ],
      acao: 'Leve documento original a cartório e faça reconhecimento de firma'
    })
  },

  // Período não coberto
  periodo_nao_coberto: {
    titulo: 'Período de Documentação Incompleto',
    gerarSugestao: (dados) => ({
      tipo: 'periodo_nao_coberto',
      problema: `Documentação cobre ${dados.periodoEncontrado} mas é exigido ${dados.periodoExigido}`,
      falta: `${dados.meseFaltando} não coberto(s)`,
      passos: [
        `1. Exigência: últimos ${dados.mesesExigidos} meses anteriores ao protocolo`,
        `2. Período coberto: ${dados.periodoEncontrado}`,
        `3. Faltam: ${dados.meseFaltando}`,
        '4. Solicite ao cliente documentos dos meses faltantes',
        '5. Digitalize e submeta novo upload'
      ],
      acao: `Forneça documentação dos meses: ${dados.mesesFaltando}`
    })
  },

  // Titularidade incorreta
  titularidade_incorreta: {
    titulo: 'Documento em Nome de Terceiro',
    gerarSugestao: (dados) => ({
      tipo: 'titularidade_incorreta',
      problema: `${dados.documento} está em nome de "${dados.titular}" mas deveria ser em nome da empresa`,
      regra: `Comprovante de domicílio deve estar em nome da empresa conforme CNPJ`,
      passos: [
        '1. Documento deve estar 100% em nome da empresa',
        '2. Não são aceitos nomes de sócios ou representantes',
        '3. Opções:',
        '  a) Contratar serviço em nome da empresa',
        '  b) Transferir titularidade para empresa',
        '  c) Apresentar procuração + comprovante pessoa física + contrato social'
      ],
      acao: 'Contrate serviço em nome da empresa e resubmeta'
    })
  }
};

export const gerarSugestoesParaDiscrepancia = (tipoDiscrepancia, dados) => {
  const template = suggestionTemplates[tipoDiscrepancia];
  
  if (!template) {
    return {
      titulo: 'Discrepância Encontrada',
      sugestao: 'Tipo de discrepância não mapeado ainda',
      problema: dados.descricao || ''
    };
  }
  
  return {
    ...template,
    ...template.gerarSugestao(dados)
  };
};

export const buildSuggestionsFromValidation = (validationResult) => {
  const sugestoes = [];
  
  if (validationResult.discrepancias?.length > 0) {
    validationResult.discrepancias.forEach(disc => {
      const tipo = disc.campo?.toLowerCase().replace(/\s+/g, '_');
      const tipoBuscado = 
        tipo.includes('saldo') ? 'saldo_divergente' :
        tipo.includes('nome') ? 'nome_divergente' :
        tipo.includes('data') ? 'data_divergente' :
        tipo.includes('valor') ? 'valor_exato_divergente' :
        'documento_faltante';
      
      sugestoes.push(gerarSugestoesParaDiscrepancia(tipoBuscado, {
        ...disc,
        valorCorreto: disc.valor2,
        criterio: disc.criterio || 'Conforme portaria'
      }));
    });
  }
  
  if (validationResult.erros?.length > 0) {
    validationResult.erros.forEach(erro => {
      sugestoes.push(gerarSugestoesParaDiscrepancia('documento_faltante', erro));
    });
  }
  
  return sugestoes;
};