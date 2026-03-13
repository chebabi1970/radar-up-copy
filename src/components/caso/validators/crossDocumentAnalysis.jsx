// ============================================================
// MOTOR DE CRUZAMENTO COMPLETO DE DOCUMENTOS
// Sistema de Auditoria para Revisão de Estimativa (IN 1984 / Portaria Coana 72)
// ============================================================

const normalizar = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const limparNum = (s) => (s || '').replace(/\D/g, '');
const parseMoeda = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  return parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
};

// --- REGRA 1: CNPJ em todos os documentos ---
const regra1_cnpj = (documentos, caso) => {
  const cnpjReferencia = limparNum(caso?.cnpj || '');
  if (!cnpjReferencia) return { id: 'R1', passado: null, motivo: 'CNPJ do caso não informado' };

  const tiposRelevantes = [
    'requerimento_das', 'contrato_social', 'certidao_junta_comercial',
    'extrato_bancario_corrente', 'extrato_bancario_aplicacoes',
    'balancete_verificacao', 'balanco_patrimonial_integralizacao'
  ];

  const alertas = [];
  tiposRelevantes.forEach(tipo => {
    const docs = documentos.filter(d => d.tipo_documento === tipo);
    docs.forEach(doc => {
      const cnpjDoc = limparNum(doc.dados_extraidos?.cnpj || '');
      if (cnpjDoc && cnpjDoc !== cnpjReferencia) {
        alertas.push({
          documento: doc.nome_arquivo || tipo,
          tipo,
          cnpjEsperado: cnpjReferencia,
          cnpjEncontrado: cnpjDoc,
          severidade: 'critica'
        });
      }
    });
  });

  return {
    id: 'R1', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0
      ? 'Há documentos com CNPJ divergente do requerimento. Verifique se os documentos pertencem à empresa correta.'
      : null
  };
};

// --- REGRA 2: Responsável e Procurador ---
const regra2_responsavel = (documentos) => {
  const alertas = [];

  const reqDAS = documentos.find(d => d.tipo_documento === 'requerimento_das');
  const docIdResp = documentos.find(d => d.tipo_documento === 'documento_identificacao_responsavel');
  const procuracao = documentos.find(d => d.tipo_documento === 'procuracao');
  const docIdProc = documentos.find(d => d.tipo_documento === 'documento_identificacao_procurador');

  if (reqDAS?.dados_extraidos?.cpf_responsavel && docIdResp?.dados_extraidos?.cpf) {
    const cpfReq = limparNum(reqDAS.dados_extraidos.cpf_responsavel);
    const cpfDoc = limparNum(docIdResp.dados_extraidos.cpf);
    if (cpfReq !== cpfDoc) {
      alertas.push({ campo: 'CPF do Responsável', fonte1: 'Requerimento', valor1: cpfReq, fonte2: 'Doc. Identidade', valor2: cpfDoc, severidade: 'critica' });
    }
  }

  if (procuracao && docIdProc) {
    const nomeProc = normalizar(procuracao.dados_extraidos?.nome_outorgado || '');
    const nomeDoc = normalizar(docIdProc.dados_extraidos?.nome || '');
    if (nomeProc && nomeDoc && nomeProc !== nomeDoc && !nomeProc.includes(nomeDoc.slice(0, 6)) && !nomeDoc.includes(nomeProc.slice(0, 6))) {
      alertas.push({ campo: 'Nome do Procurador', fonte1: 'Procuração', valor1: procuracao.dados_extraidos.nome_outorgado, fonte2: 'Doc. Identidade Procurador', valor2: docIdProc.dados_extraidos.nome, severidade: 'critica' });
    }
    const cpfProc = limparNum(procuracao.dados_extraidos?.cpf_outorgado || '');
    const cpfDocProc = limparNum(docIdProc.dados_extraidos?.cpf || '');
    if (cpfProc && cpfDocProc && cpfProc !== cpfDocProc) {
      alertas.push({ campo: 'CPF do Procurador', fonte1: 'Procuração', valor1: cpfProc, fonte2: 'Doc. Identidade Procurador', valor2: cpfDocProc, severidade: 'critica' });
    }
  }

  return {
    id: 'R2', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Inconsistências nos dados do responsável/procurador. Regularize antes do protocolo.' : null
  };
};

// --- REGRA 3: Endereço contrato social vs comprovantes ---
const regra3_endereco = (documentos) => {
  const contrato = documentos.find(d => d.tipo_documento === 'contrato_social');
  const endContrato = normalizar(contrato?.dados_extraidos?.endereco || '');

  const tiposEndereco = [
    'guia_iptu', 'conta_energia', 'plano_internet',
    'contrato_locacao', 'escritura_imovel'
  ];

  const alertas = [];
  if (!endContrato) return { id: 'R3', passado: null, motivo: 'Endereço do contrato social não extraído' };

  tiposEndereco.forEach(tipo => {
    const doc = documentos.find(d => d.tipo_documento === tipo);
    if (!doc?.dados_extraidos?.endereco) return;
    const endDoc = normalizar(doc.dados_extraidos.endereco);
    // Verifica se ao menos 50% das palavras coincidem
    const palavrasContrato = endContrato.split(/\s+/).filter(p => p.length > 3);
    const palavrasDoc = endDoc.split(/\s+/).filter(p => p.length > 3);
    const coincidencias = palavrasContrato.filter(p => endDoc.includes(p)).length;
    const pct = palavrasContrato.length > 0 ? coincidencias / palavrasContrato.length : 0;
    if (pct < 0.4) {
      alertas.push({ documento: doc.nome_arquivo || tipo, tipo, enderecoContrato: contrato.dados_extraidos.endereco, enderecoDoc: doc.dados_extraidos.endereco, severidade: 'media' });
    }
  });

  return {
    id: 'R3', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Endereços divergem. Verifique se houve mudança de sede não atualizada no contrato social.' : null
  };
};

// --- REGRA 4: Extratos vs Balancetes (saldos por período) ---
const regra4_extratos_balancetes = (documentos) => {
  const balancetes = documentos.filter(d => d.tipo_documento === 'balancete_verificacao');
  const extratos = documentos.filter(d =>
    d.tipo_documento === 'extrato_bancario_corrente' || d.tipo_documento === 'extrato_bancario_aplicacoes'
  );

  if (!balancetes.length || !extratos.length) {
    return { id: 'R4', passado: null, motivo: 'Balancetes ou extratos não disponíveis para cruzamento' };
  }

  const alertas = [];
  balancetes.forEach(bal => {
    const saldoBal = parseMoeda(bal.dados_extraidos?.saldo_bancos || bal.dados_extraidos?.total_caixa || 0);
    const periodo = bal.dados_extraidos?.periodo || bal.periodo_referencia;
    if (!saldoBal) return;

    const somaExtratos = extratos.reduce((acc, ext) => acc + parseMoeda(ext.dados_extraidos?.saldo_final || 0), 0);
    if (somaExtratos === 0) return;

    const diferenca = Math.abs(saldoBal - somaExtratos);
    const pctDif = saldoBal > 0 ? diferenca / saldoBal : 0;

    if (pctDif > 0.05) { // tolerância de 5%
      alertas.push({
        periodo: periodo || 'sem período',
        saldoBalancete: saldoBal,
        somaExtratos,
        diferenca,
        diferencaPercentual: (pctDif * 100).toFixed(1) + '%',
        severidade: pctDif > 0.2 ? 'critica' : 'media'
      });
    }
  });

  return {
    id: 'R4', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Saldos bancários nos balancetes não conferem com os extratos. Reconcile contabilmente.' : null
  };
};

// --- REGRA 5: Disponibilidade financeira ---
const regra5_disponibilidade = (documentos, caso) => {
  const extratos = documentos.filter(d =>
    d.tipo_documento === 'extrato_bancario_corrente' || d.tipo_documento === 'extrato_bancario_aplicacoes'
  );
  if (!extratos.length) return { id: 'R5', passado: null, motivo: 'Extratos não disponíveis' };

  let disponibilidade = 0;
  const detalhes = [];
  extratos.forEach(ext => {
    const saldo = parseMoeda(ext.dados_extraidos?.saldo_final || ext.dados_extraidos?.saldo_ultimo_dia || 0);
    disponibilidade += saldo;
    detalhes.push({ banco: ext.dados_extraidos?.banco || ext.nome_arquivo, saldo });
  });

  const valorSolicitado = parseMoeda(caso?.estimativa_calculada || caso?.limite_pretendido || 0);
  const alertas = [];

  if (valorSolicitado > 0 && disponibilidade < valorSolicitado * 0.5) {
    alertas.push({
      campo: 'Disponibilidade vs Estimativa',
      disponibilidade,
      valorSolicitado,
      cobertura: ((disponibilidade / valorSolicitado) * 100).toFixed(1) + '%',
      severidade: 'media',
      mensagem: 'Disponibilidade financeira cobre menos de 50% do valor solicitado'
    });
  }

  return {
    id: 'R5', passado: alertas.length === 0,
    disponibilidade, detalhes, alertas,
    sugestao: alertas.length > 0 ? 'Disponibilidade financeira pode ser insuficiente para o valor pretendido. Considere incluir outros ativos ou ajustar estimativa.' : null
  };
};

// --- REGRA 6: Entradas sem origem ---
const regra6_entradas_sem_origem = (documentos) => {
  const extratos = documentos.filter(d => d.tipo_documento === 'extrato_bancario_corrente');
  if (!extratos.length) return { id: 'R6', passado: null, motivo: 'Extratos não disponíveis' };

  const alertas = [];
  extratos.forEach(ext => {
    const entradas = ext.dados_extraidos?.entradas || ext.dados_extraidos?.creditos || [];
    entradas.forEach(entrada => {
      if (!entrada.origem && !entrada.historico && !entrada.descricao) {
        alertas.push({
          banco: ext.dados_extraidos?.banco || ext.nome_arquivo,
          data: entrada.data,
          valor: entrada.valor,
          severidade: parseMoeda(entrada.valor) > 10000 ? 'critica' : 'media',
          mensagem: `Crédito de R$ ${entrada.valor} sem origem identificada`
        });
      }
    });
  });

  return {
    id: 'R6', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Há entradas financeiras sem origem documentada. Inclua comprovantes ou descrição da origem de cada crédito relevante.' : null
  };
};

// --- REGRA 7: Capital integralizado vs transferências ---
const regra7_capital_integralizacao = (documentos) => {
  const contrato = documentos.find(d => d.tipo_documento === 'contrato_social');
  const transferencias = documentos.filter(d => d.tipo_documento === 'comprovante_transferencia_integralizacao' || d.tipo_documento === 'extrato_bancario_integralizacao');

  const capitalContrato = parseMoeda(contrato?.dados_extraidos?.capital_integralizado || contrato?.dados_extraidos?.capital_social || 0);
  if (!capitalContrato) return { id: 'R7', passado: null, motivo: 'Capital do contrato social não extraído' };
  if (!transferencias.length) {
    return { id: 'R7', passado: false, alertas: [{ severidade: 'critica', mensagem: 'Não há comprovante de transferência de integralização de capital' }], sugestao: 'Inclua os extratos ou comprovantes bancários comprovando a integralização do capital social.' };
  }

  const somaTransf = transferencias.reduce((acc, t) => acc + parseMoeda(t.dados_extraidos?.valor || 0), 0);
  const alertas = [];
  if (somaTransf < capitalContrato * 0.9) {
    alertas.push({ capitalContrato, somaTransferido: somaTransf, diferenca: capitalContrato - somaTransf, severidade: 'critica', mensagem: 'Transferências documentadas são inferiores ao capital integralizado no contrato' });
  }

  return {
    id: 'R7', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Integralização de capital não está totalmente documentada por transferências bancárias.' : null
  };
};

// --- REGRA 8: Aumento de capital últimos 60 meses ---
const regra8_aumento_capital = (documentos) => {
  const alteracoes = documentos.filter(d => d.tipo_documento === 'contrato_social' && d.dados_extraidos?.alteracao_capital);
  if (!alteracoes.length) return { id: 'R8', passado: null, motivo: 'Nenhuma alteração contratual com aumento de capital identificada' };

  const alertas = [];
  alteracoes.forEach(alt => {
    const dataAlteracao = alt.dados_extraidos?.data_alteracao;
    const temExtrato = documentos.some(d => d.tipo_documento === 'extrato_bancario_corrente' && d.periodo_referencia === dataAlteracao);
    const temTransferencia = documentos.some(d => d.tipo_documento === 'comprovante_transferencia_integralizacao');
    const temBalanco = documentos.some(d => d.tipo_documento === 'balanco_patrimonial_integralizacao');

    if (!temExtrato || !temTransferencia || !temBalanco) {
      alertas.push({
        dataAlteracao,
        falta: [!temExtrato && 'Extrato do mês do aporte', !temTransferencia && 'Comprovante de transferência', !temBalanco && 'Balanço patrimonial'].filter(Boolean),
        severidade: 'critica'
      });
    }
  });

  return {
    id: 'R8', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Aumento de capital sem documentação completa. Inclua extrato, transferências e balanço do período.' : null
  };
};

// --- REGRA 9: Transferências vs Sócios ---
const regra9_transferencias_socios = (documentos) => {
  const contrato = documentos.find(d => d.tipo_documento === 'contrato_social');
  const socios = (contrato?.dados_extraidos?.socios || []).map(s => normalizar(s.nome || s));
  if (!socios.length) return { id: 'R9', passado: null, motivo: 'Sócios não extraídos do contrato social' };

  const transferencias = documentos.filter(d =>
    d.tipo_documento === 'comprovante_transferencia_integralizacao' || d.tipo_documento === 'extrato_bancario_integralizacao'
  );

  const alertas = [];
  transferencias.forEach(transf => {
    const titular = normalizar(transf.dados_extraidos?.titular_origem || transf.dados_extraidos?.nome_remetente || '');
    if (!titular) return;
    const isSocio = socios.some(s => s.includes(titular.slice(0, 6)) || titular.includes(s.slice(0, 6)));
    if (!isSocio) {
      alertas.push({
        documento: transf.nome_arquivo,
        titular: transf.dados_extraidos?.titular_origem || transf.dados_extraidos?.nome_remetente,
        valor: transf.dados_extraidos?.valor,
        severidade: 'critica',
        mensagem: 'Transferente não consta como sócio no contrato social'
      });
    }
  });

  return {
    id: 'R9', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Há transferências de pessoas que não são sócias. Justifique ou regularize a origem dos recursos.' : null
  };
};

// --- REGRA 10: Mútuo vs Extratos ---
const regra10_mutuo_extratos = (documentos) => {
  const mutuos = documentos.filter(d => d.tipo_documento === 'contrato_mutuo');
  if (!mutuos.length) return { id: 'R10', passado: null, motivo: 'Nenhum contrato de mútuo encontrado' };

  const extratos = documentos.filter(d => d.tipo_documento === 'extrato_bancario_corrente');
  const alertas = [];

  mutuos.forEach(mutuo => {
    const valorMutuo = parseMoeda(mutuo.dados_extraidos?.valor || 0);
    const dataMutuo = mutuo.dados_extraidos?.data_contrato;
    if (!valorMutuo) return;

    const entradaEncontrada = extratos.some(ext => {
      const entradas = ext.dados_extraidos?.entradas || ext.dados_extraidos?.creditos || [];
      return entradas.some(e => {
        const valorE = parseMoeda(e.valor || 0);
        return Math.abs(valorE - valorMutuo) / valorMutuo < 0.02; // tolerância 2%
      });
    });

    if (!entradaEncontrada) {
      alertas.push({
        contrato: mutuo.nome_arquivo,
        valor: valorMutuo,
        data: dataMutuo,
        severidade: 'critica',
        mensagem: `Mútuo de R$ ${valorMutuo.toLocaleString('pt-BR')} sem entrada correspondente nos extratos`
      });
    }
  });

  return {
    id: 'R10', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Contratos de mútuo sem crédito comprovado nos extratos bancários. Inclua extrato do mês do recebimento.' : null
  };
};

// --- REGRA 11: Mútuo vs Capacidade do Mutuante ---
const regra11_capacidade_mutuante = (documentos) => {
  const mutuos = documentos.filter(d => d.tipo_documento === 'contrato_mutuo');
  const balanceteMutuante = documentos.find(d => d.tipo_documento === 'balancete_mutuante');
  if (!mutuos.length || !balanceteMutuante) return { id: 'R11', passado: null, motivo: !mutuos.length ? 'Sem contratos de mútuo' : 'Balancete do mutuante não apresentado' };

  const alertas = [];
  const saldoMutuante = parseMoeda(balanceteMutuante.dados_extraidos?.saldo_bancos || balanceteMutuante.dados_extraidos?.ativo_circulante || 0);

  mutuos.forEach(mutuo => {
    const valorMutuo = parseMoeda(mutuo.dados_extraidos?.valor || 0);
    if (!valorMutuo || !saldoMutuante) return;
    if (saldoMutuante < valorMutuo) {
      alertas.push({
        contrato: mutuo.nome_arquivo,
        valorMutuo,
        saldoMutuante,
        severidade: 'critica',
        mensagem: `Mutuante possui R$ ${saldoMutuante.toLocaleString('pt-BR')} disponível, mas emprestou R$ ${valorMutuo.toLocaleString('pt-BR')}`
      });
    }
  });

  return {
    id: 'R11', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Mutuante aparentemente não possui capacidade financeira para conceder o empréstimo. Risco de mútuo fictício.' : null
  };
};

// --- REGRA 12: Mútuo vs IOF ---
const regra12_mutuo_iof = (documentos) => {
  const mutuos = documentos.filter(d => d.tipo_documento === 'contrato_mutuo');
  const iof = documentos.find(d => d.tipo_documento === 'comprovante_iof');
  if (!mutuos.length) return { id: 'R12', passado: null, motivo: 'Sem contratos de mútuo' };

  const alertas = [];

  mutuos.forEach(mutuo => {
    const valorMutuo = parseMoeda(mutuo.dados_extraidos?.valor || 0);
    const diasContrato = parseInt(mutuo.dados_extraidos?.prazo_dias || 365);
    const mutuantePJ = mutuo.dados_extraidos?.tipo_mutuante === 'pj' || mutuo.dados_extraidos?.cnpj_mutuante;
    if (!mutuantePJ || !valorMutuo) return;

    // IOF = (Valor × 0,0041% × dias) + (Valor × 0,38%)
    const iofEsperado = (valorMutuo * 0.000041 * Math.min(diasContrato, 365)) + (valorMutuo * 0.0038);

    if (!iof) {
      alertas.push({ severidade: 'critica', valorMutuo, iofEsperado: iofEsperado.toFixed(2), mensagem: 'DARF de IOF não apresentado para mútuo com PJ mutuante' });
      return;
    }

    const iofRecolhido = parseMoeda(iof.dados_extraidos?.valor || 0);
    const diferenca = Math.abs(iofRecolhido - iofEsperado);
    if (diferenca > iofEsperado * 0.1) {
      alertas.push({ severidade: 'media', valorMutuo, iofEsperado: iofEsperado.toFixed(2), iofRecolhido, diferenca: diferenca.toFixed(2), mensagem: `IOF esperado: R$ ${iofEsperado.toFixed(2)} — Recolhido: R$ ${iofRecolhido.toFixed(2)}` });
    }
  });

  return {
    id: 'R12', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'IOF de mútuo PJ não recolhido ou divergente. Calcule e recolha o DARF conforme fórmula: (Valor × 0,0041% × dias) + (Valor × 0,38%).' : null
  };
};

// --- REGRA 13: Empréstimo bancário vs Extratos ---
const regra13_emprestimo_bancario = (documentos) => {
  const extratos = documentos.filter(d => d.tipo_documento === 'extrato_bancario_corrente');
  if (!extratos.length) return { id: 'R13', passado: null, motivo: 'Extratos não disponíveis' };

  const alertas = [];
  extratos.forEach(ext => {
    const entradas = ext.dados_extraidos?.entradas || ext.dados_extraidos?.creditos || [];
    entradas.forEach(entrada => {
      const desc = normalizar(entrada.origem || entrada.historico || entrada.descricao || '');
      const isEmprestimo = desc.includes('emprestimo') || desc.includes('credito') || desc.includes('financiamento') || desc.includes('cge') || desc.includes('bndes');
      if (isEmprestimo) {
        const temContrato = documentos.some(d =>
          (d.tipo_documento === 'contrato_mutuo') && parseMoeda(d.dados_extraidos?.valor || 0) > 0
        );
        if (!temContrato) {
          alertas.push({ banco: ext.dados_extraidos?.banco, data: entrada.data, valor: entrada.valor, descricao: entrada.historico || entrada.origem, severidade: 'media', mensagem: 'Crédito identificado como empréstimo sem contrato correspondente' });
        }
      }
    });
  });

  return {
    id: 'R13', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Empréstimos nos extratos sem contrato vinculado. Inclua contratos bancários dos créditos identificados.' : null
  };
};

// --- REGRA 14: Espaço físico vs Operação ---
const regra14_espaco_fisico = (documentos) => {
  const tiposEvidencia = ['conta_energia', 'plano_internet', 'guia_iptu', 'contrato_locacao', 'escritura_imovel', 'comprovante_espaco_armazenamento'];
  const encontrados = tiposEvidencia.filter(t => documentos.some(d => d.tipo_documento === t));

  if (encontrados.length === 0) {
    return { id: 'R14', passado: false, alertas: [{ severidade: 'media', mensagem: 'Nenhum comprovante de espaço físico apresentado' }], sugestao: 'Inclua ao menos um comprovante de endereço/espaço físico: conta de energia, contrato de locação, IPTU ou escritura.' };
  }

  const alertas = [];
  const endContrato = normalizar(documentos.find(d => d.tipo_documento === 'contrato_social')?.dados_extraidos?.endereco || '');

  encontrados.forEach(tipo => {
    const doc = documentos.find(d => d.tipo_documento === tipo);
    const endDoc = normalizar(doc?.dados_extraidos?.endereco || '');
    if (endContrato && endDoc && !endDoc.includes(endContrato.slice(0, 8)) && !endContrato.includes(endDoc.slice(0, 8))) {
      alertas.push({ tipo, enderecoDoc: doc.dados_extraidos?.endereco, severidade: 'leve', mensagem: `Endereço do ${tipo.replace(/_/g, ' ')} pode divergir do contrato social` });
    }
  });

  return {
    id: 'R14', passado: alertas.length === 0,
    encontrados, alertas,
    sugestao: alertas.length > 0 ? 'Verifique coerência dos endereços nos comprovantes de domicílio com o contrato social.' : null
  };
};

// --- REGRA 15: Balanço vs Contrato Social (capital) ---
const regra15_balanco_contrato = (documentos) => {
  const contrato = documentos.find(d => d.tipo_documento === 'contrato_social');
  const balanco = documentos.find(d => d.tipo_documento === 'balanco_patrimonial_integralizacao');
  if (!contrato || !balanco) return { id: 'R15', passado: null, motivo: 'Contrato social ou balanço patrimonial não disponíveis' };

  const capitalContrato = parseMoeda(contrato.dados_extraidos?.capital_social || 0);
  const capitalBalanco = parseMoeda(balanco.dados_extraidos?.capital_social || 0);

  if (!capitalContrato || !capitalBalanco) return { id: 'R15', passado: null, motivo: 'Capital social não extraído de um dos documentos' };

  const diferenca = Math.abs(capitalContrato - capitalBalanco);
  const pct = capitalContrato > 0 ? diferenca / capitalContrato : 0;

  const alertas = [];
  if (pct > 0.01) {
    alertas.push({ capitalContrato, capitalBalanco, diferenca, pct: (pct * 100).toFixed(1) + '%', severidade: pct > 0.1 ? 'critica' : 'media', mensagem: `Capital no contrato (R$ ${capitalContrato.toLocaleString('pt-BR')}) difere do balanço (R$ ${capitalBalanco.toLocaleString('pt-BR')})` });
  }

  return {
    id: 'R15', passado: alertas.length === 0,
    alertas,
    sugestao: alertas.length > 0 ? 'Capital social diverge entre contrato social e balanço. Regularize contabilmente ou atualize o contrato.' : null
  };
};

// --- REGRA 16: Coerência patrimonial ---
const regra16_coerencia_patrimonial = (documentos, caso) => {
  const balanco = documentos.find(d => d.tipo_documento === 'balanco_patrimonial_integralizacao');
  const extratos = documentos.filter(d => d.tipo_documento === 'extrato_bancario_corrente' || d.tipo_documento === 'extrato_bancario_aplicacoes');
  const estimativa = parseMoeda(caso?.estimativa_calculada || caso?.limite_pretendido || 0);

  const patrimonio = parseMoeda(balanco?.dados_extraidos?.patrimonio_liquido || 0);
  const disponibilidade = extratos.reduce((acc, ext) => acc + parseMoeda(ext.dados_extraidos?.saldo_final || 0), 0);

  if (!estimativa) return { id: 'R16', passado: null, motivo: 'Valor da estimativa não informado no caso' };

  const alertas = [];
  if (disponibilidade > 0 && estimativa > disponibilidade * 1.5) {
    alertas.push({ severidade: 'critica', disponibilidade, estimativa, mensagem: `Estimativa solicitada (R$ ${estimativa.toLocaleString('pt-BR')}) é ${(estimativa / disponibilidade).toFixed(1)}x maior que a disponibilidade financeira comprovada` });
  }
  if (patrimonio > 0 && estimativa > patrimonio * 2) {
    alertas.push({ severidade: 'media', patrimonio, estimativa, mensagem: `Estimativa solicitada supera em mais de 2x o patrimônio líquido declarado` });
  }

  return {
    id: 'R16', passado: alertas.length === 0,
    disponibilidade, patrimonio, estimativa, alertas,
    sugestao: alertas.length > 0 ? 'Estimativa solicitada pode não ser sustentada pela capacidade financeira comprovada. Considere ajustar o valor ou reforçar a documentação financeira.' : null
  };
};

// ============================================================
// EXECUTOR PRINCIPAL — todas as 16 regras
// ============================================================
export const executarAuditoriaPlen = (documentos = [], caso = {}) => {
  return [
    regra1_cnpj(documentos, caso),
    regra2_responsavel(documentos),
    regra3_endereco(documentos),
    regra4_extratos_balancetes(documentos),
    regra5_disponibilidade(documentos, caso),
    regra6_entradas_sem_origem(documentos),
    regra7_capital_integralizacao(documentos),
    regra8_aumento_capital(documentos),
    regra9_transferencias_socios(documentos),
    regra10_mutuo_extratos(documentos),
    regra11_capacidade_mutuante(documentos),
    regra12_mutuo_iof(documentos),
    regra13_emprestimo_bancario(documentos),
    regra14_espaco_fisico(documentos),
    regra15_balanco_contrato(documentos),
    regra16_coerencia_patrimonial(documentos, caso),
  ];
};

export const REGRAS_META = {
  R1:  { titulo: 'CNPJ em todos os documentos',          categoria: 'Jurídico',    norm: 'Art. 7º Portaria Coana 72' },
  R2:  { titulo: 'Responsável e Procurador',              categoria: 'Jurídico',    norm: 'Art. 7º Portaria Coana 72' },
  R3:  { titulo: 'Endereço — contrato vs comprovantes',   categoria: 'Operacional', norm: 'Anexo Único Portaria Coana 72' },
  R4:  { titulo: 'Extratos × Balancetes (saldos)',        categoria: 'Contábil',    norm: 'IN 1984/2020 Art. 5º' },
  R5:  { titulo: 'Disponibilidade financeira comprovada', categoria: 'Financeiro',  norm: 'IN 1984/2020 Art. 4º' },
  R6:  { titulo: 'Entradas financeiras sem origem',       categoria: 'Financeiro',  norm: 'IN 1984/2020 Art. 5º' },
  R7:  { titulo: 'Capital integralizado × transferências',categoria: 'Societário',  norm: 'Portaria Coana 72 §2º' },
  R8:  { titulo: 'Aumento de capital — documentação',     categoria: 'Societário',  norm: 'Portaria Coana 72 Art. 6º' },
  R9:  { titulo: 'Transferências × Sócios',               categoria: 'Societário',  norm: 'Portaria Coana 72 Art. 6º' },
  R10: { titulo: 'Mútuo × entrada nos extratos',          categoria: 'Financeiro',  norm: 'IN 1984/2020 Art. 5º' },
  R11: { titulo: 'Capacidade financeira do mutuante',     categoria: 'Financeiro',  norm: 'Portaria Coana 72 Art. 6º' },
  R12: { titulo: 'Mútuo PJ × recolhimento IOF',           categoria: 'Tributário',  norm: 'Decreto 6.306/2007' },
  R13: { titulo: 'Empréstimo bancário × contratos',       categoria: 'Financeiro',  norm: 'IN 1984/2020 Art. 5º' },
  R14: { titulo: 'Espaço físico × comprovantes',          categoria: 'Operacional', norm: 'Portaria Coana 72 Anexo' },
  R15: { titulo: 'Balanço × Capital social (contrato)',   categoria: 'Contábil',    norm: 'CFC NBC TG 26' },
  R16: { titulo: 'Coerência patrimonial geral',           categoria: 'Financeiro',  norm: 'IN 1984/2020 Art. 4º' },
};