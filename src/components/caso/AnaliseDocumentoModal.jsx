import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, X, Lightbulb } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisGuides, getGuide } from './analisisGuides';
import { validarCampo } from './validators/documentValidator';
import { crossDocumentRules, executarAnaliseCruzada } from './validators/crossDocumentAnalysis';
import { gerarSugestoesParaDiscrepancia, buildSuggestionsFromValidation } from './validators/suggestionsEngine';
import ListaDocumentosPaginada from './ListaDocumentosPaginada';
import VisualizadorDocumentoAvancado from './VisualizadorDocumentoAvancado';
import ResultadoAnaliseResumido from './ResultadoAnaliseResumido';

export default function AnaliseDocumentoModal({ item, documentos, casoId, cliente, onClose }) {
  const [analisando, setAnalisando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [docSelecionado, setDocSelecionado] = useState(item);
  const [docVisualizar, setDocVisualizar] = useState(null);
  const queryClient = useQueryClient();

  const linkedDoc = documentos.find(d => d.tipo_documento === docSelecionado.tipo_documento);

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
      const balancetes = documentos.filter(d => d.tipo_documento?.includes('balancete')).slice(0, 2);
      const extratos = documentos.filter(d => d.tipo_documento?.includes('extrato')).slice(0, 3);

      if (balancetes.length === 0 || extratos.length === 0) {
        const msg = `Documentos necessários não encontrados. Balancetes: ${balancetes.length}, Extratos: ${extratos.length}`;
        setResultados({
          erro: true,
          mensagem: msg
        });
        setAnalisando(false);
        return;
      }

      // Extrair dados dos balancetes - PROMPT OTIMIZADO
      const promptBalancete = `Extraia RÁPIDO caixa/bancos do balancete.

Procure: Caixa, Bancos (todos), Aplicações
Retorne EM JSON APENAS:
{
  "data_balancete": "YYYY-MM-DD",
  "total_caixa": 0,
  "saldos_caixa": {"Banco X": valor},
  "observacoes": ""
}`;

      // Obter URLs assinadas para balancetes
      const balanceteUrls = await Promise.all(balancetes.map(async (b) => {
        try {
          if (b.file_url) return b.file_url;
          if (b.file_uri) {
            const signedResult = await base44.integrations.Core.CreateFileSignedUrl({
              file_uri: b.file_uri,
              expires_in: 3600
            });
            return signedResult.signed_url;
          }
          console.warn('Balancete sem URL:', b.nome_arquivo);
          return null;
        } catch (err) {
          console.error('Erro ao obter URL balancete:', err);
          return null;
        }
      }));

      console.log('URLs de balancetes obtidas:', balanceteUrls.filter(u => u).length);

      const validUrls = balanceteUrls.filter(url => url);
      if (validUrls.length === 0) {
        throw new Error('Nenhuma URL de balancete disponível para análise');
      }

      console.log('Iniciando análise de balancete com URLs:', validUrls.length);
      const dadosBalancete = await base44.integrations.Core.InvokeLLM({
        prompt: promptBalancete,
        file_urls: validUrls,
        response_json_schema: {
          type: 'object',
          properties: {
            data_balancete: { type: 'string' },
            periodo_referencia: { type: 'string' },
            saldos_caixa: { type: 'object' },
            total_caixa: { type: 'number' },
            contas_detalhadas: { type: 'object' },
            observacoes: { type: 'string' }
          }
        }
      });
      console.log('Análise de balancete concluída:', dadosBalancete);

      // Extrair dados dos extratos - PROMPT OTIMIZADO
      const promptExtratos = `Extraia RÁPIDO saldos finais dos extratos.

Para cada mês: banco, conta, saldo_final, data
RETORNE EM JSON APENAS:
{
  "extratos": [{"banco": "", "conta": "", "mes_ano": "", "saldo_final": 0, "saldo_data": ""}],
  "total_extratos": 0,
  "alertas": []
}`;

      // Obter URLs assinadas para extratos
      const extratosUrls = await Promise.all(extratos.map(async (e) => {
        try {
          if (e.file_url) return e.file_url;
          if (e.file_uri) {
            const signedResult = await base44.integrations.Core.CreateFileSignedUrl({
              file_uri: e.file_uri,
              expires_in: 3600
            });
            return signedResult.signed_url;
          }
          console.warn('Extrato sem URL:', e.nome_arquivo);
          return null;
        } catch (err) {
          console.error('Erro ao obter URL extrato:', err);
          return null;
        }
      }));

      console.log('URLs de extratos obtidas:', extratosUrls.filter(u => u).length);

      const validExtratosUrls = extratosUrls.filter(url => url);
      if (validExtratosUrls.length === 0) {
        throw new Error('Nenhuma URL de extrato disponível para análise');
      }

      console.log('Iniciando análise de extratos com URLs:', validExtratosUrls.length);
      const dadosExtratos = await base44.integrations.Core.InvokeLLM({
        prompt: promptExtratos,
        file_urls: validExtratosUrls,
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
                  saldo_data: { type: 'string' },
                  tipo_conta: { type: 'string' }
                }
              }
            },
            total_extratos: { type: 'number' },
            datas_cobertas: { type: 'string' },
            alertas: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      console.log('Análise de extratos concluída:', dadosExtratos);

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
    setResultados(null); // Reset results
    try {
      const linkedDocs = documentos.filter(d => d.tipo_documento === docSelecionado.tipo_documento);
      
      if (linkedDocs.length === 0) {
        setResultados({
          erro: true,
          mensagem: 'Nenhum documento vinculado encontrado.'
        });
        setAnalisando(false);
        return;
      }

      const tipoDoc = docSelecionado.tipo_documento;
      const guide = getGuide(tipoDoc);

      // Construir prompt OTIMIZADO E CONCISO
      const prompt = guide 
        ? `Analise RÁPIDO este documento RFB: ${guide.nome}

REGRAS: ${guide.regras.slice(0, 3).join(' | ')}
CRÍTICOS: ${guide.checklist.filter(c => c.critico).map(c => c.item).join(' | ')}

EMPRESA: ${cliente?.razao_social || 'N/A'} | CNPJ: ${cliente?.cnpj || 'N/A'}

RESPONDA EM JSON APENAS:
{
  "dados_extraidos": {},
  "checklist_verificacao": [{"item": "", "status": "OK|ALERTA|CRÍTICO", "observacao": ""}],
  "indicadores_alerta": [{"tipo": "", "severidade": "critica|media|leve", "descricao": ""}],
  "resumo": "análise breve",
  "classificacao_final": "APROVADO|INCONSISTENTE"
}`
        : `Analise rapidamente documento: ${tipoDoc}

1. Dados principais
2. Período de referência
3. Legibilidade
4. Alertas críticos
5. Aprovável?

RESPONDA EM JSON:
{
  "dados_extraidos": {},
  "checklist_verificacao": [{"item": "", "status": "OK|ALERTA|CRÍTICO"}],
  "indicadores_alerta": [{"tipo": "", "severidade": "critica|media|leve", "descricao": ""}],
  "resumo": "breve",
  "classificacao_final": "APROVADO|INCONSISTENTE"
}`;

      // Array de arquivos - pode ter múltiplos do mesmo tipo
      const fileUrls = [];
      
      for (const doc of linkedDocs.slice(0, 3)) { // Limite de 3 docs
        try {
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
        } catch (err) {
          console.warn('Erro ao obter URL do documento:', err);
        }
      }

      if (fileUrls.length === 0) {
        throw new Error('Nenhuma URL de documento disponível');
      }

      console.log('Iniciando análise LLM com', fileUrls.length, 'arquivos...');
      
      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls,
        response_json_schema: {
          type: 'object',
          properties: {
            dados_extraidos: { type: 'object' },
            checklist_verificacao: { type: 'array' },
            indicadores_alerta: { type: 'array' },
            resumo: { type: 'string' },
            classificacao_final: { type: 'string' }
          }
        }
      });

      console.log('Análise LLM concluída:', resultado);

      setResultados({
        erro: false,
        dados: resultado
      });
    } catch (error) {
      console.error('Erro na análise:', error);
      setResultados({
        erro: true,
        mensagem: error.message || 'Erro ao analisar documento. Verifique se o PDF está legível.'
      });
    } finally {
      setAnalisando(false);
    }
  };

  const isBalancete = docSelecionado.tipo_documento?.includes('balancete');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto rounded-xl sm:rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-xl truncate pr-2">Analisar {item.descricao}</CardTitle>
          <button
            onClick={onClose}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>

        <CardContent className="pt-3 sm:pt-6 space-y-3 sm:space-y-4 px-3 sm:px-6">
          {!resultados ? (
            <>
              {/* Lista de documentos com filtro */}
              <ListaDocumentosPaginada
                documentos={documentos}
                onSelectDoc={(doc) => {
                  setDocSelecionado(doc);
                  setResultados(null);
                }}
                onViewDoc={(doc) => setDocVisualizar(doc)}
              />

              <div className="border-t pt-3 sm:pt-4">
                <p className="font-semibold text-slate-900 mb-2 sm:mb-3 text-sm sm:text-base">Doc selecionado:</p>
                <div className="p-2.5 sm:p-3 bg-blue-50 rounded-lg border border-blue-200 mb-2.5 sm:mb-3">
                  <p className="text-xs sm:text-sm font-medium text-blue-900 truncate">{docSelecionado?.nome_arquivo}</p>
                  <p className="text-xs text-blue-700 mt-1">{docSelecionado?.tipo_documento?.replace(/_/g, ' ')}</p>
                </div>

                {isBalancete && (
                  <>
                    <div className="p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs sm:text-sm text-blue-800 mb-2.5 sm:mb-3">
                      <p className="font-semibold mb-1">Análise Automática:</p>
                      <p className="leading-tight">Serão comparados os saldos de caixa/bancos do balancete com os extratos bancários.</p>
                    </div>

                    <Button
                      onClick={analisarBalanceteVsExtrato}
                      disabled={analisando}
                      className="w-full bg-blue-600 hover:bg-blue-700 h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      {analisando ? (
                        <>
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        'Iniciar Análise'
                      )}
                    </Button>
                  </>
                )}

                {!isBalancete && (
                  <>
                    <div className="p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs sm:text-sm text-blue-800 mb-2.5 sm:mb-3">
                      <p className="font-semibold mb-1">Análise Automática:</p>
                      <p className="leading-tight">Serão extraídas informações do documento.</p>
                    </div>

                    <Button
                      onClick={analisarDocumentoSimples}
                      disabled={analisando}
                      className="w-full bg-blue-600 hover:bg-blue-700 h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      {analisando ? (
                        <>
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        'Iniciar Análise'
                      )}
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : resultados.erro ? (
           <div className="p-2.5 sm:p-4 bg-red-50 border border-red-200 rounded-lg space-y-2 sm:space-y-3">
             <div className="flex items-start gap-2 sm:gap-3">
               <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0 mt-0.5" />
               <p className="text-xs sm:text-sm text-red-800">{resultados.mensagem}</p>
             </div>
             <Button
               variant="outline"
               onClick={() => setResultados(null)}
               className="w-full h-8 sm:h-9 text-xs sm:text-sm"
             >
               Tentar Novamente
             </Button>
           </div>
          ) : !isBalancete && resultados.dados ? (
          <div className="space-y-4">
            {/* Resumo Visual Simplificado */}
            <ResultadoAnaliseResumido resultado={resultados.dados} />



            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => setResultados(null)}
                variant="outline"
                className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
              >
                Nova
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
                className="flex-1 bg-green-600 hover:bg-green-700 h-8 sm:h-9 text-xs sm:text-sm"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">Salvando...</span>
                    <span className="sm:hidden">Salv...</span>
                  </>
                ) : (
                  <span>Salvar</span>
                )}
              </Button>
            </div>
          </div>
          ) : (
           <div className="space-y-4">
              {/* Resumo */}
              <div className="p-2.5 sm:p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">Resumo</h4>
                <div className="text-xs sm:text-sm space-y-0.5 sm:space-y-1 text-slate-600">
                  <p><strong>Saldo:</strong> R$ {(resultados.balancete?.total_caixa || 0).toLocaleString('pt-BR')}</p>
                  <p><strong>Contas:</strong> {Object.keys(resultados.balancete?.saldos_caixa || {}).length}</p>
                  <p><strong>Período:</strong> {resultados.balancete?.data_balancete}</p>
                </div>
              </div>

              {/* Discrepâncias */}
              {resultados.discrepancias?.length > 0 ? (
                <div className="space-y-2 sm:space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                    <h4 className="font-semibold text-slate-900 text-sm sm:text-base">
                      {resultados.discrepancias.length} Discrepância(s)
                    </h4>
                  </div>
                  {resultados.discrepancias.map((disc, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 sm:p-3 rounded-lg border ${
                        disc.severidade === 'critica'
                          ? 'bg-red-50 border-red-200'
                          : disc.severidade === 'media'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs sm:text-sm flex-1">
                          <p className="font-semibold text-slate-900">{disc.banco}</p>
                          <p className="text-xs text-slate-600">Conta: {disc.conta}</p>
                          <p className="text-xs text-slate-600">Per: {disc.periodo}</p>
                          <div className="mt-1.5 space-y-0.5 text-xs">
                            <p>Bal: <strong>R$ {disc.saldo_balancete.toLocaleString('pt-BR')}</strong></p>
                            <p>Extr: <strong>R$ {disc.saldo_extrato.toLocaleString('pt-BR')}</strong></p>
                            <p className="text-red-600">Dif: <strong>R$ {disc.diferenca.toLocaleString('pt-BR')}</strong></p>
                          </div>
                        </div>
                        <Badge
                          className={`text-xs sm:text-xs flex-shrink-0 ${
                            disc.severidade === 'critica'
                              ? 'bg-red-100 text-red-800'
                              : disc.severidade === 'media'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {disc.severidade.substring(0, 3)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800 text-sm sm:text-base">Sem Discrepâncias</p>
                    <p className="text-xs sm:text-sm text-green-700">Saldos consistentes.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 sm:gap-3">
                <Button
                  onClick={() => setResultados(null)}
                  className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                  variant="outline"
                >
                  Nova
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
                  className="flex-1 bg-green-600 hover:bg-green-700 h-8 sm:h-9 text-xs sm:text-sm"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                      <span className="hidden sm:inline">Salvando...</span>
                      <span className="sm:hidden">Salv...</span>
                    </>
                  ) : (
                    <span>Salvar</span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visualizador de Documentos */}
      {docVisualizar && (docVisualizar.file_url || docVisualizar.file_uri) && (
        <VisualizadorDocumentoAvancado
          fileUrl={docVisualizar.file_url}
          fileUri={docVisualizar.file_uri}
          fileName={docVisualizar.nome_arquivo}
          onClose={() => setDocVisualizar(null)}
        />
      )}
    </div>
  );
}