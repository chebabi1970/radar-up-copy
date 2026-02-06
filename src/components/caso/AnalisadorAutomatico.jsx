import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, AlertTriangle, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const tiposDocumentos = {
  extrato_bancario_corrente: 'Extrato Bancário - Conta Corrente',
  extrato_bancario_aplicacoes: 'Extrato Bancário - Aplicações',
  conta_energia: 'Conta de Energia',
  plano_internet: 'Plano Internet',
  contrato_locacao: 'Contrato de Locação',
  contrato_mutuo: 'Contrato de Mútuo',
  balancete_verificacao: 'Balancete de Verificação',
  balanco_patrimonial_integralizacao: 'Balanço Patrimonial',
};

const severidadeColors = {
  critica: 'bg-red-100 text-red-800 border-red-200',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  leve: 'bg-blue-100 text-blue-800 border-blue-200'
};

export default function AnalisadorAutomatico({ casoId, documentos, checklistItems = [] }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [detalhesModal, setDetalhesModal] = useState(false);
  const queryClient = useQueryClient();

  // Validar se todos os itens do checklist estão aprovados ou N/A
  const temItemsPendentes = checklistItems.some(item => item.status === 'pendente');
  const podeAnalisar = documentos.length >= 1 && !temItemsPendentes;

  const salvarHistoricoMutation = useMutation({
    mutationFn: (dados) => base44.entities.AnaliseHistorico.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico', casoId] });
    }
  });

  const analisarDocumentos = async () => {
    if (!podeAnalisar) {
      if (temItemsPendentes) {
        alert('Todos os itens do checklist devem estar aprovados ou marcados como N/A antes de fazer a análise.');
      } else {
        alert('É necessário ter pelo menos 1 documento para fazer uma análise');
      }
      return;
    }

    setIsAnalyzing(true);
    setResultado(null);

    try {
      const user = await base44.auth.me();
      
      // Preparar dados dos documentos para análise
      const dadosDocumentos = documentos
        .filter(d => d.file_url || d.file_uri)
        .slice(0, 8) // Aumentar para 8 documentos
        .map(d => ({
          tipo: d.tipo_documento,
          nome: d.nome_arquivo,
          url: d.file_url || d.file_uri,
          data: d.data_documento,
          status_analise: d.status_analise
        }));

      // Buscar dados do cliente e caso completo
      const casos = await base44.entities.Caso.list({ id: casoId });
      const caso = casos.length > 0 ? casos[0] : null;
      const cliente = caso ? await base44.entities.Cliente.list({ id: caso.cliente_id }) : [];
      const clienteData = cliente.length > 0 ? cliente[0] : null;

      // Preparar URLs dos documentos para análise visual pela IA
      const documentoUrls = dadosDocumentos
        .filter(d => d.url && !d.url.includes('gs://')) // Apenas URLs públicas
        .slice(0, 5) // Limitar a 5 para análise visual
        .map(d => d.url);

      // Preparar contexto do checklist
      const checklistContext = checklistItems.map(item => ({
        tipo: item.tipo_documento,
        status: item.status,
        obrigatorio: item.obrigatorio,
        descricao: item.descricao
      }));

      // Chamar IA para análise com contexto completo
      const analise = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um analista sênior de conformidade RFB especializado em processos de habilitação de importadores/exportadores.

**DADOS DO CASO**:
Número: ${caso?.numero_caso || 'N/A'}
Status: ${caso?.status || 'N/A'}
Modalidade Pretendida: ${caso?.modalidade_pretendida || 'N/A'}
Limite Pretendido: ${caso?.limite_pretendido ? `USD ${caso.limite_pretendido.toLocaleString()}` : 'N/A'}
Hipótese Legal: ${caso?.hipotese_revisao || 'N/A'}

**CLIENTE**:
Razão Social: ${clienteData?.razao_social || 'N/A'}
CNPJ: ${clienteData?.cnpj || 'N/A'}
Endereço: ${clienteData?.endereco || 'N/A'}
Procuração e-CAC: ${clienteData?.procuracao_eletronica ? 'SIM' : 'NÃO'}

**DOCUMENTOS PARA ANÁLISE** (${dadosDocumentos.length} documentos):
${JSON.stringify(dadosDocumentos.map(d => ({ 
  tipo: tiposDocumentos[d.tipo] || d.tipo, 
  nome: d.nome, 
  data: d.data,
  status: d.status_analise 
})), null, 2)}

**CHECKLIST DE DOCUMENTOS OBRIGATÓRIOS**:
${JSON.stringify(checklistContext, null, 2)}

**ANÁLISE COMPLETA - CHECKLIST AUTOMATIZADO**:

1. **ANÁLISE DE CHECKLIST**:
   - Identificar documentos obrigatórios faltantes
   - Verificar conformidade dos documentos enviados vs obrigatoriedade
   - Alertar sobre documentos críticos não fornecidos

2. **CRUZAMENTO DE DOCUMENTOS FINANCEIROS**:
   - Somas do balancete devem corresponder aos saldos dos extratos
   - Datas de referência devem ser consistentes (mesmo período)
   - Saldos em 28/02 (ou 29 em anos bissextos), 30 e 31 devem corresponder
   - Validar se valores batem entre diferentes documentos

3. **VALIDAÇÃO DE DATAS E PRAZOS**:
   - Nenhum documento pode ter data futura
   - Verificar se documentos estão dentro de prazos de validade
   - Alertar se documentos têm datas muito antigas (>6 meses)
   - Comparar datas entre documentos relacionados

4. **EXTRAÇÃO AUTOMÁTICA DE DADOS CHAVE**:
   - Extrair valores financeiros (saldos, movimentações, capacidade)
   - Identificar CNPJs, razões sociais, endereços
   - Capturar datas de referência e períodos
   - Extrair assinaturas e autenticações

5. **VALIDAÇÃO CADASTRAL E DOCUMENTAL**:
   - Comparar RAZÃO SOCIAL do cadastro com documentos
   - Validar CNPJ em todos os documentos
   - Verificar ENDEREÇO cadastrado vs documentos
   - Confirmar procuração e-CAC se necessário

6. **DETECÇÃO DE PADRÕES SUSPEITOS**:
   - Movimentações anormais próximas ao período de análise
   - Saldos que aumentam/diminuem drasticamente entre períodos
   - Movimentos circulares (entrada/saída mesmo dia)
   - Valores "redondos" suspeitos

7. **ALERTAS ESPECÍFICOS RFB**:
   - ⚠️ Contrato de mútuo SEM registro em cartório
   - ⚠️ Falta de IOF em contratos de mútuo
   - ⚠️ Inconsistências de valores entre documentos
   - ⚠️ Documentação incompleta típica de rejeição
   - ⚠️ Falta de procuração e-CAC

8. **ANÁLISE PREDITIVA E RECOMENDAÇÕES**:
   - Probabilidade de aprovação (baixa/média/alta) com justificativa
   - Listar riscos que podem resultar em indeferimento
   - Sugerir próximos passos e documentos adicionais
   - Recomendar ações corretivas antes do protocolo

Retorne OBRIGATORIAMENTE um JSON estruturado com:
{
  "resumo": "resumo executivo focado em riscos críticos",
  "informacoes_extraidas": [
    {
      "documento": "nome do documento",
      "dados": { campos chave extraídos }
    }
  ],
  "discrepancias": [
    {
      "tipo": "tipo exato da discrepância",
      "descricao": "descrição técnica e detalhada",
      "documentos_envolvidos": ["doc1", "doc2"],
      "severidade": "critica|media|leve",
      "campo_1": "valor encontrado",
      "campo_2": "valor esperado"
    }
  ],
  "validacoes": [
    {
      "descricao": "validação realizada",
      "status": "ok|alerta|erro",
      "detalhes": "resultado detalhado"
    }
  ],
  "riscos": [
    {
      "descricao": "descrição do risco identificado",
      "impacto": "alto|medio|baixo",
      "fundamento": "por que é risco"
    }
  ],
  "probabilidade_aprovacao": "baixa|media|alta",
  "conclusao": "conclusão final com recomendações"
}`,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            resumo: { type: 'string' },
            informacoes_extraidas: { 
              type: 'array',
              items: { type: 'object' }
            },
            discrepancias: { 
              type: 'array',
              items: { type: 'object' }
            },
            validacoes: { 
              type: 'array',
              items: { type: 'object' }
            },
            riscos: { 
              type: 'array',
              items: { type: 'object' }
            },
            conclusao: { type: 'string' }
          }
        }
      });

      // Contar discrepâncias por severidade
      const discrepancias = analise.discrepancias || [];
      const totalDiscrepancias = discrepancias.length;
      const criticas = discrepancias.filter(d => d.severidade === 'critica').length;
      const medias = discrepancias.filter(d => d.severidade === 'media').length;
      const leves = discrepancias.filter(d => d.severidade === 'leve').length;

      const resultadoAnalise = {
        resumo: analise.resumo,
        discrepancias: discrepancias,
        validacoes: analise.validacoes || [],
        riscos: analise.riscos || [],
        conclusao: analise.conclusao,
        totalDiscrepancias,
        criticas,
        medias,
        leves
      };

      setResultado(resultadoAnalise);

      // Salvar no histórico
      const statusResultado = totalDiscrepancias === 0 ? 'sem_discrepancias' : 'com_discrepancias';
      
      salvarHistoricoMutation.mutate({
        caso_id: casoId,
        tipo_analise: 'analise_customizada',
        documento_tipo: 'múltiplos documentos',
        documento_nome: `Análise de ${documentos.length} documentos`,
        usuario_email: user.email,
        data_hora_analise: new Date().toISOString(),
        total_discrepancias: totalDiscrepancias,
        discrepancias_criticas: criticas,
        discrepancias_medias: medias,
        discrepancias_leves: leves,
        status_resultado: statusResultado,
        dados_completos: resultadoAnalise,
        observacoes: analise.resumo
      });
    } catch (error) {
      console.error('Erro na análise:', error);
      alert('Erro ao realizar análise. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600 font-medium">Analisando documentos com IA...</p>
        <p className="text-sm text-slate-500 mt-1">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  if (resultado) {
    return (
      <div className="space-y-4">
        {/* Resumo */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-700 leading-relaxed">{resultado.resumo}</p>
          </CardContent>
        </Card>

        {/* Status geral */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{resultado.totalDiscrepancias}</p>
              <p className="text-xs text-slate-600 mt-1">Total</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{resultado.criticas}</p>
              <p className="text-xs text-red-600 mt-1">Críticas</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-yellow-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{resultado.medias}</p>
              <p className="text-xs text-yellow-600 mt-1">Médias</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{resultado.leves}</p>
              <p className="text-xs text-blue-600 mt-1">Leves</p>
            </CardContent>
          </Card>
        </div>

        {/* Discrepâncias */}
        {resultado.discrepancias.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Discrepâncias Encontradas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resultado.discrepancias.map((disc, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${severidadeColors[disc.severidade]}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{disc.tipo}</p>
                      <p className="text-xs mt-1 opacity-90">{disc.descricao}</p>
                      {disc.documentos_envolvidos?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {disc.documentos_envolvidos.map((doc, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {doc}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Validações */}
        {resultado.validacoes.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Validações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resultado.validacoes.map((val, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 flex items-start gap-3">
                  {val.status === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />}
                  {val.status === 'alerta' && <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />}
                  {val.status === 'erro' && <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-sm font-medium text-slate-900">{val.descricao}</p>
                    <p className="text-xs text-slate-600 mt-1">{val.detalhes}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Conclusão */}
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-700 font-medium mb-2">Conclusão</p>
            <p className="text-sm text-slate-600 leading-relaxed">{resultado.conclusao}</p>
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={() => {
              setResultado(null);
              analisarDocumentos();
            }}
            variant="outline"
          >
            Analisar Novamente
          </Button>
          <Button 
            onClick={() => setDetalhesModal(true)}
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes Completos
          </Button>
        </div>

        {/* Modal de detalhes */}
        <Dialog open={detalhesModal} onOpenChange={setDetalhesModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes Completos da Análise</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <pre className="bg-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">
        <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7 text-blue-600" />
        </div>
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">Análise Automática de Documentos</h3>
      <p className="text-sm text-slate-600 mb-6 max-w-sm">
        Utilize IA para comparar e analisar todos os documentos do caso, identificando automaticamente discrepâncias e validações.
      </p>
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 mb-6 max-w-sm">
        {documentos.length} documento{documentos.length !== 1 ? 's' : ''} disponível{documentos.length !== 1 ? 's' : ''}
      </div>
      <Button 
        onClick={analisarDocumentos}
        disabled={!podeAnalisar}
        className="bg-blue-600 hover:bg-blue-700"
      >
        Iniciar Análise
      </Button>
      {!podeAnalisar && (
        <div className="text-xs text-red-600 mt-3 space-y-1">
          {temItemsPendentes && <p>⚠️ Todos os itens do checklist devem estar aprovados ou N/A</p>}
          {documentos.length < 1 && <p>⚠️ Mínimo 1 documento necessário</p>}
        </div>
      )}
    </div>
  );
}