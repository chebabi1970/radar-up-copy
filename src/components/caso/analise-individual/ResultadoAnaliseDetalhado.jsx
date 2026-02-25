import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  Sparkles,
  RefreshCw
} from 'lucide-react';

function ScoreRing({ score }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getColor = () => {
    if (score >= 70) return { stroke: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (score >= 40) return { stroke: '#f59e0b', text: 'text-amber-600', bg: 'bg-amber-50' };
    return { stroke: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' };
  };

  const color = getColor();

  return (
    <div className={`relative flex items-center justify-center w-24 h-24 rounded-2xl ${color.bg}`}>
      <svg width="80" height="80" className="transform -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={radius} fill="none"
          stroke={color.stroke} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xl font-bold ${color.text}`}>{score}</span>
      </div>
    </div>
  );
}

const severidadeConfig = {
  critico: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Critico' },
  alto: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Alto' },
  medio: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Medio' },
  baixo: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Baixo' },
  info: { icon: Info, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Info' }
};

export default function ResultadoAnaliseDetalhado({ resultadoLocal, resultadoLLM, documento, onReanalizar, onAnalisarIA, analisando }) {
  const temResultadoLocal = resultadoLocal && resultadoLocal.score !== undefined;
  const temResultadoLLM = resultadoLLM && resultadoLLM.resumo;

  if (!temResultadoLocal && !temResultadoLLM) {
    return (
      <Card className="rounded-2xl border-slate-100">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 mx-auto mb-3">
            <Sparkles className="h-7 w-7 text-indigo-400" />
          </div>
          <p className="font-medium text-slate-700">Análise não realizada</p>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Execute a análise para verificar a conformidade deste documento.
          </p>
          <div className="flex items-center justify-center gap-2">
            {onAnalisarIA && (
              <Button
                onClick={onAnalisarIA}
                disabled={analisando}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl"
              >
                {analisando ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Analisar com IA</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-slate-100">
      <CardContent className="p-5 space-y-5">
        {/* Header with Score */}
        <div className="flex items-start gap-4">
          {temResultadoLocal && <ScoreRing score={resultadoLocal.score} />}
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-900">Resultado da Análise</h4>
            {temResultadoLLM && (
              <p className="text-sm text-slate-600 mt-1">{resultadoLLM.resumo}</p>
            )}
            {temResultadoLocal && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${
                  resultadoLocal.valido ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'
                }`}>
                  {resultadoLocal.valido ? 'Valido' : 'Invalido'}
                </Badge>
                {resultadoLocal.problemas?.length > 0 && (
                  <Badge variant="outline" className="text-xs border-red-200 text-red-700">
                    {resultadoLocal.problemas.length} problema(s)
                  </Badge>
                )}
                {resultadoLocal.alertas?.length > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-200 text-amber-700">
                    {resultadoLocal.alertas.length} alerta(s)
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            {onAnalisarIA && (
              <Button
                onClick={onAnalisarIA}
                disabled={analisando}
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs"
              >
                {analisando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              </Button>
            )}
            {onReanalizar && (
              <Button onClick={onReanalizar} disabled={analisando} variant="outline" size="sm" className="rounded-lg">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* LLM Checklist */}
        {temResultadoLLM && resultadoLLM.checklist_verificacao?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Checklist de Verificação</h5>
            <div className="space-y-1.5">
              {resultadoLLM.checklist_verificacao.map((item, idx) => {
                const isOk = item.status === 'OK';
                const isCritico = item.status === 'CRÍTICO' || item.status === 'CRITICO';
                return (
                  <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-xl ${
                    isOk ? 'bg-emerald-50/60' : isCritico ? 'bg-red-50/60' : 'bg-amber-50/60'
                  }`}>
                    {isOk ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : isCritico ? (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800">{item.item}</p>
                      {item.observacao && <p className="text-[10px] text-slate-500 mt-0.5">{item.observacao}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Problems */}
        {temResultadoLocal && resultadoLocal.problemas?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Problemas Detectados</h5>
            <div className="space-y-1.5">
              {resultadoLocal.problemas.map((problema, idx) => {
                const config = severidadeConfig[problema.severidade] || severidadeConfig.info;
                const Icon = config.icon;
                return (
                  <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-xl ${config.bg} border ${config.border}`}>
                    <Icon className={`h-4 w-4 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800">{problema.mensagem}</p>
                      {problema.sugestao && <p className="text-[10px] text-slate-500 mt-0.5">{problema.sugestao}</p>}
                    </div>
                    <Badge variant="outline" className={`text-[9px] ${config.border} ${config.color}`}>{config.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Alerts */}
        {temResultadoLocal && resultadoLocal.alertas?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Alertas</h5>
            <div className="space-y-1.5">
              {resultadoLocal.alertas.map((alerta, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700">{alerta.mensagem}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LLM Alerts */}
        {temResultadoLLM && resultadoLLM.indicadores_alerta?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Indicadores de Alerta (IA)</h5>
            <div className="space-y-1.5">
              {resultadoLLM.indicadores_alerta.map((alerta, idx) => {
                const isCritica = alerta.severidade === 'critica';
                return (
                  <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-xl ${isCritica ? 'bg-red-50/60 border border-red-100' : 'bg-amber-50/60 border border-amber-100'}`}>
                    {isCritica ? (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-slate-800">{alerta.tipo}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{alerta.descricao}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info */}
        {temResultadoLocal && resultadoLocal.informacoes?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Informações</h5>
            <div className="space-y-1">
              {resultadoLocal.informacoes.map((info, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <p className="text-xs text-slate-600">{info.mensagem}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
