import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tipoAnaliseLabels = {
  balancete_vs_extrato: 'Balancete vs Extrato',
  validacao_documento: 'Validação de Documento',
  analise_customizada: 'Análise Customizada'
};

const statusResultadoLabels = {
  sem_discrepancias: 'Sem Discrepâncias',
  com_discrepancias: 'Com Discrepâncias',
  erro: 'Erro'
};

const statusColors = {
  sem_discrepancias: 'bg-green-100 text-green-800 border-green-200',
  com_discrepancias: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  erro: 'bg-red-100 text-red-800 border-red-200'
};

export default function HistoricoTab({ casoId }) {
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['historico', casoId],
    queryFn: () => base44.entities.AnaliseHistorico.filter(
      { caso_id: casoId },
      '-created_date'
    )
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Carregando histórico...
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
        <p>Nenhuma análise registrada ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">
          Histórico de Análises
        </h3>
        <Badge variant="outline" className="text-xs">
          {historico.length} análise{historico.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {historico.map((item) => (
        <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">
                      {tipoAnaliseLabels[item.tipo_analise]}
                    </h4>
                    <Badge className={`${statusColors[item.status_resultado]} border`}>
                      {statusResultadoLabels[item.status_resultado]}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {item.documento_nome}
                  </p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2 bg-slate-50 rounded text-xs">
                  <p className="text-slate-500 mb-0.5">Data/Hora</p>
                  <p className="font-semibold text-slate-900">
                    {format(new Date(item.data_hora_analise), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded text-xs">
                  <p className="text-slate-500 mb-0.5">Usuário</p>
                  <p className="font-semibold text-slate-900 truncate" title={item.usuario_email}>
                    {item.usuario_email?.split('@')[0]}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded text-xs">
                  <p className="text-slate-500 mb-0.5">Total</p>
                  <p className="font-semibold text-slate-900">
                    {item.total_discrepancias} discrepância(s)
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded text-xs">
                  <p className="text-slate-500 mb-0.5">Criadas</p>
                  <p className="font-semibold text-slate-900">
                    {format(new Date(item.created_date), 'dd/MM/yy', { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Discrepâncias Summary */}
              {item.total_discrepancias > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-red-600 font-semibold">{item.discrepancias_criticas}</p>
                      <p className="text-slate-600">Críticas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-yellow-600 font-semibold">{item.discrepancias_medias}</p>
                      <p className="text-slate-600">Médias</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-600 font-semibold">{item.discrepancias_leves}</p>
                      <p className="text-slate-600">Leves</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Observações */}
              {item.observacoes && (
                <div className="p-2 bg-blue-50 rounded text-sm text-blue-800 border border-blue-100">
                  {item.observacoes}
                </div>
              )}

              {/* Status Message */}
              {item.status_resultado === 'com_discrepancias' && item.total_discrepancias > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    <p className="font-semibold mb-0.5">Ação Recomendada</p>
                    <p>Revisar as discrepâncias encontradas e tomar as medidas necessárias.</p>
                  </div>
                </div>
              )}

              {item.status_resultado === 'sem_discrepancias' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-green-800">
                    <p className="font-semibold">Análise Aprovada</p>
                    <p>Não foram encontradas discrepâncias nesta análise.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}