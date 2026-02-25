import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  FolderOpen,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Loader2,
  Calendar,
  Timer
} from 'lucide-react';
import { format, differenceInDays, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const statusLabels = {
  novo: "Novo",
  em_analise: "Em Análise",
  aguardando_documentos: "Aguardando Docs",
  documentacao_completa: "Doc. Completa",
  protocolado: "Protocolado",
  deferido: "Deferido",
  indeferido: "Indeferido",
  arquivado: "Arquivado"
};

const statusColors = {
  novo: "#3b82f6",
  em_analise: "#f59e0b",
  aguardando_documentos: "#f97316",
  documentacao_completa: "#10b981",
  protocolado: "#8b5cf6",
  deferido: "#059669",
  indeferido: "#ef4444",
  arquivado: "#6b7280"
};

const hipoteseLabels = {
  recursos_financeiros_livres: "Recursos Fin. Livres",
  fruicao_desoneracao_tributaria: "Fruição Desonerações",
  recolhimento_tributos_das: "DAS",
  recolhimento_tributos_cprb: "CPRB",
  retomada_atividades: "Retomada Atividades",
  inicio_retomada_atividades_5anos: "Início/Retomada <5 anos"
};

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#f97316', '#06b6d4', '#ec4899'];

export default function DashboardAnalitico() {
  const [periodo, setPeriodo] = useState('6');

  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const { data: casos = [], isLoading: loadingCasos } = useQuery({
    queryKey: ['casos'],
    queryFn: () => base44.entities.Caso.list('-created_date')
  });

  const { data: documentos = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documentos'],
    queryFn: () => base44.entities.Documento.list()
  });

  const isLoading = loadingClientes || loadingCasos || loadingDocs;

  const analytics = useMemo(() => {
    if (isLoading) return null;

    const now = new Date();
    const mesesAtras = subMonths(now, parseInt(periodo));

    // Casos no período
    const casosNoPeriodo = casos.filter(c => new Date(c.created_date) >= mesesAtras);
    const casosAtivos = casos.filter(c => !['arquivado', 'deferido', 'indeferido'].includes(c.status));
    const casosFinalizados = casos.filter(c => ['deferido', 'indeferido'].includes(c.status));
    const casosDeferidos = casos.filter(c => c.status === 'deferido');
    const casosIndeferidos = casos.filter(c => c.status === 'indeferido');

    // Taxa de aprovação
    const taxaAprovacao = casosFinalizados.length > 0
      ? Math.round((casosDeferidos.length / casosFinalizados.length) * 100)
      : 0;

    // Tempo médio de resolução (dias entre criação e deferimento/indeferimento)
    const temposResolucao = casosFinalizados.map(c => {
      const dataIni = new Date(c.created_date);
      const dataFim = new Date(c.updated_date || c.created_date);
      return differenceInDays(dataFim, dataIni);
    }).filter(d => d > 0);
    const tempoMedio = temposResolucao.length > 0
      ? Math.round(temposResolucao.reduce((a, b) => a + b, 0) / temposResolucao.length)
      : 0;

    // Distribuição por status
    const porStatus = Object.keys(statusLabels).map(status => ({
      name: statusLabels[status],
      value: casos.filter(c => c.status === status).length,
      color: statusColors[status]
    })).filter(item => item.value > 0);

    // Distribuição por hipótese
    const porHipotese = Object.keys(hipoteseLabels).map(hip => ({
      name: hipoteseLabels[hip],
      total: casos.filter(c => c.hipotese_revisao === hip).length,
      deferidos: casos.filter(c => c.hipotese_revisao === hip && c.status === 'deferido').length,
      indeferidos: casos.filter(c => c.hipotese_revisao === hip && c.status === 'indeferido').length
    })).filter(item => item.total > 0);

    // Evolução mensal
    const meses = parseInt(periodo);
    const evolucaoMensal = Array.from({ length: meses }, (_, i) => {
      const date = subMonths(now, meses - 1 - i);
      const inicio = startOfMonth(date);
      const fim = endOfMonth(date);
      const mesLabel = format(date, 'MMM/yy', { locale: ptBR });

      const criados = casos.filter(c => {
        const d = new Date(c.created_date);
        return isWithinInterval(d, { start: inicio, end: fim });
      }).length;

      const finalizados = casos.filter(c => {
        if (!['deferido', 'indeferido'].includes(c.status)) return false;
        const d = new Date(c.updated_date || c.created_date);
        return isWithinInterval(d, { start: inicio, end: fim });
      }).length;

      const docsCriados = documentos.filter(d => {
        const dt = new Date(d.created_date);
        return isWithinInterval(dt, { start: inicio, end: fim });
      }).length;

      return { mes: mesLabel, criados, finalizados, documentos: docsCriados };
    });

    // Divergências
    const totalDivergencias = casos.reduce((acc, c) => {
      return acc + (c.divergencias_encontradas?.length || 0);
    }, 0);
    const divergenciasAbertas = casos.reduce((acc, c) => {
      return acc + (c.divergencias_encontradas?.filter(d => !d.resolvida)?.length || 0);
    }, 0);
    const divergenciasResolvidas = totalDivergencias - divergenciasAbertas;

    // Docs por status de análise
    const docsAnalisados = documentos.filter(d => d.status_analise === 'analisado').length;
    const docsPendentes = documentos.filter(d => d.status_analise === 'pendente').length;
    const docsComErro = documentos.filter(d => d.status_analise === 'erro').length;

    // Top clientes (por número de casos)
    const clientesCasos = clientes.map(cl => ({
      nome: cl.razao_social?.substring(0, 25) || 'N/A',
      casos: casos.filter(c => c.cliente_id === cl.id).length,
      ativos: casos.filter(c => c.cliente_id === cl.id && !['arquivado', 'deferido', 'indeferido'].includes(c.status)).length
    })).filter(c => c.casos > 0).sort((a, b) => b.casos - a.casos).slice(0, 8);

    // Funil de conversão
    const funil = [
      { etapa: 'Novos', valor: casos.filter(c => c.status === 'novo').length + casosAtivos.length + casosFinalizados.length, fill: '#3b82f6' },
      { etapa: 'Em Análise', valor: casos.filter(c => c.status === 'em_analise').length + casos.filter(c => ['documentacao_completa', 'protocolado', 'deferido', 'indeferido'].includes(c.status)).length, fill: '#f59e0b' },
      { etapa: 'Doc. Completa', valor: casos.filter(c => ['documentacao_completa', 'protocolado', 'deferido', 'indeferido'].includes(c.status)).length, fill: '#10b981' },
      { etapa: 'Protocolados', valor: casos.filter(c => ['protocolado', 'deferido', 'indeferido'].includes(c.status)).length, fill: '#8b5cf6' },
      { etapa: 'Deferidos', valor: casosDeferidos.length, fill: '#059669' },
    ];

    return {
      totalCasos: casos.length,
      casosAtivos: casosAtivos.length,
      casosNoPeriodo: casosNoPeriodo.length,
      totalClientes: clientes.length,
      totalDocumentos: documentos.length,
      taxaAprovacao,
      tempoMedio,
      porStatus,
      porHipotese,
      evolucaoMensal,
      totalDivergencias,
      divergenciasAbertas,
      divergenciasResolvidas,
      docsAnalisados,
      docsPendentes,
      docsComErro,
      clientesCasos,
      funil,
      casosDeferidos: casosDeferidos.length,
      casosIndeferidos: casosIndeferidos.length,
      casosFinalizados: casosFinalizados.length
    };
  }, [casos, clientes, documentos, periodo, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-sm">
        <p className="font-semibold text-slate-900 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-xs">
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Dashboard Analítico
            </h1>
            <p className="text-slate-500 mt-1">
              Visão consolidada da carteira de casos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {[
            { icon: FolderOpen, label: 'Total Casos', value: analytics.totalCasos, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
            { icon: Activity, label: 'Casos Ativos', value: analytics.casosAtivos, color: 'amber', gradient: 'from-amber-500 to-amber-600' },
            { icon: Users, label: 'Clientes', value: analytics.totalClientes, color: 'violet', gradient: 'from-violet-500 to-violet-600' },
            { icon: TrendingUp, label: 'Taxa Aprovação', value: `${analytics.taxaAprovacao}%`, color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
            { icon: Timer, label: 'Tempo Médio', value: `${analytics.tempoMedio}d`, color: 'cyan', gradient: 'from-cyan-500 to-cyan-600' },
            { icon: FileText, label: 'Documentos', value: analytics.totalDocumentos, color: 'pink', gradient: 'from-pink-500 to-pink-600' }
          ].map((kpi, idx) => (
            <Card key={idx} className="border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <kpi.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">{kpi.label}</p>
                    <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Linha 1: Evolução Mensal + Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Evolução Mensal */}
          <Card className="border-0 shadow-lg shadow-slate-200/50 lg:col-span-2">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Evolução Mensal
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.evolucaoMensal}>
                  <defs>
                    <linearGradient id="gradCriados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradFinalizados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="criados" name="Criados" stroke="#3b82f6" fill="url(#gradCriados)" strokeWidth={2} />
                  <Area type="monotone" dataKey="finalizados" name="Finalizados" stroke="#10b981" fill="url(#gradFinalizados)" strokeWidth={2} />
                  <Area type="monotone" dataKey="documentos" name="Documentos" stroke="#8b5cf6" fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição por Status */}
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-violet-600" />
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Por Status
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {analytics.porStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={analytics.porStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {analytics.porStatus.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      layout="vertical"
                      align="center"
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Linha 2: Hipóteses + Funil */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Performance por Hipótese */}
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Performance por Hipótese
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {analytics.porHipotese.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.porHipotese} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} stroke="#94a3b8" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="deferidos" name="Deferidos" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="indeferidos" name="Indeferidos" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Funil de Conversão */}
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Funil de Conversão
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {analytics.funil.map((etapa, idx) => {
                  const maxVal = Math.max(...analytics.funil.map(f => f.valor), 1);
                  const pct = Math.round((etapa.valor / maxVal) * 100);
                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-700">{etapa.etapa}</span>
                        <span className="text-sm font-bold text-slate-900">{etapa.valor}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: etapa.fill }}
                        >
                          {pct > 15 && (
                            <span className="text-[10px] font-bold text-white">{pct}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Taxa de conversão */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-700">{analytics.taxaAprovacao}%</p>
                    <p className="text-xs text-emerald-600">Taxa de Aprovação</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700">{analytics.casosFinalizados}</p>
                    <p className="text-xs text-blue-600">Casos Finalizados</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Linha 3: Divergências + Documentos + Top Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Divergências */}
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-base font-semibold text-slate-900">
                  Divergências
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-slate-900">{analytics.totalDivergencias}</p>
                <p className="text-xs text-slate-500">Total encontradas</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-red-700">{analytics.divergenciasAbertas}</p>
                  <p className="text-[10px] text-red-600 font-medium">Abertas</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-700">{analytics.divergenciasResolvidas}</p>
                  <p className="text-[10px] text-green-600 font-medium">Resolvidas</p>
                </div>
              </div>
              {analytics.totalDivergencias > 0 && (
                <div className="mt-4">
                  <div className="w-full bg-red-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${Math.round((analytics.divergenciasResolvidas / analytics.totalDivergencias) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 text-center mt-1">
                    {Math.round((analytics.divergenciasResolvidas / analytics.totalDivergencias) * 100)}% resolvidas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base font-semibold text-slate-900">
                  Documentos
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-slate-900">{analytics.totalDocumentos}</p>
                <p className="text-xs text-slate-500">Total de documentos</p>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Analisados', value: analytics.docsAnalisados, color: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
                  { label: 'Pendentes', value: analytics.docsPendentes, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
                  { label: 'Com Erro', value: analytics.docsComErro, color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' }
                ].map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-2.5 ${item.bg} rounded-lg`}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <span className={`text-xs font-medium ${item.text}`}>{item.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${item.text}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Clientes */}
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-500" />
                <CardTitle className="text-base font-semibold text-slate-900">
                  Top Clientes
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {analytics.clientesCasos.length > 0 ? (
                <div className="space-y-2">
                  {analytics.clientesCasos.slice(0, 6).map((cl, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-slate-400 w-4">{idx + 1}</span>
                        <span className="text-xs text-slate-700 truncate">{cl.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {cl.casos} caso{cl.casos !== 1 ? 's' : ''}
                        </Badge>
                        {cl.ativos > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5">
                            {cl.ativos} ativo{cl.ativos !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resultado Geral */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Resumo Executivo</h3>
                <p className="text-slate-400 text-sm mt-1">
                  {analytics.totalCasos} casos totais | {analytics.casosAtivos} ativos |
                  Taxa de aprovação de {analytics.taxaAprovacao}% |
                  Tempo médio de resolução: {analytics.tempoMedio} dias
                </p>
              </div>
              <div className="flex gap-3">
                <Link to={createPageUrl('Casos')}>
                  <Button className="bg-white/10 hover:bg-white/20 text-white border-0">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Ver Casos
                  </Button>
                </Link>
                <Link to={createPageUrl('Dashboard')}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Dashboard Operacional
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
