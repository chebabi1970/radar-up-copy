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
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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