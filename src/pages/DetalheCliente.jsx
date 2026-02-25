import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FolderOpen, Mail, Phone, MapPin, Building2, Loader2 } from 'lucide-react';


const modalidadeColors = {
  limitada: "bg-blue-100 text-blue-800",
  ilimitada: "bg-purple-100 text-purple-800",
  analise_regularizacao: "bg-amber-100 text-amber-800"
};

export default function DetalheCliente() {
  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get('clienteId');

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const clientes = await base44.entities.Cliente.list();
      return clientes.find(c => c.id === clienteId);
    },
    enabled: !!clienteId
  });

  const { data: casos = [] } = useQuery({
    queryKey: ['casos-cliente', clienteId],
    queryFn: async () => {
      const allCasos = await base44.entities.Caso.list();
      return allCasos.filter(c => c.cliente_id === clienteId).sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
    },
    enabled: !!clienteId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Clientes')}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos Clientes
            </Button>
          </Link>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center text-slate-500">
              Cliente não encontrado
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <Link to={createPageUrl('Clientes')}>
          <Button variant="ghost" className="mb-4 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos Clientes
          </Button>
        </Link>

        {/* Informações do Cliente */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl md:text-3xl mb-2">{cliente.razao_social}</CardTitle>
                {cliente.nome_fantasia && (
                  <p className="text-sm text-slate-600 mb-3">{cliente.nome_fantasia}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CNPJ */}
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">CNPJ</p>
                  <p className="text-sm font-mono text-slate-900">{cliente.cnpj}</p>
                </div>
              </div>

              {/* Email */}
              {cliente.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Email</p>
                    <p className="text-sm text-blue-600 break-all">{cliente.email}</p>
                  </div>
                </div>
              )}

              {/* Telefone */}
              {cliente.telefone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Telefone</p>
                    <p className="text-sm text-slate-900">{cliente.telefone}</p>
                  </div>
                </div>
              )}

              {/* Endereço */}
              {cliente.endereco && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Endereço</p>
                    <p className="text-sm text-slate-900">{cliente.endereco}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              {cliente.modalidade_habilitacao && (
                <Badge className={modalidadeColors[cliente.modalidade_habilitacao]}>
                  {cliente.modalidade_habilitacao === 'analise_regularizacao' 
                    ? 'Análise de Regularização'
                    : cliente.modalidade_habilitacao.charAt(0).toUpperCase() + cliente.modalidade_habilitacao.slice(1)}
                </Badge>
              )}
              {cliente.procuracao_eletronica ? (
                <Badge className="bg-green-100 text-green-800">✓ Procuração e-CAC Ativa</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">✗ Procuração e-CAC Pendente</Badge>
              )}
              {cliente.optante_simples_nacional && (
                <Badge className="bg-cyan-100 text-cyan-800">Simples Nacional</Badge>
              )}
              <Badge variant="outline">{casos.length} Caso{casos.length !== 1 ? 's' : ''}</Badge>
              </div>

            {(cliente.data_abertura_empresa || cliente.observacoes) && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                {cliente.data_abertura_empresa && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Data de Abertura</p>
                    <p className="text-sm text-slate-900 font-medium">
                      {new Date(cliente.data_abertura_empresa).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(() => {
                        const dataAbertura = new Date(cliente.data_abertura_empresa);
                        const hoje = new Date();
                        const meses = Math.floor((hoje.getFullYear() - dataAbertura.getFullYear()) * 12 + (hoje.getMonth() - dataAbertura.getMonth()));
                        return `${meses} mês${meses !== 1 ? 'es' : ''} completo${meses !== 1 ? 's' : ''}`;
                      })()}
                    </p>
                  </div>
                )}
                {cliente.observacoes && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Observações</p>
                    <p className="text-sm text-slate-700">{cliente.observacoes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Casos do Cliente */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Casos do Cliente
          </h2>
          {casos.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center text-slate-500">
                <p>Nenhum caso cadastrado para este cliente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {casos.map(caso => (
                <Link key={caso.id} to={createPageUrl(`CasoDetalhe?id=${caso.id}`)}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900 mb-2 truncate">
                        {caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`}
                      </h3>
                      <div className="space-y-2 text-xs text-slate-600">
                        <p>
                          <span className="font-medium">Status:</span>{' '}
                          <Badge variant="outline" className="ml-1">{caso.status}</Badge>
                        </p>
                        <p>
                          <span className="font-medium">Hipótese:</span> {caso.hipotese_revisao || 'N/A'}
                        </p>
                        <p>
                          <span className="font-medium">Criado em:</span>{' '}
                          {new Date(caso.created_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}