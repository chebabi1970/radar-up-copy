import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import ConformidadeChat from './ConformidadeChat';

const statusLabels = {
  nao_iniciado: 'Não Iniciado',
  em_validacao: 'Em Validação',
  apto: 'Apto',
  inapto: 'Inapto'
};

const statusColors = {
  nao_iniciado: 'bg-slate-100 text-slate-800',
  em_validacao: 'bg-blue-100 text-blue-800',
  apto: 'bg-green-100 text-green-800',
  inapto: 'bg-red-100 text-red-800'
};

const classificacaoLabels = {
  apto_protocolo: 'Apto para Protocolo',
  apto_ressalvas: 'Apto com Ressalvas',
  inapto: 'Inapto'
};

const classificacaoColors = {
  apto_protocolo: 'bg-green-100 text-green-800 border-green-200',
  apto_ressalvas: 'bg-amber-100 text-amber-800 border-amber-200',
  inapto: 'bg-red-100 text-red-800 border-red-200'
};

export default function ConformidadePanel({ casoId, cliente }) {
  const [showChat, setShowChat] = useState(false);
  const queryClient = useQueryClient();

  const { data: analise, isLoading } = useQuery({
    queryKey: ['analise-conformidade', casoId],
    queryFn: () => 
      base44.entities.AnaliseConformidade.filter({ caso_id: casoId })
        .then(res => res[0] || null),
    enabled: !!casoId
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
        <p className="text-slate-600">Carregando análise de conformidade...</p>
      </div>
    );
  }

  if (!analise) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="h-14 w-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-7 w-7 text-slate-500" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-2">Análise de Conformidade</h3>
        <p className="text-sm text-slate-600 mb-6 max-w-sm">
          Inicie uma análise completa do caso conforme IN RFB 1.984/2020 e Portaria Coana 72/2020 com nosso agent especializado.
        </p>
        <Button 
          onClick={() => setShowChat(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Iniciar Análise
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-2">Status Admissibilidade</p>
            <Badge className={statusColors[analise.status_admissibilidade]}>
              {statusLabels[analise.status_admissibilidade]}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-2">Versão</p>
            <p className="text-lg font-bold text-slate-900">v{analise.versao_analise}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-2">Última Atualização</p>
            <p className="text-sm text-slate-900">
              {new Date(analise.data_ultima_atualizacao).toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classificação Final */}
      {analise.classificacao_final && (
        <Card className={`border-2 ${classificacaoColors[analise.classificacao_final]}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Classificação Final</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-semibold text-lg">
              {classificacaoLabels[analise.classificacao_final]}
            </p>
            {analise.parecer_final && (
              <div className="text-sm bg-white/50 p-3 rounded border border-current/20">
                <p className="font-medium mb-1">Parecer Técnico:</p>
                <p className="text-slate-700 leading-relaxed">{analise.parecer_final}</p>
              </div>
            )}
            {analise.estrategia_recomendada && (
              <div className="text-sm bg-white/50 p-3 rounded border border-current/20">
                <p className="font-medium mb-1">Estratégia Recomendada:</p>
                <p className="text-slate-700 leading-relaxed">{analise.estrategia_recomendada}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inaptidão */}
      {analise.status_admissibilidade === 'inapto' && analise.motivo_inaptidao && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 mb-1">Requisitos de Admissibilidade Não Atendidos</p>
                <p className="text-sm text-red-800">{analise.motivo_inaptidao}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pendências */}
      {analise.pendencias?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pendências ({analise.pendencias.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analise.pendencias.map((pend) => (
              <div 
                key={pend.id} 
                className={`p-3 rounded-lg border ${
                  pend.tipo === 'critica' 
                    ? 'bg-red-50 border-red-200' 
                    : pend.tipo === 'sanavel'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {pend.tipo === 'critica' ? '⚠️ Crítica' : pend.tipo === 'sanavel' ? '⚡ Sanável' : 'ℹ️ Informativa'}
                    </span>
                    {pend.solucionada && (
                      <Badge className="bg-green-100 text-green-800 text-xs">Solucionada</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium mb-1">{pend.descricao}</p>
                {pend.norma_aplicavel && (
                  <p className="text-xs text-slate-600 mb-1">
                    <strong>Norma:</strong> {pend.norma_aplicavel}
                  </p>
                )}
                {pend.como_sanar && (
                  <p className="text-xs text-slate-700 bg-white/40 p-2 rounded">
                    <strong>Como sanar:</strong> {pend.como_sanar}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Riscos Fiscais */}
      {analise.riscos_fiscais?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Riscos Fiscais Identificados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analise.riscos_fiscais.map((risco, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border ${
                  risco.severidade === 'alta' 
                    ? 'bg-red-50 border-red-200' 
                    : risco.severidade === 'media'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="font-bold text-lg mt-0.5">
                    {risco.severidade === 'alta' ? '🔴' : risco.severidade === 'media' ? '🟡' : '🔵'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{risco.descricao}</p>
                    {risco.fundamento_normativo && (
                      <p className="text-xs text-slate-600 mt-1">
                        <strong>Fundamento:</strong> {risco.fundamento_normativo}
                      </p>
                    )}
                    {risco.impacto && (
                      <p className="text-xs text-slate-700 mt-1">
                        <strong>Impacto:</strong> {risco.impacto}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Botões */}
      <div className="flex gap-2 pt-4">
        <Button 
          onClick={() => setShowChat(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Continuar Análise
        </Button>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['analise-conformidade', casoId] })}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <ConformidadeChat 
          casoId={casoId} 
          onClose={() => setShowChat(false)}
          analiseExistente={analise}
        />
      )}
    </div>
  );
}