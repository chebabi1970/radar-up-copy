import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle, CheckCircle2, AlertTriangle, Loader2,
  Shield, ChevronDown, ChevronRight, RefreshCw, Info
} from 'lucide-react';
import { executarAuditoriaPlen, REGRAS_META } from './validators/crossDocumentAnalysis';

const CATEGORIA_CORES = {
  'Jurídico':    'bg-violet-50 text-violet-700 border-violet-200',
  'Contábil':    'bg-blue-50 text-blue-700 border-blue-200',
  'Financeiro':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Societário':  'bg-amber-50 text-amber-700 border-amber-200',
  'Operacional': 'bg-slate-50 text-slate-600 border-slate-200',
  'Tributário':  'bg-red-50 text-red-700 border-red-200',
};

function RegraCard({ resultado, meta, expanded, onToggle }) {
  const { passado, alertas = [], sugestao, motivo } = resultado;
  const totalAlertas = alertas.length;

  let statusLabel, statusColor, StatusIcon;
  if (passado === null) {
    statusLabel = 'N/A'; statusColor = 'bg-slate-100 text-slate-500'; StatusIcon = Info;
  } else if (passado) {
    statusLabel = 'OK'; statusColor = 'bg-emerald-100 text-emerald-700'; StatusIcon = CheckCircle2;
  } else {
    const temCritico = alertas.some(a => a.severidade === 'critica');
    statusLabel = temCritico ? 'CRÍTICO' : 'ALERTA';
    statusColor = temCritico ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
    StatusIcon = temCritico ? AlertCircle : AlertTriangle;
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      passado === false && alertas.some(a => a.severidade === 'critica')
        ? 'border-red-200 bg-red-50/30'
        : passado === false
          ? 'border-amber-200 bg-amber-50/20'
          : passado
            ? 'border-emerald-100 bg-white'
            : 'border-slate-100 bg-white'
    }`}>
      <button
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-slate-50/50 transition-colors"
        onClick={onToggle}
      >
        <span className="text-[10px] font-black text-slate-300 w-7 flex-shrink-0">{resultado.id}</span>
        <StatusIcon className={`h-4 w-4 flex-shrink-0 ${
          passado ? 'text-emerald-500' : passado === false ? (alertas.some(a => a.severidade === 'critica') ? 'text-red-500' : 'text-amber-500') : 'text-slate-400'
        }`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{meta.titulo}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={`text-[10px] px-2 py-0 ${CATEGORIA_CORES[meta.categoria]}`} variant="outline">
            {meta.categoria}
          </Badge>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
          {totalAlertas > 0 && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{totalAlertas}</span>
          )}
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <p className="text-[11px] text-slate-400 font-mono">{meta.norm}</p>
          {motivo && (
            <p className="text-xs text-slate-500 italic">{motivo}</p>
          )}
          {alertas.map((a, i) => (
            <div key={i} className={`rounded-lg border p-3 text-xs space-y-1 ${
              a.severidade === 'critica' ? 'bg-red-50 border-red-200' :
              a.severidade === 'media' ? 'bg-amber-50 border-amber-200' :
              'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-start gap-2">
                <AlertCircle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                  a.severidade === 'critica' ? 'text-red-500' :
                  a.severidade === 'media' ? 'text-amber-500' : 'text-slate-400'
                }`} />
                <p className={a.severidade === 'critica' ? 'text-red-700' : 'text-amber-700'}>{a.mensagem || JSON.stringify(a)}</p>
              </div>
              {a.falta && (
                <ul className="ml-5 list-disc space-y-0.5">
                  {a.falta.map((f, j) => <li key={j} className="text-red-600">{f}</li>)}
                </ul>
              )}
              {(a.campo || a.fonte1) && (
                <div className="ml-5 text-slate-500 space-y-0.5">
                  {a.fonte1 && <p><strong>{a.fonte1}:</strong> {a.valor1}</p>}
                  {a.fonte2 && <p><strong>{a.fonte2}:</strong> {a.valor2}</p>}
                </div>
              )}
            </div>
          ))}
          {sugestao && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 flex gap-2">
              <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">{sugestao}</p>
            </div>
          )}
          {passado && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Nenhuma inconsistência encontrada
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnaliseCruzadaPanel({ documentos = [], caso = {} }) {
  const [executando, setExecutando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [expandido, setExpandido] = useState({});

  const executarAuditoria = async () => {
    setExecutando(true);
    await new Promise(r => setTimeout(r, 300)); // micro-delay visual
    const res = executarAuditoriaPlen(documentos, caso);
    setResultados(res);
    // Auto-expandir alertas críticos
    const autoExpand = {};
    res.forEach(r => {
      if (r.passado === false) autoExpand[r.id] = true;
    });
    setExpandido(autoExpand);
    setExecutando(false);
  };

  const toggleExpand = (id) => setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

  const resumo = resultados ? {
    total: resultados.length,
    ok: resultados.filter(r => r.passado === true).length,
    alerta: resultados.filter(r => r.passado === false && !r.alertas?.some(a => a.severidade === 'critica')).length,
    critico: resultados.filter(r => r.alertas?.some(a => a.severidade === 'critica')).length,
    na: resultados.filter(r => r.passado === null).length,
  } : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-50/80 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Motor de Auditoria Documental</h3>
              <p className="text-xs text-slate-500">16 regras — IN RFB 1984/2020 + Portaria Coana 72</p>
            </div>
          </div>
          <Button
            onClick={executarAuditoria}
            disabled={executando || !documentos.length}
            className="bg-violet-600 hover:bg-violet-700 flex-shrink-0 gap-2"
            size="sm"
          >
            {executando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {resultados ? 'Re-auditar' : 'Executar Auditoria'}
          </Button>
        </div>

        {/* Resumo */}
        {resumo && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[
              { label: 'Críticos', val: resumo.critico, color: 'text-red-600 bg-red-50 border-red-100' },
              { label: 'Alertas', val: resumo.alerta, color: 'text-amber-600 bg-amber-50 border-amber-100' },
              { label: 'Aprovados', val: resumo.ok, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
              { label: 'N/A', val: resumo.na, color: 'text-slate-500 bg-slate-50 border-slate-100' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl border p-3 text-center ${item.color}`}>
                <p className="text-xl font-black">{item.val}</p>
                <p className="text-[11px] font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {!documentos.length && (
          <p className="mt-3 text-xs text-slate-400 italic">Nenhum documento disponível para auditoria.</p>
        )}
      </div>

      {/* Resultados por regra */}
      {resultados && (
        <div className="space-y-2">
          {resultados.map(res => (
            <RegraCard
              key={res.id}
              resultado={res}
              meta={REGRAS_META[res.id]}
              expanded={!!expandido[res.id]}
              onToggle={() => toggleExpand(res.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}