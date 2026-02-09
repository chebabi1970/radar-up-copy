import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, AlertTriangle, FileQuestion } from 'lucide-react';

export default function AnaliseIncrementalPanel({ documentos = [], historico = [] }) {
  // Agrupar documentos por tipo
  const docsAgrupados = documentos.reduce((acc, doc) => {
    const tipo = doc.tipo_documento;
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(doc);
    return acc;
  }, {});

  // Mapear status de análise para cada tipo de documento
  const getStatusDocumento = (tipoDoc) => {
    const analises = historico.filter(h => h.documento_tipo === tipoDoc);
    if (analises.length === 0) return 'pendente';
    
    const ultima = analises[analises.length - 1];
    if (ultima.status_resultado === 'sem_discrepancias') return 'aprovado';
    if (ultima.status_resultado === 'com_discrepancias') return 'inconsistente';
    return 'erro';
  };

  const statusConfig = {
    pendente: { icon: FileQuestion, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Pendente' },
    aprovado: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Aprovado' },
    inconsistente: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Inconsistente' },
    erro: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Erro' }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Análise Incremental de Documentos</CardTitle>
        <p className="text-sm text-slate-500 mt-1">Status de cada documento conforme análise</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(docsAgrupados).map(([tipoDoc, docs]) => {
            const status = getStatusDocumento(tipoDoc);
            const config = statusConfig[status];
            const Icon = config.icon;
            const analises = historico.filter(h => h.documento_tipo === tipoDoc);
            const ultimaAnalise = analises[analises.length - 1];

            return (
              <div key={tipoDoc} className={`p-4 rounded-lg border ${config.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <span className="font-semibold text-slate-900">
                        {tipoDoc.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <Badge className={
                        status === 'aprovado' ? 'bg-green-100 text-green-800' :
                        status === 'inconsistente' ? 'bg-yellow-100 text-yellow-800' :
                        status === 'pendente' ? 'bg-slate-100 text-slate-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {docs.length} documento(s) — {status === 'pendente' ? 'Aguardando análise' : 
                       status === 'aprovado' ? 'Sem inconsistências' :
                       status === 'inconsistente' ? `${ultimaAnalise?.total_discrepancias || 0} discrepância(s)` :
                       'Erro na análise'}
                    </p>
                  </div>
                </div>

                {ultimaAnalise && ultimaAnalise.total_discrepancias > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1 text-sm">
                    <p className="text-slate-600">
                      <strong>Críticas:</strong> {ultimaAnalise.discrepancias_criticas || 0} | 
                      <strong className="ml-2">Médias:</strong> {ultimaAnalise.discrepancias_medias || 0} | 
                      <strong className="ml-2">Leves:</strong> {ultimaAnalise.discrepancias_leves || 0}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {Object.keys(docsAgrupados).length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">
            Nenhum documento adicionado ainda
          </p>
        )}
      </CardContent>
    </Card>
  );
}