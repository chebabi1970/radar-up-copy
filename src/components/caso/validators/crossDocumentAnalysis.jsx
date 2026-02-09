// Análise cruzada entre documentos para validação de consistência

export const crossDocumentRules = {
  // Procuração vs Documento de ID do Procurador
  procuracao_vs_doc_procurador: {
    nome: 'Validar nome do procurador',
    tipo: 'critico',
    validar: (procuracao, docProcurador) => {
      if (!procuracao?.dados_extraidos?.nome_outorgado || !docProcurador?.dados_extraidos?.nome) {
        return { passado: false, aviso: 'Dados não extraídos' };
      }
      
      const nomeProc = procuracao.dados_extraidos.nome_outorgado;
      const nomeDoc = docProcurador.dados_extraidos.nome;
      
      const normaliza = (s) => s?.toLowerCase().replace(/[^\w\s]/g, '').trim() || '';
      if (normaliza(nomeProc) === normaliza(nomeDoc)) {
        return { passado: true };
      }
      
      return {
        passado: false,
        severidade: 'critica',
        campo1: 'Procuração',
        valor1: nomeProc,
        campo2: 'Documento ID',
        valor2: nomeDoc,
        sugestao: 'Nomes não coincidem. Verifique documentação original.'
      };
    }
  },

  // Contrato Social vs Certidão Junta Comercial
  contrato_social_vs_certidao: {
    nome: 'Validar dados contrato social vs junta comercial',
    tipo: 'critico',
    validar: (contrato, certidao) => {
      const erros = [];
      
      // CNPJ
      if (contrato?.dados_extraidos?.cnpj && certidao?.dados_extraidos?.cnpj) {
        const cnpj1 = contrato.dados_extraidos.cnpj.replace(/\D/g, '');
        const cnpj2 = certidao.dados_extraidos.cnpj.replace(/\D/g, '');
        if (cnpj1 !== cnpj2) {
          erros.push({
            campo: 'CNPJ',
            valor1: cnpj1,
            valor2: cnpj2,
            fonte1: 'Contrato Social',
            fonte2: 'Junta Comercial',
            severidade: 'critica'
          });
        }
      }
      
      // Razão Social
      if (contrato?.dados_extraidos?.razao_social && certidao?.dados_extraidos?.razao_social) {
        const normaliza = (s) => s?.toLowerCase().replace(/[^\w]/g, '') || '';
        if (normaliza(contrato.dados_extraidos.razao_social) !== 
            normaliza(certidao.dados_extraidos.razao_social)) {
          erros.push({
            campo: 'Razão Social',
            valor1: contrato.dados_extraidos.razao_social,
            valor2: certidao.dados_extraidos.razao_social,
            fonte1: 'Contrato Social',
            fonte2: 'Junta Comercial',
            severidade: 'media'
          });
        }
      }
      
      // Sócios
      if (contrato?.dados_extraidos?.socios && certidao?.dados_extraidos?.socios) {
        const socios1 = contrato.dados_extraidos.socios.length;
        const socios2 = certidao.dados_extraidos.socios.length;
        if (socios1 !== socios2) {
          erros.push({
            campo: 'Número de Sócios',
            valor1: socios1,
            valor2: socios2,
            fonte1: 'Contrato Social',
            fonte2: 'Junta Comercial',
            severidade: 'critica'
          });
        }
      }
      
      return {
        passado: erros.length === 0,
        erros,
        sugestao: erros.length > 0 ? 'Divergências encontradas. Atualize contrato ou certidão.' : ''
      };
    }
  },

  // Balancete vs Extratos Bancários
  balancete_vs_extratos: {
    nome: 'Validar saldos de caixa',
    tipo: 'critico',
    validar: (balancete, extratos) => {
      if (!balancete?.dados_extraidos?.total_caixa || !extratos?.length) {
        return { passado: false, aviso: 'Dados não extraídos' };
      }
      
      const discrepancias = [];
      const saldoBalancete = balancete.dados_extraidos.total_caixa;
      
      let somaExtratos = 0;
      extratos.forEach((extrato, idx) => {
        const saldoExtrato = extrato.dados_extraidos?.saldo_final || 0;
        somaExtratos += saldoExtrato;
        
        const diferenca = Math.abs(saldoBalancete - saldoExtrato);
        if (diferenca > 0.01) {
          discrepancias.push({
            banco: extrato.dados_extraidos?.banco || `Conta ${idx + 1}`,
            saldoBalancete,
            saldoExtrato,
            diferenca,
            severidade: diferenca > 100 ? 'critica' : 'media'
          });
        }
      });
      
      return {
        passado: discrepancias.length === 0,
        discrepancias,
        sugestao: discrepancias.length > 0 
          ? 'Reconcilie saldos entre balancete e extratos.' 
          : ''
      };
    }
  },

  // Contrato de Mútuo vs IOF
  mutuo_vs_iof: {
    nome: 'Validar recolhimento IOF',
    tipo: 'critico',
    validar: (mutuo, iof) => {
      if (!mutuo?.dados_extraidos?.valor || !iof?.dados_extraidos?.valor) {
        return { passado: false, aviso: 'Dados não extraídos' };
      }
      
      const valorMutuo = parseFloat(mutuo.dados_extraidos.valor);
      const valorIOF = parseFloat(iof.dados_extraidos.valor);
      
      // IOF para pessoa jurídica é calculado (0.0082% ao dia até 15% máximo)
      // Aqui apenas validamos se existe valor positivo
      if (valorIOF <= 0) {
        return {
          passado: false,
          severidade: 'critica',
          campo: 'IOF',
          sugestao: 'IOF não foi recolhido. Verifique obrigatoriedade para PJ mutuante.'
        };
      }
      
      return {
        passado: true,
        informacao: `IOF recolhido: R$ ${valorIOF.toFixed(2)} sobre mútuo de R$ ${valorMutuo.toFixed(2)}`
      };
    }
  },

  // Documentos de Domicílio vs CNPJ
  domicilio_vs_cnpj: {
    nome: 'Validar endereço no CNPJ',
    tipo: 'critico',
    validar: (documentoDomicilio, cnpjData) => {
      if (!documentoDomicilio?.dados_extraidos?.endereco || !cnpjData?.endereco) {
        return { passado: false, aviso: 'Endereços não disponíveis' };
      }
      
      const normaliza = (s) => s?.toLowerCase().replace(/[^\w]/g, '') || '';
      const end1 = normaliza(documentoDomicilio.dados_extraidos.endereco);
      const end2 = normaliza(cnpjData.endereco);
      
      if (end1 === end2) {
        return { passado: true };
      }
      
      // Verificar se contém rua + número pelo menos
      const extraiRua = (s) => s.split(/\d+/)[0];
      const rua1 = extraiRua(end1);
      const rua2 = extraiRua(end2);
      
      if (rua1 && rua2 && rua1 === rua2) {
        return {
          passado: true,
          aviso: 'Endereço parcialmente coincidente (rua coincide)'
        };
      }
      
      return {
        passado: false,
        severidade: 'critica',
        campo: 'Endereço',
        valor1: documentoDomicilio.dados_extraidos.endereco,
        valor2: cnpjData.endereco,
        sugestao: 'Endereço diferente. Verifique se empresa mudou de sede.'
      };
    }
  },

  // Contrato de Locação vs Comprovante de Domicílio
  locacao_vs_domicilio: {
    nome: 'Validar consistência da locação',
    tipo: 'media',
    validar: (locacao, domicilio) => {
      if (!locacao?.dados_extraidos?.endereco || !domicilio?.dados_extraidos?.endereco) {
        return { passado: false, aviso: 'Endereços não extraídos' };
      }
      
      const normaliza = (s) => s?.toLowerCase().replace(/[^\w]/g, '') || '';
      const end1 = normaliza(locacao.dados_extraidos.endereco);
      const end2 = normaliza(domicilio.dados_extraidos.endereco);
      
      if (end1 === end2) {
        return { passado: true };
      }
      
      return {
        passado: false,
        severidade: 'media',
        sugestao: 'Endereços diferem. Verifique se múltiplas propriedades ou mudança de local.'
      };
    }
  }
};

export const executarAnaliseCruzada = (documentos, tipo1, tipo2, regra) => {
  const doc1 = documentos.find(d => d.tipo_documento === tipo1);
  const doc2 = documentos.find(d => d.tipo_documento === tipo2);
  
  if (!doc1 || !doc2) {
    return { passado: null, aviso: `Documentos ${tipo1} ou ${tipo2} não encontrados` };
  }
  
  return regra.validar(doc1, doc2);
};