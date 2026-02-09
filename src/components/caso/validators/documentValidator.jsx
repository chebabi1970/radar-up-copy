// Validadores granulares para documentos baseados em rules estruturadas

export const validators = {
  // Validações de formato
  data: (valor) => {
    const regex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(valor)) return { valido: false, erro: 'Data em formato inválido' };
    
    try {
      const date = new Date(valor);
      if (isNaN(date)) return { valido: false, erro: 'Data inválida' };
      return { valido: true };
    } catch {
      return { valido: false, erro: 'Data inválida' };
    }
  },

  cnpj: (valor) => {
    const cnpj = valor?.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) {
      return { valido: false, erro: 'CNPJ deve ter 14 dígitos' };
    }
    // Validação de algoritmo CNPJ simplificada
    if (cnpj === cnpj.charAt(0).repeat(14)) {
      return { valido: false, erro: 'CNPJ inválido' };
    }
    return { valido: true };
  },

  cpf: (valor) => {
    const cpf = valor?.replace(/\D/g, '');
    if (!cpf || cpf.length !== 11) {
      return { valido: false, erro: 'CPF deve ter 11 dígitos' };
    }
    if (cpf === cpf.charAt(0).repeat(11)) {
      return { valido: false, erro: 'CPF inválido' };
    }
    return { valido: true };
  },

  moeda: (valor) => {
    const num = parseFloat(valor);
    if (isNaN(num) || num < 0) {
      return { valido: false, erro: 'Valor monetário inválido' };
    }
    return { valido: true };
  },

  numeroPeriodo: (valor) => {
    const regex = /^\d{2}\/\d{4}$/;
    if (!regex.test(valor)) {
      return { valido: false, erro: 'Período deve estar no formato MM/YYYY' };
    }
    const [mes, ano] = valor.split('/');
    if (parseInt(mes) < 1 || parseInt(mes) > 12) {
      return { valido: false, erro: 'Mês inválido (01-12)' };
    }
    return { valido: true };
  },

  cartorio: (valor) => {
    if (!valor || valor.trim().length === 0) {
      return { valido: false, erro: 'Cartório deve ser informado' };
    }
    if (!valor.toLowerCase().includes('cartório') && 
        !valor.toLowerCase().includes('tabeliao') &&
        !valor.toLowerCase().includes('notário')) {
      return { valido: false, erro: 'Documento não parece ter reconhecimento de firma' };
    }
    return { valido: true };
  },

  // Validações de contexto
  nomeCoincidencia: (nome1, nome2) => {
    const normaliza = (s) => s?.toLowerCase().replace(/[^\w]/g, '') || '';
    const n1 = normaliza(nome1);
    const n2 = normaliza(nome2);
    
    if (n1 === n2) return { coincide: true };
    
    // Verificar se contém principais palavras
    const palavras1 = n1.split(' ').filter(p => p.length > 3);
    const palavras2 = n2.split(' ').filter(p => p.length > 3);
    const coincidencias = palavras1.filter(p => palavras2.includes(p)).length;
    
    if (coincidencias >= palavras1.length * 0.7) {
      return { coincide: true, parcial: true, aviso: 'Nomes parcialmente coincidentes' };
    }
    
    return { 
      coincide: false, 
      severidade: 'critica',
      erro: `Nome diferente: "${nome1}" vs "${nome2}"` 
    };
  },

  saldoCoincidencia: (saldo1, saldo2, tolerancia = 0.01) => {
    const s1 = parseFloat(saldo1);
    const s2 = parseFloat(saldo2);
    const diferenca = Math.abs(s1 - s2);
    
    if (diferenca <= tolerancia) {
      return { coincide: true };
    }
    
    const percentual = (diferenca / s2) * 100;
    const severidade = percentual > 10 ? 'critica' : percentual > 5 ? 'media' : 'leve';
    
    return {
      coincide: false,
      severidade,
      diferenca,
      percentual: percentual.toFixed(2),
      erro: `Diferença de R$ ${diferenca.toFixed(2)} (${percentual.toFixed(2)}%)`
    };
  },

  dataProximidade: (data1, data2, diasTolerancia = 30) => {
    try {
      const d1 = new Date(data1);
      const d2 = new Date(data2);
      const diferenca = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
      
      if (diferenca <= diasTolerancia) {
        return { proxima: true };
      }
      
      return {
        proxima: false,
        severidade: diferenca > 90 ? 'critica' : 'media',
        diasDiferenca: Math.round(diferenca),
        erro: `Datas distantes ${Math.round(diferenca)} dias`
      };
    } catch {
      return { proxima: false, erro: 'Erro ao comparar datas' };
    }
  },

  periodoCobertura: (data1, data2, dataReferencia) => {
    try {
      const d1 = new Date(data1);
      const d2 = new Date(data2);
      const dRef = new Date(dataReferencia);
      
      if (dRef >= d1 && dRef <= d2) {
        return { coberto: true };
      }
      
      return {
        coberto: false,
        severidade: 'critica',
        erro: `Período ${data1} a ${data2} não cobre ${dataReferencia}`
      };
    } catch {
      return { coberto: false, erro: 'Erro ao validar período' };
    }
  }
};

// Executar validação com base em tipo
export const validarCampo = (tipo, valor, contexto = {}) => {
  if (!validators[tipo]) {
    return { valido: true, aviso: `Validador não implementado para ${tipo}` };
  }
  return validators[tipo](valor, contexto);
};