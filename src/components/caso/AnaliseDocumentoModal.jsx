import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function AnaliseDocumentoModal({ item, documentos, casoId, cliente, onClose }) {
  const [analisando, setAnalisando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const queryClient = useQueryClient();

  const linkedDoc = documentos.find(d => d.tipo_documento === item.tipo_documento);

  const saveMutation = useMutation({
    mutationFn: (analiseData) => base44.entities.AnaliseHistorico.create(analiseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico', casoId] });
    }
  });

  const analisarBalanceteVsExtrato = async () => {
    setAnalisando(true);
    try {
      // Buscar todos os balancetes e extratos do caso
      const balancetes = documentos.filter(d => d.tipo_documento?.includes('balancete'));
      const extratos = documentos.filter(d => d.tipo_documento?.includes('extrato'));

      if (balancetes.length === 0 || extratos.length === 0) {
        setResultados({
          erro: true,
          mensagem: 'Balancetes ou extratos não encontrados. Upload ambos os documentos para análise.'
        });
        setAnalisando(false);
        return;
      }

      // Extrair dados dos balancetes
      const promptBalancete = `Analise este balancete contábil e extraia:
      - Saldos de caixa e equivalentes de caixa (contas do ativo circulante, grupo Caixa/Bancos)
      - Data final do período
      - Valores detalhados por banco/conta
      
      Retorne como JSON com estrutura: { data_balancete: string, saldos_caixa: {[banco]: number}, total_caixa: number, contas_detalhadas: {[descricao]: number} }`;

      // Obter URLs assinadas para balancetes
      const balanceteUrls = await Promise.all(balancetes.map(async (b) => {
        if (b.file_url) return b.file_url;
        if (b.file_uri) {
          const signedResult = await base44.integrations.Core.CreateFileSignedUrl({
            file_uri: b.file_uri,
            expires_in: 3600
          });
          return signedResult.signed_url;
        }
        return null;
      }));

      const dadosBalancete = await base44.integrations.Core.InvokeLLM({
        prompt: promptBalancete,
        file_urls: balanceteUrls.filter(url => url),
        response_json_schema: {
          type: 'object',
          properties: {
            data_balancete: { type: 'string' },
            saldos_caixa: { type: 'object' },
            total_caixa: { type: 'number' },
            contas_detalhadas: { type: 'object' }
          }
        }
      });

      // Extrair dados dos extratos (último dia do mês anterior)
      const promptExtratos = `Analise estes extratos bancários e para CADA MÊS, extraia:
      - Saldo final do ÚLTIMO DIA do mês
      - Nome do banco
      - Número da conta
      
      Retorne como JSON com estrutura: { extratos: [{banco: string, conta: string, mes_ano: string, saldo_final: number, saldo_data: string}] }`;

      // Obter URLs assinadas para extratos
      const extratosUrls = await Promise.all(extratos.map(async (e) => {
        if (e.file_url) return e.file_url;
        if (e.file_uri) {
          const signedResult = await base44.integrations.Core.CreateFileSignedUrl({
            file_uri: e.file_uri,
            expires_in: 3600
          });
          return signedResult.signed_url;
        }
        return null;
      }));

      const dadosExtratos = await base44.integrations.Core.InvokeLLM({
        prompt: promptExtratos,
        file_urls: extratosUrls.filter(url => url),
        response_json_schema: {
          type: 'object',
          properties: {
            extratos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  banco: { type: 'string' },
                  conta: { type: 'string' },
                  mes_ano: { type: 'string' },
                  saldo_final: { type: 'number' },
                  saldo_data: { type: 'string' }
                }
              }
            }
          }
        }
      });

      // Comparar saldos
      const discrepancias = [];
      
      if (dadosBalancete.total_caixa && dadosExtratos.extratos) {
        for (const extrato of dadosExtratos.extratos) {
          const saldoBalancete = dadosBalancete.saldos_caixa[extrato.banco] || 0;
          const diferenca = Math.abs(saldoBalancete - extrato.saldo_final);

          if (diferenca > 0.01) {
            discrepancias.push({
              banco: extrato.banco,
              conta: extrato.conta,
              periodo: extrato.mes_ano,
              saldo_balancete: saldoBalancete,
              saldo_extrato: extrato.saldo_final,
              diferenca: diferenca,
              severidade: diferenca > 100 ? 'critica' : diferenca > 10 ? 'media' : 'leve'
            });
          }
        }
      }

      setResultados({
        erro: false,
        balancete: dadosBalancete,
        extratos: dadosExtratos.extratos,
        discrepancias: discrepancias
      });
    } catch (error) {
      console.error('Erro na análise:', error);
      setResultados({
        erro: true,
        mensagem: 'Erro ao analisar documentos. Verifique se os PDFs estão legíveis.'
      });
    } finally {
      setAnalisando(false);
    }
  };

  const analisarDocumentoSimples = async () => {
    setAnalisando(true);
    try {
      if (!linkedDoc) {
        setResultados({
          erro: true,
          mensagem: 'Nenhum documento vinculado encontrado.'
        });
        setAnalisando(false);
        return;
      }

      const tipoDoc = item.tipo_documento;
      const isDocumentoIdentificacao = tipoDoc.includes('documento_identificacao');
      const isProcuracao = tipoDoc === 'procuracao';
      
      // Para procurações, buscar docs do procurador
      let procuradorDocs = [];
      if (isProcuracao) {
        procuradorDocs = documentos.filter(d => d.tipo_documento === 'documento_identificacao_procurador');
      }
      
      // Prompt bem mais simples para identificação
      const prompt = isDocumentoIdentificacao 
        ? `Extraia os dados do documento de identificação:
Nome, CPF, RG, Data Nascimento, Data Emissão, Órgão Emissor, Data Validade.
Verifique: Documento válido? Foto legível? Dados completos?
Retorne JSON: {dados_extraidos: {nome, cpf, rg, data_nascimento, data_emissao, orgao_emissor, data_validade}, checklist_verificacao: [{item, status, observacao}], indicadores_alerta: [], resumo: string, classificacao_final: "APROVADO"|"REPROVADO"}`
        : isProcuracao && procuradorDocs.length > 0
        ? `Você é analista de procurações para RADAR.

PROCURAÇÃO FORNECIDA: Extraia dados do outorgante e outorgado
- Nome do outorgante (quem outorga - sócio/administrador)
- CPF do outorgante
- Nome do outorgado (procurador - quem recebe os poderes)
- CPF do outorgado
- Poderes concedidos
- Data da procuração
- Data de validade/vencimento
- Reconhecimento de firma

DOCUMENTOS DO PROCURADOR FORNECIDOS: Você também receberá documento(s) de identificação do procurador (outorgado).

ANÁLISE REQUERIDA:
1. Extraia dados da procuração (acima)
2. Compare nome e CPF do procurador na procuração COM nome e CPF no documento de identificação
3. Verifique se coincidem - se não coincidem é CRÍTICO

Retorne JSON: {
  dados_procuracao: {outorgante_nome, outorgante_cpf, outorgado_nome, outorgado_cpf, poderes, data_procuracao, validade, reconhecimento_firma},
  dados_procurador_documento: {nome, cpf},
  comparacao_procurador: {
    nomes_coincidem: boolean,
    cpfs_coincidem: boolean,
    observacao: string
  },
  checklist_verificacao: [{item, status, observacao}],
  indicadores_alerta: [{tipo, severidade, descricao}],
  resumo: string,
  classificacao_final: "APROVADO"|"REPROVADO"
}`
        : `Você é um analista especializado em habilitação RADAR conforme IN RFB nº 1.984/2020 e Portaria Coana nº 72/2020.

DOCUMENTO A ANALISAR: ${tipoDoc}

CONTEXTO DA EMPRESA:
- Razão Social: ${cliente?.razao_social}
- CNPJ: ${cliente?.cnpj}
- Endereço: ${cliente?.endereco}

GUIA DE ANÁLISE POR TIPO DE DOCUMENTO:

${getAnalysisGuideForType(tipoDoc)}

INSTRUÇÕES:
1. Extraia TODOS os dados relevantes do documento
2. Aplique o CHECKLIST DE VERIFICAÇÃO específico do tipo de documento
3. Identifique INDICADORES DE ALERTA conforme o guia
4. Verifique se há necessidade de VERIFICAÇÃO CRUZADA com outros documentos
5. Classifique cada problema como: CRÍTICO, MÉDIO ou LEVE

Retorne JSON estruturado com:
{
  dados_extraidos: {campos relevantes do documento},
  checklist_verificacao: [{item: string, status: "OK"|"ALERTA"|"CRÍTICO", observacao: string}],
  indicadores_alerta: [{tipo: string, severidade: "critica"|"media"|"leve", descricao: string, fundamento_normativo: string}],
  verificacoes_cruzadas_necessarias: [{documento_relacionado: string, o_que_verificar: string}],
  validacoes_cadastro: [{campo: string, valor_documento: string, valor_cadastro: string, coincide: boolean}],
  resumo: string,
  classificacao_final: "APROVADO"|"APROVADO_COM_RESSALVAS"|"REPROVADO"
}`;

      // Obter URL assinada se for file_uri
      let fileUrl = linkedDoc.file_url;
      if (!fileUrl && linkedDoc.file_uri) {
        const signedResult = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: linkedDoc.file_uri,
          expires_in: 3600
        });
        fileUrl = signedResult.signed_url;
      }

      if (!fileUrl) {
        throw new Error('URL do documento não disponível');
      }

      // Array de arquivos - pode ter múltiplos do mesmo tipo
      const linkedDocs = documentos.filter(d => d.tipo_documento === item.tipo_documento);
      const fileUrls = [];
      
      for (const doc of linkedDocs) {
        let docUrl = doc.file_url;
        if (!docUrl && doc.file_uri) {
          const signedResult = await base44.integrations.Core.CreateFileSignedUrl({
            file_uri: doc.file_uri,
            expires_in: 3600
          });
          docUrl = signedResult.signed_url;
        }
        if (docUrl) {
          fileUrls.push(docUrl);
        }
      }

      if (fileUrls.length === 0) {
        throw new Error('Nenhuma URL de documento disponível');
      }

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls,
        response_json_schema: isDocumentoIdentificacao 
          ? {
              type: 'object',
              properties: {
                dados_extraidos: { type: 'object' },
                checklist_verificacao: {
                  type: 'array',
                  items: { type: 'object' }
                },
                indicadores_alerta: { type: 'array' },
                resumo: { type: 'string' },
                classificacao_final: { type: 'string' }
              }
            }
          : {
              type: 'object',
              properties: {
                dados_extraidos: { type: 'object' },
                checklist_verificacao: { type: 'array' },
                indicadores_alerta: { type: 'array' },
                verificacoes_cruzadas_necessarias: { type: 'array' },
                validacoes_cadastro: { type: 'array' },
                resumo: { type: 'string' },
                classificacao_final: { type: 'string' }
              }
            }
      });

      setResultados({
        erro: false,
        dados: resultado
      });
    } catch (error) {
      console.error('Erro na análise:', error);
      setResultados({
        erro: true,
        mensagem: 'Erro ao analisar documento. Verifique se o PDF está legível.'
      });
    } finally {
      setAnalisando(false);
    }
  };

  const getAnalysisGuideForType = (tipoDoc) => {
    const guias = {
      'contrato_mutuo': `
CONTRATO DE MÚTUO (Código: 5120)
Finalidade: Comprovar que recursos foram emprestados à empresa para integralizar capital ou aumentar capacidade financeira.

CHECKLIST DE VERIFICAÇÃO:
✓ Contrato registrado em cartório
✓ Identificação completa do mutuante e mutuário
✓ Valor, prazo e condições do empréstimo
✓ Assinaturas e reconhecimento de firma

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Valor deve corresponder EXATAMENTE ao depósito no extrato bancário (5150)
- Data do contrato deve ser anterior ou próxima à data do depósito
- Recolhimento de IOF (5140) deve corresponder ao valor do mútuo
- Se mutuante PJ: verificar capacidade financeira através do Balancete (6110)

INDICADORES DE ALERTA:
🔴 CRÍTICO: Contrato com data de registro muito posterior à transferência (>30 dias)
🔴 CRÍTICO: Mutuante sem capacidade financeira aparente
🔴 CRÍTICO: Ausência de recolhimento de IOF quando obrigatório
🟡 MÉDIO: Valor do mútuo incompatível com a necessidade da empresa`,

      'extrato_bancario_corrente': `
EXTRATOS BANCÁRIOS (Códigos: 5100, 5150)
Finalidade: Comprovar existência efetiva de recursos financeiros na conta da empresa.

CHECKLIST DE VERIFICAÇÃO:
✓ Período completo (últimos 3 meses)
✓ Identificação do banco, agência e conta
✓ Saldos iniciais e finais claramente identificados
✓ Movimentações legíveis

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Saldo final em "Bancos" deve corresponder ao saldo em "Bancos" no Balancete (6100)
- Grandes depósitos devem ser rastreáveis a contrato de mútuo (5120) ou integralização
- Movimentação deve ser compatível com atividade da empresa
- Saques e transferências devem ter justificativa contábil

INDICADORES DE ALERTA:
🔴 CRÍTICO: Saldos "bate e volta" (recursos que entram e saem rapidamente)
🔴 CRÍTICO: Depósitos sem origem aparente
🟡 MÉDIO: Movimentação atípica para o porte da empresa
🟡 MÉDIO: Ausência de registros de aportes declarados
🟠 LEVE: Conta com saldo zero em períodos críticos`,

      'balancete_verificacao': `
BALANCETE DE VERIFICAÇÃO (Códigos: 6100, 6110)
Finalidade: Comprovar posição financeira através de registros contábeis.

CHECKLIST DE VERIFICAÇÃO:
✓ Data de referência
✓ Conta "Bancos" ou "Caixa e Equivalentes"
✓ Capital Social
✓ Empréstimos e financiamentos
✓ Balancete equilibrado (débitos = créditos)

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Saldo em "Bancos" IDÊNTICO ao saldo final do extrato bancário
- Capital social deve corresponder ao Contrato Social (3100)
- Empréstimos devem estar documentados (5120, 5130)
- Aplicações financeiras rastreáveis em extratos

INDICADORES DE ALERTA:
🔴 CRÍTICO: Divergências entre saldo bancário e contábil
🔴 CRÍTICO: Capital social não integralizado
🟡 MÉDIO: Empréstimos não documentados
🔴 CRÍTICO: Balancete desequilibrado`,

      'balanco_patrimonial_integralizacao': `
BALANÇO PATRIMONIAL (Código: 6120)
Finalidade: Comprovar situação patrimonial consolidada, especialmente capacidade financeira.

CHECKLIST DE VERIFICAÇÃO:
✓ Data de encerramento
✓ Ativo circulante detalhado
✓ Capital social
✓ Situação patrimonial líquida

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Ativo circulante deve corresponder aos saldos em extratos e balancete
- Capital social IDÊNTICO ao Contrato Social
- Integralização comprovada através de contratos de mútuo ou transferências

INDICADORES DE ALERTA:
🔴 CRÍTICO: Ativo circulante inferior ao necessário para modalidade desejada
🔴 CRÍTICO: Capital social não integralizado
🟡 MÉDIO: Presença significativa de contas a receber/estoques no ativo circulante`,

      'contrato_social': `
CONTRATO SOCIAL E ALTERAÇÕES (Código: 3100)
Finalidade: Comprovar constituição legal e identidade dos sócios.

CHECKLIST DE VERIFICAÇÃO:
✓ CNPJ correto
✓ Sócios identificados com CPF
✓ Capital social definido e integralizado
✓ Objeto social compatível com comércio exterior
✓ Endereço completo

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- CNPJ deve corresponder à Certidão da Junta Comercial (3110)
- Sócios iguais aos da Certidão, com mesmas participações
- Capital social deve corresponder ao Balanço (6120)
- Endereço igual ao das contas de consumo (4100, 4110)

INDICADORES DE ALERTA:
🔴 CRÍTICO: Alterações não registradas na Junta
🔴 CRÍTICO: Sócios diferentes entre contrato e certidão
🔴 CRÍTICO: Capital social não integralizado
🟡 MÉDIO: Endereço inconsistente`,

      'certidao_junta_comercial': `
CERTIDÃO DA JUNTA COMERCIAL (Código: 3110)
Finalidade: Comprovar registro legal na Junta Comercial.

CHECKLIST DE VERIFICAÇÃO:
✓ Certidão atualizada (menos de 3 meses)
✓ Situação cadastral ATIVA
✓ CNPJ correto
✓ Sócios e capital social registrados
✓ Atividades incluem comércio exterior

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Deve corresponder EXATAMENTE ao Contrato Social (3100)
- Sócios devem ser os mesmos do contrato
- Atividades compatíveis com comércio exterior

INDICADORES DE ALERTA:
🔴 CRÍTICO: Certidão desatualizada (>3 meses)
🔴 CRÍTICO: Situação suspensa ou cancelada
🔴 CRÍTICO: Divergências entre certidão e contrato`,

      'procuracao': `
PROCURAÇÃO (Código: 2110)
Finalidade: Autorizar terceiro a representar a empresa em comércio exterior.

CHECKLIST DE VERIFICAÇÃO:
✓ Reconhecimento de firma em cartório
✓ Poderes específicos para comércio exterior
✓ Validade vigente
✓ Outorgante é sócio/administrador

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Outorgante deve ser sócio/administrador conforme Contrato Social (3100)
- Outorgado deve ter documento válido (2120)

INDICADORES DE ALERTA:
🟡 MÉDIO: Procurador sem vínculo aparente com empresa
🟡 MÉDIO: Poderes insuficientes para atos de comércio exterior
🟠 LEVE: Procuração próxima ao vencimento`,

      'documento_identificacao_responsavel': `
DOCUMENTO DE IDENTIFICAÇÃO DO RESPONSÁVEL (Código: 2100)
Finalidade: Comprovar identidade de quem assina o requerimento.

CHECKLIST DE VERIFICAÇÃO:
✓ Documento válido (não expirado)
✓ Foto legível
✓ Dados completos (nome, CPF, RG)
✓ Documento original ou cópia autenticada

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Nome deve corresponder ao Contrato Social (3100) como sócio/administrador
- CPF deve estar regular na RFB

INDICADORES DE ALERTA:
🔴 CRÍTICO: Documento expirado
🔴 CRÍTICO: Dados ilegíveis ou com rasuras
🔴 CRÍTICO: Foto não corresponde à pessoa`,

      'conta_energia': `
CONTA DE ENERGIA (Código: 4100)
Finalidade: Comprovar existência de estabelecimento físico e seu endereço.

CHECKLIST DE VERIFICAÇÃO:
✓ Conta recente (últimos 3 meses)
✓ Endereço completo
✓ Titular identificado
✓ Conta em dia (sem débitos)
✓ Consumo compatível

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Endereço IDÊNTICO ao do Contrato Social (3100)
- Titular deve ser a empresa ou sócio (conforme Contrato)
- Consumo compatível com porte da empresa

INDICADORES DE ALERTA:
🔴 CRÍTICO: Contas com débitos ou cortes
🟡 MÉDIO: Endereço residencial para grande volume
🟡 MÉDIO: Consumo muito baixo para atividade
🟠 LEVE: Titular sem vínculo com empresa`,

      'plano_internet': `
PLANO DE INTERNET (Código: 4110)
Finalidade: Comprovar infraestrutura de comunicação no estabelecimento.

CHECKLIST DE VERIFICAÇÃO:
✓ Contrato ou fatura recente
✓ Endereço do serviço
✓ Titular identificado
✓ Serviço ativo
✓ Velocidade adequada

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Endereço deve corresponder à Conta de Energia (4100) e Contrato Social
- Titular deve ser empresa ou sócio

INDICADORES DE ALERTA:
🔴 CRÍTICO: Serviço suspenso ou com débitos
🟡 MÉDIO: Endereço diferente do da empresa
🟠 LEVE: Velocidade insuficiente para atividade`,

      'guia_iptu': `
GUIA DE IPTU (Código: 3120)
Finalidade: Comprovar propriedade ou posse do imóvel onde empresa funciona.

CHECKLIST DE VERIFICAÇÃO:
✓ IPTU do ano corrente
✓ Endereço completo
✓ Proprietário identificado
✓ Situação regular (sem débitos)

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Endereço deve corresponder ao Contrato Social (3100)
- Proprietário deve ser empresa ou sócio

INDICADORES DE ALERTA:
🔴 CRÍTICO: IPTU em débito
🟡 MÉDIO: Endereço diferente do da empresa
🟡 MÉDIO: Imóvel em nome de terceiro sem vínculo`,

      'escritura_imovel': `
ESCRITURA DO IMÓVEL (Código: 3130)
Finalidade: Comprovar propriedade do imóvel onde empresa funciona.

CHECKLIST DE VERIFICAÇÃO:
✓ Matrícula do imóvel
✓ Endereço completo
✓ Proprietário identificado
✓ Metragem do imóvel
✓ Ônus e gravames

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Endereço correspondente ao Contrato Social (3100)
- Proprietário empresa ou sócio
- Metragem compatível com atividade

INDICADORES DE ALERTA:
🔴 CRÍTICO: Imóvel em nome de terceiro sem vínculo
🟡 MÉDIO: Hipotecas ou restrições significativas
🟡 MÉDIO: Metragem insuficiente para operações`,

      'contrato_locacao': `
CONTRATO DE LOCAÇÃO (Código: 3140)
Finalidade: Comprovar direito de uso do imóvel onde empresa funciona.

CHECKLIST DE VERIFICAÇÃO:
✓ Contrato vigente
✓ Locatário identificado
✓ Endereço completo
✓ Valor do aluguel
✓ Prazo adequado
✓ Pagamentos em dia

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Locatário deve ser empresa ou sócio (Contrato Social)
- Endereço correspondente ao Contrato Social (3100)
- Pagamentos em dia

INDICADORES DE ALERTA:
🔴 CRÍTICO: Contrato expirado ou próximo ao vencimento
🔴 CRÍTICO: Aluguel em atraso
🟡 MÉDIO: Locatário sem vínculo com empresa
🟡 MÉDIO: Endereço inconsistente`,

      'comprovante_espaco_armazenamento': `
COMPROVANTE DE ESPAÇO DE ARMAZENAGEM (Código: 3150)
Finalidade: Comprovar espaço adequado para armazenar mercadorias importadas.

CHECKLIST DE VERIFICAÇÃO:
✓ Localização do armazém
✓ Metragem disponível
✓ Responsável identificado
✓ Condições de armazenagem
✓ Vínculo com a empresa

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Localização compatível com operações de comércio exterior
- Metragem proporcional ao volume de importações
- Responsável com vínculo à empresa

INDICADORES DE ALERTA:
🔴 CRÍTICO: Espaço residencial ou inadequado
🟡 MÉDIO: Metragem insuficiente
🟡 MÉDIO: Responsável sem vínculo
🟠 LEVE: Localização de difícil acesso`,

      'comprovante_transferencia_integralizacao': `
COMPROVANTE DE TRANSFERÊNCIA (Código: 5160)
Finalidade: Comprovar origem e destino de transferências, especialmente aportes de capital.

CHECKLIST DE VERIFICAÇÃO:
✓ Comprovante bancário legível
✓ Conta de origem identificada
✓ Conta de destino identificada
✓ Valor e data
✓ Finalidade da transferência

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Valor correspondente ao Contrato de Mútuo (5120)
- Data próxima à data do contrato
- Conta de destino da empresa (conforme extratos)
- Conta de origem do mutuante (se mútuo)

INDICADORES DE ALERTA:
🔴 CRÍTICO: Transferência de conta suspeita ou sem identificação
🔴 CRÍTICO: Valor diferente do contrato
🟡 MÉDIO: Data distante do contrato (>15 dias)
🔴 CRÍTICO: Comprovante com características de falsidade`,

      'comprovante_iof': `
COMPROVANTE DE RECOLHIMENTO DE IOF (Código: 5140)
Finalidade: Comprovar pagamento de IOF sobre mútuo entre PJs.

CHECKLIST DE VERIFICAÇÃO:
✓ DARF ou comprovante oficial
✓ Código de receita correto
✓ Valor do IOF
✓ Data de recolhimento
✓ Contribuinte identificado

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- Valor do IOF correspondente ao Contrato de Mútuo (5120)
- Data próxima à data do contrato
- Contribuinte deve ser a empresa requerente

INDICADORES DE ALERTA:
🔴 CRÍTICO: IOF recolhido muito tempo após contrato (>30 dias)
🔴 CRÍTICO: Valor não corresponde ao mútuo
🔴 CRÍTICO: Recolhimento em nome de terceiro`,

      'das_simples_nacional': `
DAS - SIMPLES NACIONAL
Finalidade: Comprovar recolhimento de tributos (hipótese de revisão).

CHECKLIST DE VERIFICAÇÃO:
✓ Período correto
✓ CNPJ correto
✓ Valores recolhidos
✓ Situação de pagamento
✓ Consistência com faturamento

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- CNPJ correspondente ao Contrato Social
- Valores compatíveis com atividade declarada
- Pagamentos em dia

INDICADORES DE ALERTA:
🔴 CRÍTICO: DAS em atraso
🟡 MÉDIO: Valores incompatíveis com porte
🟠 LEVE: Faturamento muito baixo`,

      'darf_cprb': `
DARF CPRB
Finalidade: Comprovar recolhimento de CPRB (hipótese de revisão).

CHECKLIST DE VERIFICAÇÃO:
✓ Código de receita correto
✓ Período de apuração
✓ CNPJ correto
✓ Valores recolhidos
✓ Situação de pagamento

VERIFICAÇÃO CRUZADA OBRIGATÓRIA:
- CNPJ correspondente ao Contrato Social
- Valores compatíveis com folha de pagamento
- Pagamentos em dia

INDICADORES DE ALERTA:
🔴 CRÍTICO: DARF em atraso
🟡 MÉDIO: Valores incompatíveis com folha
🟠 LEVE: Base de cálculo suspeita`
    };

    return guias[tipoDoc] || `
ANÁLISE GENÉRICA DE DOCUMENTO

CHECKLIST BÁSICO:
✓ Documento legível e autêntico
✓ Dados da empresa identificáveis
✓ Período/data identificável
✓ Assinaturas e carimbos (se aplicável)

VERIFICAR:
- Consistência com dados cadastrais
- Autenticidade do documento
- Adequação ao propósito declarado

ALERTAS GERAIS:
🔴 Dados divergentes do cadastro
🟡 Documento desatualizado
🟠 Informações incompletas`;
  };

  const isBalancete = item.tipo_documento?.includes('balancete');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle>Analisar {item.descricao}</CardTitle>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {!resultados ? (
            <>
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <p className="font-semibold text-slate-900">Documento selecionado:</p>
                <p className="text-sm text-slate-600">{linkedDoc?.nome_arquivo}</p>
              </div>

              {isBalancete && (
                <>
                   <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <p className="font-semibold mb-1">Análise Automática:</p>
                    <p>Serão comparados os saldos de caixa/bancos do balancete com os saldos dos extratos bancários do último dia de cada mês.</p>
                  </div>

                  <Button
                    onClick={analisarBalanceteVsExtrato}
                    disabled={analisando}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {analisando ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      'Iniciar Análise de Balancete vs Extratos'
                    )}
                  </Button>
                </>
              )}

              {!isBalancete && (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <p className="font-semibold mb-1">Análise Automática:</p>
                    <p>Serão extraídas informações do documento e comparadas com os dados cadastrais da empresa.</p>
                  </div>

                  <Button
                    onClick={analisarDocumentoSimples}
                    disabled={analisando}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {analisando ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      'Iniciar Análise'
                    )}
                  </Button>
                </>
              )}
            </>
          ) : resultados.erro ? (
           <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
             <div className="flex items-start gap-3">
               <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
               <p className="text-sm text-red-800">{resultados.mensagem}</p>
             </div>
             <Button
               variant="outline"
               onClick={() => setResultados(null)}
               className="w-full"
             >
               Tentar Novamente
             </Button>
           </div>
          ) : !isBalancete && resultados.dados ? (
          <div className="space-y-4">
            {/* Classificação Final */}
            <div className={`p-4 rounded-lg border-2 ${
              resultados.dados.classificacao_final === 'APROVADO' 
                ? 'bg-green-50 border-green-300' 
                : resultados.dados.classificacao_final === 'APROVADO_COM_RESSALVAS'
                ? 'bg-yellow-50 border-yellow-300'
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center gap-3">
                {resultados.dados.classificacao_final === 'APROVADO' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <h4 className="font-bold text-lg">
                    {resultados.dados.classificacao_final?.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-sm mt-1">{resultados.dados.resumo}</p>
                </div>
              </div>
            </div>

            {/* Dados Extraídos */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                📄 Dados Extraídos do Documento
              </h4>
              <div className="text-sm space-y-1 text-slate-700">
                {Object.entries(resultados.dados.dados_extraidos || {}).map(([key, value]) => (
                  <p key={key}>
                    <strong className="text-slate-900">{key.replace(/_/g, ' ')}:</strong>{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </p>
                ))}
              </div>
            </div>

            {/* Checklist de Verificação */}
            {resultados.dados.checklist_verificacao?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  ✓ Checklist de Verificação
                </h4>
                {resultados.dados.checklist_verificacao.map((check, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    check.status === 'OK' 
                      ? 'bg-green-50 border-green-200' 
                      : check.status === 'ALERTA'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className="text-lg">
                        {check.status === 'OK' ? '✅' : check.status === 'ALERTA' ? '⚠️' : '❌'}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-900">{check.item}</p>
                        {check.observacao && (
                          <p className="text-xs text-slate-600 mt-1">{check.observacao}</p>
                        )}
                      </div>
                      <Badge className={
                        check.status === 'OK' 
                          ? 'bg-green-100 text-green-800' 
                          : check.status === 'ALERTA'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }>
                        {check.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Indicadores de Alerta */}
            {resultados.dados.indicadores_alerta?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  🚨 Indicadores de Alerta
                </h4>
                {resultados.dados.indicadores_alerta.map((alerta, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    alerta.severidade === 'critica' 
                      ? 'bg-red-50 border-red-300' 
                      : alerta.severidade === 'media'
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-blue-50 border-blue-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {alerta.severidade === 'critica' ? '🔴' : alerta.severidade === 'media' ? '🟡' : '🟠'}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm text-slate-900">{alerta.tipo}</p>
                          <Badge className={
                            alerta.severidade === 'critica' 
                              ? 'bg-red-600 text-white' 
                              : alerta.severidade === 'media'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-blue-600 text-white'
                          }>
                            {alerta.severidade.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 mb-2">{alerta.descricao}</p>
                        {alerta.fundamento_normativo && (
                          <p className="text-xs text-slate-500 italic">
                            Base legal: {alerta.fundamento_normativo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Validações com Cadastro */}
            {resultados.dados.validacoes_cadastro?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  🔍 Validações com Cadastro
                </h4>
                {resultados.dados.validacoes_cadastro.map((val, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    val.coincide ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{val.coincide ? '✅' : '❌'}</span>
                      <div className="flex-1 text-sm">
                        <p className="font-semibold text-slate-900">{val.campo}</p>
                        <p className="text-slate-600 mt-1">
                          <span className="font-medium">Documento:</span> {val.valor_documento}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-medium">Cadastro:</span> {val.valor_cadastro}
                        </p>
                        {!val.coincide && (
                          <p className="text-red-700 font-semibold mt-1">⚠ INCONSISTÊNCIA DETECTADA</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Verificações Cruzadas Necessárias */}
            {resultados.dados.verificacoes_cruzadas_necessarias?.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  🔗 Verificações Cruzadas Recomendadas
                </h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  {resultados.dados.verificacoes_cruzadas_necessarias.map((verif, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span>→</span>
                      <div>
                        <p className="font-semibold">{verif.documento_relacionado}</p>
                        <p className="text-xs mt-0.5">{verif.o_que_verificar}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setResultados(null)}
                variant="outline"
                className="flex-1"
              >
                Nova Análise
              </Button>
              <Button
                onClick={async () => {
                  const user = await base44.auth.me();
                  await saveMutation.mutateAsync({
                    caso_id: casoId,
                    tipo_analise: 'validacao_documento',
                    documento_tipo: item.tipo_documento,
                    documento_nome: linkedDoc?.nome_arquivo,
                    usuario_email: user.email,
                    data_hora_analise: new Date().toISOString(),
                    total_discrepancias: resultados.dados.indicadores_alerta?.length || 0,
                    discrepancias_criticas: resultados.dados.indicadores_alerta?.filter(a => a.severidade === 'critica').length || 0,
                    discrepancias_medias: resultados.dados.indicadores_alerta?.filter(a => a.severidade === 'media').length || 0,
                    discrepancias_leves: resultados.dados.indicadores_alerta?.filter(a => a.severidade === 'leve').length || 0,
                    status_resultado: resultados.dados.classificacao_final === 'APROVADO' ? 'sem_discrepancias' : 'com_discrepancias',
                    dados_completos: resultados
                  });
                  onClose();
                }}
                disabled={saveMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Análise'
                )}
              </Button>
            </div>
          </div>
          ) : (
           <div className="space-y-4">
              {/* Resumo */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Resumo da Análise</h4>
                <div className="text-sm space-y-1 text-slate-600">
                  <p><strong>Saldo Total em Caixa (Balancete):</strong> R$ {(resultados.balancete?.total_caixa || 0).toLocaleString('pt-BR')}</p>
                  <p><strong>Número de Contas:</strong> {Object.keys(resultados.balancete?.saldos_caixa || {}).length}</p>
                  <p><strong>Período do Balancete:</strong> {resultados.balancete?.data_balancete}</p>
                </div>
              </div>

              {/* Discrepâncias */}
              {resultados.discrepancias?.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <h4 className="font-semibold text-slate-900">
                      {resultados.discrepancias.length} Discrepância(s) Encontrada(s)
                    </h4>
                  </div>
                  {resultados.discrepancias.map((disc, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        disc.severidade === 'critica'
                          ? 'bg-red-50 border-red-200'
                          : disc.severidade === 'media'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm flex-1">
                          <p className="font-semibold text-slate-900">{disc.banco}</p>
                          <p className="text-xs text-slate-600">Conta: {disc.conta}</p>
                          <p className="text-xs text-slate-600">Período: {disc.periodo}</p>
                          <div className="mt-2 space-y-0.5 text-xs">
                            <p>Balancete: <strong>R$ {disc.saldo_balancete.toLocaleString('pt-BR')}</strong></p>
                            <p>Extrato: <strong>R$ {disc.saldo_extrato.toLocaleString('pt-BR')}</strong></p>
                            <p className="text-red-600">Diferença: <strong>R$ {disc.diferenca.toLocaleString('pt-BR')}</strong></p>
                          </div>
                        </div>
                        <Badge
                          className={
                            disc.severidade === 'critica'
                              ? 'bg-red-100 text-red-800'
                              : disc.severidade === 'media'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {disc.severidade}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">Sem Discrepâncias</p>
                    <p className="text-sm text-green-700">Os saldos de caixa estão consistentes entre balancetes e extratos.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => setResultados(null)}
                  className="flex-1"
                  variant="outline"
                >
                  Nova Análise
                </Button>
                <Button
                  onClick={async () => {
                    const user = await base44.auth.me();
                    await saveMutation.mutateAsync({
                      caso_id: casoId,
                      tipo_analise: 'balancete_vs_extrato',
                      documento_tipo: item.tipo_documento,
                      documento_nome: linkedDoc?.nome_arquivo,
                      usuario_email: user.email,
                      data_hora_analise: new Date().toISOString(),
                      total_discrepancias: resultados.discrepancias?.length || 0,
                      discrepancias_criticas: resultados.discrepancias?.filter(d => d.severidade === 'critica').length || 0,
                      discrepancias_medias: resultados.discrepancias?.filter(d => d.severidade === 'media').length || 0,
                      discrepancias_leves: resultados.discrepancias?.filter(d => d.severidade === 'leve').length || 0,
                      status_resultado: resultados.discrepancias?.length > 0 ? 'com_discrepancias' : 'sem_discrepancias',
                      dados_completos: resultados
                    });
                    onClose();
                  }}
                  disabled={saveMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Análise'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}