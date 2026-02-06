import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FolderOpen, 
  FileCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
  Bell
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const statusColors = {
  novo: "bg-blue-100 text-blue-800",
  em_analise: "bg-yellow-100 text-yellow-800",
  aguardando_documentos: "bg-orange-100 text-orange-800",
  documentacao_completa: "bg-green-100 text-green-800",
  protocolado: "bg-purple-100 text-purple-800",
  deferido: "bg-emerald-100 text-emerald-800",
  indeferido: "bg-red-100 text-red-800",
  arquivado: "bg-gray-100 text-gray-800"
};

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

export default function Dashboard() {
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const { data: casos = [] } = useQuery({
    queryKey: ['casos'],
    queryFn: () => base44.entities.Caso.list('-created_date')
  });

  const { data: documentos = [] } = useQuery({
    queryKey: ['documentos'],
    queryFn: () => base44.entities.Documento.list()
  });

  const casosAtivos = casos.filter(c => !['arquivado', 'deferido', 'indeferido'].includes(c.status));
  const casosComDivergencias = casos.filter(c => c.divergencias_encontradas?.some(d => !d.resolvida));
  const docsPendentes = documentos.filter(d => d.status_analise === 'pendente');

  // Alertas de prazo
  const casosComPrazoProximo = casos.filter(c => {
    if (!c.prazo_analise_rfb) return false;
    const diasRestantes = differenceInDays(parseISO(c.prazo_analise_rfb), new Date());
    return diasRestantes >= 0 && diasRestantes <= 3 && c.status === 'protocolado';
  });

  // Analytics - Status Distribution
  const statusDistribution = Object.keys(statusLabels).map(status => ({
    name: statusLabels[status],
    value: casos.filter(c => c.status === status).length
  })).filter(item => item.value > 0);

  const COLORS = ['#3b82f6', '#f59e0b', '#f97316', '#10b981', '#8b5cf6', '#10b981', '#ef4444', '#6b7280'];

  // Analytics - Casos por mês (últimos 6 meses)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return date;
  });

  const casosPorMes = last6Months.map(date => {
    const month = format(date, 'MMM/yy', { locale: ptBR });
    const count = casos.filter(c => {
      const casoDate = new Date(c.created_date);
      return casoDate.getMonth() === date.getMonth() && casoDate.getFullYear() === date.getFullYear();
    }).length;
    return { mes: month, casos: count };
  });

  // Taxa de aprovação
  const casosFinalizados = casos.filter(c => ['deferido', 'indeferido'].includes(c.status));
  const taxaAprovacao = casosFinalizados.length > 0 
    ? Math.round((casos.filter(c => c.status === 'deferido').length / casosFinalizados.length) * 100) 
    : 0;

  const getClienteName = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.razao_social || 'Cliente não encontrado';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Revisão de Estimativa
          </h1>
          <p className="text-slate-500 mt-1">
            Sistema de controle para habilitação no comércio exterior
          </p>
        </div>

        {/* Alertas de Prazo */}
        {casosComPrazoProximo.length > 0 && (
          <Card className="border-0 shadow-lg shadow-red-200/50 bg-red-50 border-red-200 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Bell className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">
                    ⚠️ Atenção: {casosComPrazoProximo.length} caso(s) com prazo RFB próximo
                  </h3>
                  <div className="space-y-2">
                    {casosComPrazoProximo.map(caso => {
                      const diasRestantes = differenceInDays(parseISO(caso.prazo_analise_rfb), new Date());
                      return (
                        <Link 
                          key={caso.id}
                          to={createPageUrl(`CasoDetalhe?id=${caso.id}`)}
                          className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-slate-900 text-sm">
                              {caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-slate-600">
                              {getClienteName(caso.cliente_id)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total de Clientes</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{clientes.length}</p>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Casos Ativos</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{casosAtivos.length}</p>
                </div>
                <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Docs Pendentes</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{docsPendentes.length}</p>
                </div>
                <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Com Divergências</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{casosComDivergencias.length}</p>
                </div>
                <div className="h-12 w-12 bg-red-50 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link to={createPageUrl('Clientes')}>
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:shadow-xl transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Novo Cliente</h3>
                    <p className="text-blue-100 text-sm mt-1">Cadastrar novo cliente</p>
                  </div>
                  <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Casos')}>
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:shadow-xl transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Novo Caso</h3>
                    <p className="text-amber-100 text-sm mt-1">Iniciar revisão de estimativa</p>
                  </div>
                  <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Distribuição por Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>

          {/* Casos por Mês */}
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Casos Criados (Últimos 6 Meses)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={casosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="casos" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Taxa de Aprovação</p>
                  <p className="text-3xl font-bold text-green-900 mt-1">{taxaAprovacao}%</p>
                  <p className="text-xs text-green-600 mt-1">
                    {casos.filter(c => c.status === 'deferido').length} deferidos de {casosFinalizados.length} finalizados
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Em Análise</p>
                  <p className="text-3xl font-bold text-purple-900 mt-1">
                    {casos.filter(c => c.status === 'em_analise').length}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Casos em andamento</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/50 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Protocolados RFB</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">
                    {casos.filter(c => c.status === 'protocolado').length}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Aguardando análise RFB</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Cases */}
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Casos Recentes
              </CardTitle>
              <Link to={createPageUrl('Casos')}>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                  Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {casos.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhum caso cadastrado ainda</p>
                <Link to={createPageUrl('Casos')}>
                  <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" /> Criar primeiro caso
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {casos.slice(0, 5).map((caso) => (
                  <Link 
                    key={caso.id} 
                    to={createPageUrl(`CasoDetalhe?id=${caso.id}`)}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`}
                        </p>
                        <p className="text-sm text-slate-500">
                          {getClienteName(caso.cliente_id)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {caso.divergencias_encontradas?.some(d => !d.resolvida) && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge className={statusColors[caso.status]}>
                        {statusLabels[caso.status]}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}