import React from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ResultadoAnaliseResumido({ resultado }) {
  if (!resultado) return null;

  const getStatusGeral = () => {
    if (resultado.indicadores_alerta?.some(a => a.severidade === 'critica')) {
      return { tipo: 'critica', label: '🔴 CRÍTICO', cor: 'bg-red-50 border-red-300' };
    }
    if (resultado.indicadores_alerta?.some(a => a.severidade === 'media')) {
      return { tipo: 'media', label: '🟡 ATENÇÃO', cor: 'bg-yellow-50 border-yellow-300' };
    }
    return { tipo: 'ok', label: '🟢 APROVADO', cor: 'bg-green-50 border-green-300' };
  };

  const statusGeral = getStatusGeral();
  const criticas = resultado.indicadores_alerta?.filter(a => a.severidade === 'critica').length || 0;
  const medias = resultado.indicadores_alerta?.filter(a => a.severidade === 'media').length || 0;
  const leves = resultado.indicadores_alerta?.filter(a => a.severidade === 'leve').length || 0;

  // Contar itens do checklist que passaram/falharam
  const checklistItens = resultado.checklist_verificacao || [];
  const passaram = checklistItens.filter(c => c.status === 'OK').length;
  const falharam = checklistItens.filter(c => c.status === 'CRÍTICO' || c.status === 'ALERTA').length;

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Semáforo Principal */}
      <div className={`p-3 sm:p-4 rounded-lg border-2 ${statusGeral.cor}`}>
         <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
           <div className="flex-1 min-w-0">
             <h3 className="text-base sm:text-lg font-bold text-slate-900">{statusGeral.label}</h3>
             <p className="text-xs sm:text-sm text-slate-600 mt-1">{resultado.resumo}</p>
           </div>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            {criticas > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-2xl">🔴</span>
                <span className="text-xs sm:text-sm font-semibold text-red-600">{criticas}</span>
              </div>
            )}
            {medias > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-2xl">🟡</span>
                <span className="text-xs sm:text-sm font-semibold text-yellow-600">{medias}</span>
              </div>
            )}
            {leves > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-2xl">🟠</span>
                <span className="text-xs sm:text-sm font-semibold text-blue-600">{leves}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Principais Informações */}
      {resultado.dados_extraidos && Object.keys(resultado.dados_extraidos).length > 0 && (
        <div className="p-2.5 sm:p-3 bg-slate-50 rounded-lg">
          <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">Dados</h4>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
            {Object.entries(resultado.dados_extraidos).slice(0, 4).map(([key, value]) => (
              <div key={key} className="text-xs min-w-0">
                <p className="text-slate-600 truncate">{key.replace(/_/g, ' ')}</p>
                <p className="font-semibold text-slate-900 truncate text-xs">
                  {typeof value === 'object' ? JSON.stringify(value).substring(0, 20) + '...' : String(value).substring(0, 20)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas Críticos */}
      {resultado.indicadores_alerta?.filter(a => a.severidade === 'critica').slice(0, 3).map((alerta, idx) => (
        <div key={idx} className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex gap-2">
            <span className="text-lg sm:text-xl flex-shrink-0">🔴</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs sm:text-sm text-red-900">{alerta.tipo}</p>
              <p className="text-xs text-red-700 mt-0.5 whitespace-normal">{alerta.descricao}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}