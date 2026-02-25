import React, { useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  AlertCircle,
  Shield,
  Activity,
  TrendingUp
} from 'lucide-react';

const ScoreCircle = ({ score, size = 120 }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const bgColor = score >= 80 ? '#d1fae5' : score >= 50 ? '#fef3c7' : '#fee2e2';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#f1f5f9" strokeWidth="10"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
};

export default function DashboardConformidade({ caso, checklistItems, documentos, analisesHistorico }) {
  const metricas = useMemo(() => {
    const totalItens = checklistItems.length;
    const aprovados = checklistItems.filter(i => i.status === 'aprovado').length;
    const pendentes = checklistItems.filter(i => i.status === 'pendente').length;
    const enviados = checklistItems.filter(i => i.status === 'enviado').length;
    const progressoChecklist = totalItens > 0 ? Math.round((aprovados / totalItens) * 100) : 0;

    const totalDocs = documentos.length;
    const docsAprovados = documentos.filter(d => d.status_analise === 'aprovado').length;
    const docsReprovados = documentos.filter(d => d.status_analise === 'reprovado').length;
    const docsPendentes = documentos.filter(d => d.status_analise === 'pendente').length;

    const totalAnalises = analisesHistorico?.length || 0;
    const analisesCriticas = analisesHistorico?.filter(a => a.discrepancias_criticas > 0).length || 0;
    const analisesSemProblemas = analisesHistorico?.filter(a => a.status_resultado === 'sem_discrepancias').length || 0;

    let score = 0;
    if (totalItens > 0) score += (aprovados / totalItens) * 40;
    if (totalDocs > 0) score += (docsAprovados / totalDocs) * 30;
    if (totalAnalises > 0) score += (analisesSemProblemas / totalAnalises) * 30;
    score = Math.round(score);

    let statusGeral = 'pendente';
    if (score >= 80) statusGeral = 'apto';
    else if (score >= 50) statusGeral = 'em_progresso';
    else if (analisesCriticas > 0 || docsReprovados > 0) statusGeral = 'critico';

    return {
      checklist: { totalItens, aprovados, pendentes, enviados, progressoChecklist },
      documentos: { totalDocs, docsAprovados, docsReprovados, docsPendentes },
      analises: { totalAnalises, analisesCriticas, analisesSemProblemas },
      score, statusGeral
    };
  }, [checklistItems, documentos, analisesHistorico]);

  const alertasCriticos = useMemo(() => {
    const alertas = [];
    if (metricas.checklist.pendentes > 5)
      alertas.push({ tipo: 'checklist', severidade: 'media', mensagem: `${metricas.checklist.pendentes} itens pendentes no checklist` });
    if (metricas.documentos.docsReprovados > 0)
      alertas.push({ tipo: 'documentos', severidade: 'critica', mensagem: `${metricas.documentos.docsReprovados} documentos reprovados` });
    if (metricas.analises.analisesCriticas > 0)
      alertas.push({ tipo: 'analises', severidade: 'critica', mensagem: `${metricas.analises.analisesCriticas} análises com discrepâncias críticas` });
    if (metricas.analises.totalAnalises === 0 && metricas.documentos.totalDocs > 0)
      alertas.push({ tipo: 'analises', severidade: 'media', mensagem: 'Nenhuma análise realizada ainda' });
    return alertas;
  }, [metricas]);

  const statusConfig = {
    apto: { label: 'Apto para Protocolo', cor: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
    em_progresso: { label: 'Em Progresso', cor: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Activity },
    critico: { label: 'Atenção Necessária', cor: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: AlertTriangle },
    pendente: { label: 'Pendente', cor: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: Activity }
  };

  const status = statusConfig[metricas.statusGeral];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-5">
      {/* Score Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-50/80 to-transparent rounded-full -translate-y-1/4 translate-x-1/4" />
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <ScoreCircle score={metricas.score} />
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Score de Conformidade</h3>
            <p className="text-sm text-slate-500 mb-3">Avaliação geral do caso</p>
            <Badge className={`${status.bg} ${status.cor} border px-3 py-1 text-xs font-medium`}>
              <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
              {status.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Métricas Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Checklist', value: `${metricas.checklist.progressoChecklist}%`, sub: `${metricas.checklist.aprovados}/${metricas.checklist.totalItens}`, icon: CheckCircle2, color: 'emerald' },
          { label: 'Documentos', value: metricas.documentos.totalDocs, sub: `${metricas.documentos.docsAprovados} aprovados`, icon: FileText, color: 'blue' },
          { label: 'Análises', value: metricas.analises.totalAnalises, sub: `${metricas.analises.analisesSemProblemas} sem problemas`, icon: Activity, color: 'violet' },
          { label: 'Qualidade', value: metricas.analises.analisesCriticas === 0 ? 'OK' : `${metricas.analises.analisesCriticas}`, sub: metricas.analises.analisesCriticas === 0 ? 'Sem críticas' : 'críticas', icon: Shield, color: metricas.analises.analisesCriticas === 0 ? 'emerald' : 'red' }
        ].map((m, idx) => (
          <div key={idx} className="group rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:shadow-md hover:shadow-slate-100/50 hover:-translate-y-0.5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-${m.color}-50`}>
                <m.icon className={`h-4 w-4 text-${m.color}-500`} />
              </div>
              <span className="text-xs font-medium text-slate-500">{m.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{m.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {alertasCriticos.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-gradient-to-r from-red-50/80 to-orange-50/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h4 className="font-semibold text-slate-900">Alertas</h4>
            <Badge className="bg-red-100 text-red-700 border-red-200 ml-auto">{alertasCriticos.length}</Badge>
          </div>
          <div className="space-y-2">
            {alertasCriticos.map((alerta, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-xl ${
                  alerta.severidade === 'critica' ? 'bg-white border border-red-100' : 'bg-white border border-amber-100'
                }`}
              >
                {alerta.severidade === 'critica' ? (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <Badge className={`text-[10px] mb-1 ${
                    alerta.severidade === 'critica' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`} variant="outline">
                    {alerta.tipo}
                  </Badge>
                  <p className="text-sm text-slate-700">{alerta.mensagem}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalhamento */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          Detalhamento
        </h4>
        <div className="space-y-5">
          {[
            { label: 'Checklist', progress: metricas.checklist.progressoChecklist, items: [
              { dot: 'bg-emerald-500', text: `${metricas.checklist.aprovados} aprovados` },
              { dot: 'bg-blue-500', text: `${metricas.checklist.enviados} enviados` },
              { dot: 'bg-slate-300', text: `${metricas.checklist.pendentes} pendentes` }
            ]},
            { label: 'Documentos', progress: metricas.documentos.totalDocs > 0 ? Math.round((metricas.documentos.docsAprovados / metricas.documentos.totalDocs) * 100) : 0, items: [
              { dot: 'bg-emerald-500', text: `${metricas.documentos.docsAprovados} aprovados` },
              { dot: 'bg-red-500', text: `${metricas.documentos.docsReprovados} reprovados` },
              { dot: 'bg-slate-300', text: `${metricas.documentos.docsPendentes} pendentes` }
            ]}
          ].map((section, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{section.label}</span>
                <span className="text-sm font-semibold text-slate-900">{section.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${section.progress}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                {section.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${item.dot}`} />
                    <span className="text-slate-600">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
