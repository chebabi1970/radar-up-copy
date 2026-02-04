import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function AnaliseDocumentoModal({ item, documentos, casoId, onClose }) {
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

      const dadosBalancete = await base44.integrations.Core.InvokeLLM({
        prompt: promptBalancete,
        file_urls: balancetes.map(b => b.file_url),
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

      const dadosExtratos = await base44.integrations.Core.InvokeLLM({
        prompt: promptExtratos,
        file_urls: extratos.map(e => e.file_url),
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