/**
 * Dashboard Unificado de Análise
 * Design moderno com glass-morphism e timeline visual
 */

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Target,
  Activity,
  Zap
} from 'lucide-react';
import { analisarDocumentoIndividual } from '@/utils/documentAnalysis';
import { executarAnaliseCruzadaCompleta } from '@/utils/crossDocumentAnalysis';

const tipoDocumentoLabels = {
  requerimento_das: "Requerimento DAS",
  documento_identificacao_responsavel: "Doc. Identificação",
  procuracao: "Procuração",
  contrato_social: "Contrato Social",
  certidao_junta_comercial: "Certidão Junta",
  conta_energia: "Conta de Energia",
  extrato_bancario_corrente: "Extratos Bancários",
  balancete_verificacao: "Balancete",
  das_simples_nacional: "DAS",
  darf_cprb: "DARF CPRB",
  contrato_mutuo: "Contrato de Mútuo",
  comprovante_iof: "Comprovante IOF"
};

const ScoreRing = ({ score, size = 80 }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
};

export default function DashboardUnificado({ caso, documentos = [], cliente = {}, onAcaoClick }) {
  const [analiseIndividual, setAnaliseIndividual] = useState([]);
  const [analiseCruzada, setAnaliseCruzada] = useState(null);
  const [analisando, setAnalisando] = useState(false);
  const [progressoAnalise, setProgressoAnalise] = useState(0);

  useEffect(() => {
    if (documentos.length > 0) executarAnalises();
  }, [documentos]);

  const executarAnalises = async () => {
    setAnalisando(true);
    setProgressoAnalise(0);
    try {
      const resultadosIndividuais = [];
      for (let i = 0; i < documentos.length; i++) {
        try {
          const resultado = await analisarDocumentoIndividual(documentos[i]);
          resultadosIndividuais.push(resultado);
        } catch (error) {
          console.error(`Erro ao analisar doc ${documentos[i].id}:`, error);
        }
        setProgressoAnalise(((i + 1) / documentos.length) * 50);
      }
      setAnaliseIndividual(resultadosIndividuais);

      setProgressoAnalise(60);
      const resultadoCruzada = await executarAnaliseCruzadaCompleta(documentos, cliente);
      setAnaliseCruzada(resultadoCruzada);
      setProgressoAnalise(100);
    } catch (error) {
      console.error('Erro na análise:', error);
    } finally {
      setAnalisando(false);
    }
  };

  const totalDocumentos = documentos.length;
  const documentosAnalisados = analiseIndividual.length;
  const documentosValidos = analiseIndividual.filter(a => a.valido).length;
  const problemasCriticos = analiseIndividual.reduce((sum, a) => sum + a.problemas.filter(p => p.severidade === 'critico').length, 0);
  const problemasAltos = analiseIndividual.reduce((sum, a) => sum + a.problemas.filter(p => p.severidade === 'alto').length, 0);

  const scoreGeral = analiseIndividual.length > 0
    ? Math.round(analiseIndividual.reduce((sum, a) => sum + a.score, 0) / analiseIndividual.length)
    : 0;

  const inconsistenciasCruzadas = analiseCruzada?.resumo?.inconsistencias_criticas || 0;

  const determinarProximaAcao = () => {
    if (totalDocumentos === 0) return { titulo: 'Enviar Documentos', descricao: 'Faça upload dos documentos necessários', acao: 'upload', icone: FileText, cor: 'indigo' };
    if (problemasCriticos > 0) return { titulo: 'Corrigir Problemas Críticos', descricao: `${problemasCriticos} problema(s) crítico(s) detectado(s)`, acao: 'corrigir_criticos', icone: AlertCircle, cor: 'red' };
    if (inconsistenciasCruzadas > 0) return { titulo: 'Resolver Inconsistências', descricao: `${inconsistenciasCruzadas} inconsistência(s) entre documentos`, acao: 'resolver_inconsistencias', icone: AlertTriangle, cor: 'amber' };
    if (problemasAltos > 0) return { titulo: 'Revisar Alertas', descricao: 'Alertas requerem atenção antes do protocolo', acao: 'revisar_alertas', icone: AlertTriangle, cor: 'amber' };
    if (scoreGeral >= 90) return { titulo: 'Protocolar Caso', descricao: 'Documentação completa e aprovada!', acao: 'protocolar', icone: CheckCircle2, cor: 'emerald' };
    return { titulo: 'Completar Documentação', descricao: 'Continue enviando os documentos', acao: 'upload', icone: FileText, cor: 'indigo' };
  };

  const proximaAcao = determinarProximaAcao();
  const ProximaAcaoIcone = proximaAcao.icone;

  const timelineSteps = [
    { label: 'Upload', sub: totalDocumentos > 0 ? `${totalDocumentos} docs` : 'Pendente', done: totalDocumentos > 0 },
    { label: 'Análise Individual', sub: documentosAnalisados > 0 ? `${documentosAnalisados} analisados` : 'Aguardando', done: documentosAnalisados > 0 },
    { label: 'Análise Cruzada', sub: analiseCruzada ? `${analiseCruzada.resumo.total_regras} regras` : 'Aguardando', done: !!analiseCruzada },
    { label: 'Protocolo', sub: scoreGeral >= 90 ? 'Pronto' : 'Aguardando', done: scoreGeral >= 90 }
  ];

  return (
    <div className="space-y-5">
      {/* Score + Métricas */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6">
        <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-bl from-indigo-50/60 to-transparent rounded-full -translate-y-1/3 translate-x-1/4" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">Visão Geral do Caso</h3>
              <p className="text-xs text-slate-500">Análise automatizada da documentação</p>
            </div>
            <Badge variant="outline" className={`text-sm px-3 py-1 font-bold ${
              scoreGeral >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              scoreGeral >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-red-50 text-red-700 border-red-200'
            }`}>
              Score: {scoreGeral}/100
            </Badge>
          </div>

          {/* Progress */}
          {analisando && (
            <div className="mb-5 p-3 rounded-xl bg-violet-50/80 border border-violet-100">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-violet-700 mb-1.5">Analisando documentos...</p>
                  <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-400 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progressoAnalise}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div className="group rounded-xl bg-blue-50/80 border border-blue-100 p-4 transition-all hover:shadow-md hover:shadow-blue-100/50 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">Documentos</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{documentosAnalisados}/{totalDocumentos}</p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </div>

            <div className="group rounded-xl bg-emerald-50/80 border border-emerald-100 p-4 transition-all hover:shadow-md hover:shadow-emerald-100/50 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600">Conformidade</p>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">{documentosValidos}/{documentosAnalisados}</p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </div>

            <div className={`group rounded-xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${
              problemasCriticos > 0 ? 'bg-red-50/80 border border-red-100 hover:shadow-red-100/50' :
              problemasAltos > 0 ? 'bg-amber-50/80 border border-amber-100 hover:shadow-amber-100/50' :
              'bg-slate-50/80 border border-slate-100 hover:shadow-slate-100/50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium ${
                    problemasCriticos > 0 ? 'text-red-600' : problemasAltos > 0 ? 'text-amber-600' : 'text-slate-600'
                  }`}>Alertas</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    problemasCriticos > 0 ? 'text-red-900' : problemasAltos > 0 ? 'text-amber-900' : 'text-slate-900'
                  }`}>{problemasCriticos + problemasAltos}</p>
                </div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                  problemasCriticos > 0 ? 'bg-red-100' : problemasAltos > 0 ? 'bg-amber-100' : 'bg-slate-100'
                }`}>
                  <AlertTriangle className={`h-5 w-5 ${
                    problemasCriticos > 0 ? 'text-red-500' : problemasAltos > 0 ? 'text-amber-500' : 'text-slate-400'
                  }`} />
                </div>
              </div>
            </div>
          </div>

          {/* Categorias (from cross-analysis) */}
          {analiseCruzada?.resumo?.categorias && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {analiseCruzada.resumo.categorias.map(cat => (
                <div key={cat.id} className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-center">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{cat.label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${
                    cat.score >= 90 ? 'text-emerald-600' : cat.score >= 70 ? 'text-amber-600' : 'text-red-600'
                  }`}>{cat.score}%</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Próxima Ação */}
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        proximaAcao.cor === 'emerald' ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-teal-50/40' :
        proximaAcao.cor === 'red' ? 'border-red-200 bg-gradient-to-r from-red-50/80 to-rose-50/40' :
        proximaAcao.cor === 'amber' ? 'border-amber-200 bg-gradient-to-r from-amber-50/80 to-orange-50/40' :
        'border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-violet-50/40'
      }`}>
        <div className="p-5 flex items-start gap-4">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 ${
            proximaAcao.cor === 'emerald' ? 'bg-emerald-100' :
            proximaAcao.cor === 'red' ? 'bg-red-100' :
            proximaAcao.cor === 'amber' ? 'bg-amber-100' :
            'bg-indigo-100'
          }`}>
            <Target className={`h-6 w-6 ${
              proximaAcao.cor === 'emerald' ? 'text-emerald-600' :
              proximaAcao.cor === 'red' ? 'text-red-600' :
              proximaAcao.cor === 'amber' ? 'text-amber-600' :
              'text-indigo-600'
            }`} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 mb-1">Próxima Ação: {proximaAcao.titulo}</h4>
            <p className="text-sm text-slate-600 mb-3">{proximaAcao.descricao}</p>
            <Button onClick={() => onAcaoClick && onAcaoClick(proximaAcao.acao)} className="rounded-xl gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
              <ProximaAcaoIcone className="h-4 w-4" />
              {proximaAcao.titulo}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Inconsistências Críticas */}
      {(problemasCriticos > 0 || inconsistenciasCruzadas > 0) && (
        <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50/80 to-white overflow-hidden">
          <div className="p-5">
            <h4 className="font-semibold text-red-900 flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-red-500" />
              Inconsistências Críticas
            </h4>
            <div className="space-y-2">
              {analiseIndividual
                .filter(a => a.problemas.some(p => p.severidade === 'critico'))
                .map(analise => (
                  <div key={analise.documentoId} className="flex items-start gap-2 p-3 rounded-xl bg-white border border-red-100">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-slate-900">{tipoDocumentoLabels[analise.tipo] || analise.tipo}: </span>
                      <span className="text-slate-600">
                        {analise.problemas.filter(p => p.severidade === 'critico').map(p => p.mensagem).join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              {analiseCruzada?.resultados
                .filter(r => r.nivel === 'critico' && !r.passou)
                .map((resultado, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-white border border-red-100">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-slate-900">{resultado.nome}: </span>
                      <span className="text-slate-600">{resultado.discrepancias?.[0]?.mensagem || resultado.sugestao}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6">
        <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-5">
          <Clock className="h-5 w-5 text-slate-400" />
          Timeline do Processo
        </h4>
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-slate-100" />

          <div className="space-y-6">
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-4">
                <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all ${
                  step.done ? 'bg-emerald-100 shadow-sm shadow-emerald-100' : 'bg-slate-100'
                }`}>
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                  )}
                </div>
                <div className="pt-2">
                  <p className={`font-medium ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                  <p className="text-xs text-slate-500">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
