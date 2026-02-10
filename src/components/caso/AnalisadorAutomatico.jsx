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
        .slice(0, 6) // Reduzir para 6 documentos
        .map(d => ({
          tipo: d.tipo_documento,
          nome: d.nome_arquivo,
          url: d.file_url || d.file_uri,
          data: d.data_documento,
          status_analise: d.status_analise
        }));

      // Buscar dados do cliente e caso completo
      const [casos, cliente] = await Promise.all([
        base44.entities.Caso.list({ id: casoId }),
        base44.entities.Cliente.list()
      ]);
      
      const caso = casos.length > 0 ? casos[0] : null;
      const clienteData = caso ? cliente.find(c => c.id === caso.cliente_id) : null;

      // Preparar URLs dos documentos para análise visual pela IA - MÁXIMO 3
      const documentoUrls = dadosDocumentos
        .filter(d => d.url && !d.url.includes('gs://'))
        .slice(0, 3) // Reduzir para 3 para análise visual
        .map(d => d.url);

      // Preparar contexto do checklist - APENAS FALTANTES CRÍTICOS
      const checklistContext = checklistItems
        .filter(item => item.status !== 'aprovado')
        .slice(0, 8)
        .map(item => ({
          tipo: item.tipo_documento,
          status: item.status,
          obrigatorio: item.obrigatorio
        }));

      // Prompt OTIMIZADO - muito mais conciso
      const analise = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise rapidamente estes documentos de processo RFB. SEJA CONCISO.

CASO: ${caso?.numero_caso || 'N/A'} | ${clienteData?.razao_social || 'N/A'} (CNPJ: ${clienteData?.cnpj || 'N/A'})

DOCUMENTOS (${dadosDocumentos.length}): ${dadosDocumentos.map(d => d.tipo).join(', ')}

CHECKLIST PENDENTE: ${checklistContext.map(c => c.tipo).join(', ') || 'Nenhum'}

ANALISE RÁPIDA:
1. Documentos obrigatórios faltando?
2. Saldos batem entre balancete e extratos?
3. Inconsistências de valores/datas?
4. Riscos críticos?
5. Aprovável para protocolo?

RESPONDA EM JSON:
{
  "resumo": "1-2 linhas dos principais achados",
  "documentos_faltantes": [{"tipo": "", "criticidade": ""}],
  "discrepancias": [{"tipo": "", "severidade": "", "descricao": ""}],
  "riscos": [{"descricao": "", "impacto": "alto|medio|baixo"}],
  "proximosPasso": "1-2 ações prioritárias",
  "probabilidade_aprovacao": "baixa|media|alta",
  "conclusao": "Aprovável ou pendências?"
}`,
        file_urls: documentoUrls.length > 0 ? documentoUrls : undefined,
        response_json_schema: {
          type: 'object',
          properties: {
            resumo: { type: 'string' },
            documentos_faltantes: { type: 'array', items: { type: 'object' } },
            discrepancias: { type: 'array', items: { type: 'object' } },
            riscos: { type: 'array', items: { type: 'object' } },
            proximosPasso: { type: 'string' },
            probabilidade_aprovacao: { type: 'string' },
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
        documentos_faltantes: analise.documentos_faltantes || [],
        informacoes_extraidas: [],
        discrepancias: discrepancias,
        validacoes: [],
        riscos: analise.riscos || [],
        proximos_passos: analise.proximosPasso ? [{ acao: analise.proximosPasso, prioridade: 'alta' }] : [],
        probabilidade_aprovacao: analise.probabilidade_aprovacao,
        justificativa_probabilidade: '',
        conclusao: analise.conclusao || 'Análise concluída',
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
    const probabilidadeColors = {
      baixa: 'text-red-600 bg-red-50',
      media: 'text-yellow-600 bg-yellow-50',
      alta: 'text-green-600 bg-green-50'
    };

    return (
      <div className="space-y-4">
        {/* Resumo e Probabilidade */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 lg:col-span-2">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Resumo Executivo</p>
              <p className="text-sm text-slate-700 leading-relaxed">{resultado.resumo}</p>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm ${probabilidadeColors[resultado.probabilidade_aprovacao] || 'bg-slate-50'}`}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase mb-1">Probabilidade de Aprovação</p>
              <p className="text-2xl font-bold mb-2 capitalize">{resultado.probabilidade_aprovacao}</p>
              <p className="text-xs opacity-80 leading-relaxed">{resultado.justificativa_probabilidade}</p>
            </CardContent>
          </Card>
        </div>

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

        {/* Documentos Faltantes */}
        {resultado.documentos_faltantes?.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Documentos Obrigatórios Faltantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resultado.documentos_faltantes.map((doc, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-orange-200 bg-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-orange-900">{doc.tipo}</p>
                      <p className="text-xs mt-1 text-orange-700">{doc.motivo}</p>
                      <Badge className="mt-2 text-xs" variant={doc.criticidade === 'critica' ? 'destructive' : 'outline'}>
                        {doc.criticidade}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Informações Extraídas */}
        {resultado.informacoes_extraidas?.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados Extraídos dos Documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {resultado.informacoes_extraidas.map((info, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <p className="font-medium text-sm text-slate-900 mb-2">{info.documento}</p>
                  <div className="text-xs text-slate-600 space-y-1">
                    {Object.entries(info.dados_chave || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-slate-700">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
                      {(disc.valor_encontrado || disc.valor_esperado) && (
                        <div className="mt-2 text-xs space-y-1">
                          {disc.valor_encontrado && <p><span className="font-semibold">Encontrado:</span> {disc.valor_encontrado}</p>}
                          {disc.valor_esperado && <p><span className="font-semibold">Esperado:</span> {disc.valor_esperado}</p>}
                        </div>
                      )}
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

        {/* Riscos */}
        {resultado.riscos?.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Riscos Identificados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resultado.riscos.map((risco, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-red-200 bg-red-50">
                  <div className="flex items-start gap-2">
                    <Badge variant="destructive" className="text-xs mt-0.5">
                      {risco.impacto}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-red-900">{risco.descricao}</p>
                      {risco.fundamento_legal && (
                        <p className="text-xs text-red-700 mt-1">
                          <span className="font-semibold">Base Legal:</span> {risco.fundamento_legal}
                        </p>
                      )}
                      {risco.probabilidade_problema && (
                        <p className="text-xs text-red-600 mt-1">
                          Probabilidade: {risco.probabilidade_problema}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Próximos Passos */}
        {resultado.proximos_passos?.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Próximos Passos Recomendados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resultado.proximos_passos.map((passo, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-2">
                    <Badge className="text-xs mt-0.5 bg-blue-600">
                      {passo.prioridade}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-blue-900">{passo.acao}</p>
                      <p className="text-xs text-blue-700 mt-1">{passo.justificativa}</p>
                      {passo.prazo_sugerido && (
                        <p className="text-xs text-blue-600 mt-1">
                          <span className="font-semibold">Prazo:</span> {passo.prazo_sugerido}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Conclusão */}
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-700 font-medium mb-2">Conclusão e Recomendações Estratégicas</p>
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