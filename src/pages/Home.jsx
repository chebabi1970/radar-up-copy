import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  FileText,
  Users,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  DollarSign,
  Shield,
  Zap,
  Sparkles,
  BarChart3,
  Clock,
  Rocket
} from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      }
    };
    getUser();
  }, []);

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const clientes = await base44.entities.Cliente.list();
        const casos = await base44.entities.Caso.list();
        const documentos = await base44.entities.Documento.list();
        
        return {
          totalClientes: clientes.length,
          totalCasos: casos.length,
          casosAtivos: casos.filter(c => ['em_analise', 'aguardando_documentos', 'protocolado'].includes(c.status)).length,
          documentosPendentes: documentos.filter(d => d.status_analise === 'pendente').length
        };
      } catch (error) {
        return null;
      }
    },
    enabled: !!user
  });

  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "Gestão de Clientes",
      descricao: "Organize e acompanhe todos os seus clientes em um só lugar",
      link: "Clientes",
      cor: "blue"
    },
    {
      icon: <FileText className="h-8 w-8 text-purple-600" />,
      title: "Gestão de Casos",
      descricao: "Crie e acompanhe casos de revisão de estimativa e habilitação",
      link: "Casos",
      cor: "purple"
    },
    {
      icon: <DollarSign className="h-8 w-8 text-green-600" />,
      title: "Cálculo de Capacidade",
      descricao: "Calcule automaticamente a capacidade financeira conforme IN 1984/2020",
      link: "Casos",
      cor: "green"
    },
    {
      icon: <Zap className="h-8 w-8 text-red-600" />,
      title: "Crítica Documental por IA",
      descricao: "Análise automática de documentos com detecção de discrepâncias e inconsistências",
      link: "Casos",
      cor: "red"
    }
  ];

  const highlights = [
    {
      icon: <Shield className="h-6 w-6" />,
      titulo: "Confidencialidade",
      descricao: "Seus dados e casos são privados e seguros"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      titulo: "Eficiência",
      descricao: "Acompanhe todo o processo em um dashboard intuitivo"
    },
    {
      icon: <Lightbulb className="h-6 w-6" />,
      titulo: "Inteligência",
      descricao: "IA baseada no Livro RADAR 2025 para análise completa"
    },
    {
      icon: <CheckCircle2 className="h-6 w-6" />,
      titulo: "Conformidade",
      descricao: "Siga todas as normas IN 1984/2020 e Portaria Coana 72/2020"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              RevEstimativa
            </h1>
            <p className="text-xl text-slate-600 mb-4">
              Plataforma completa para gestão de revisões de estimativa de capacidade financeira
            </p>
            <p className="text-slate-500 mb-8">
              Conforme IN RFB 1984/2020 e Portaria Coana 72/2020
            </p>
            {user && (
              <p className="text-sm text-slate-500 mb-8">
                Bem-vindo, <strong>{user.full_name}</strong>
              </p>
            )}
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{stats.totalClientes}</p>
                    <p className="text-sm text-slate-600 mt-2">Clientes</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">{stats.totalCasos}</p>
                    <p className="text-sm text-slate-600 mt-2">Casos Totais</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{stats.casosAtivos}</p>
                    <p className="text-sm text-slate-600 mt-2">Casos Ativos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-600">{stats.documentosPendentes}</p>
                    <p className="text-sm text-slate-600 mt-2">Documentos Pendentes</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Funcionalidades Principais
          </h2>
          <p className="text-slate-600">
            Tudo o que você precisa para gerenciar revisões de habilitação
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {features.map((feature, idx) => (
              <Card key={idx} className="h-full hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-slate-100">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-lg text-slate-900 mt-4">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    {feature.descricao}
                  </p>
                </CardContent>
              </Card>
          ))}
        </div>
      </div>

      {/* Highlights Section */}
      <div className="bg-white/50 backdrop-blur py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Por que usar RevEstimativa?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {highlights.map((item, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-white text-slate-600">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">
                      {item.titulo}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {item.descricao}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <Card className="border-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-4">
              Pronto para começar?
            </CardTitle>
            <p className="text-blue-100 mb-8">
              Crie seu primeiro caso e comece a gerenciar suas revisões de estimativa
            </p>
          </CardHeader>
          <CardContent className="text-center">
            {user ? (
              <Link to={createPageUrl('Casos')}>
                <Button size="lg" className="bg-white text-blue-600 hover:bg-slate-100">
                  Criar Novo Caso
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-slate-100"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Fazer Login
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Section */}
      {user && stats && stats.totalClientes === 0 && (
        <div className="bg-blue-50 py-16 border-t border-blue-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Primeiros Passos
              </h2>
              <p className="text-slate-600">
                Siga este guia rápido para começar a usar a plataforma
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                  <h3 className="font-semibold text-slate-900">Cadastre um Cliente</h3>
                </div>
                <p className="text-slate-600 text-sm mb-4">
                  Comece adicionando sua primeira empresa/cliente ao sistema
                </p>
                <Link to={user ? createPageUrl('Clientes') : '#'}>
                  <Button size="sm" variant="outline" className="w-full">
                    Ir para Clientes
                  </Button>
                </Link>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                  <h3 className="font-semibold text-slate-900">Crie um Caso</h3>
                </div>
                <p className="text-slate-600 text-sm mb-4">
                  Crie um novo caso de revisão de estimativa ou habilitação
                </p>
                <Link to={user ? createPageUrl('Casos') : '#'}>
                  <Button size="sm" variant="outline" className="w-full">
                    Ir para Casos
                  </Button>
                </Link>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">3</div>
                  <h3 className="font-semibold text-slate-900">Envie Documentos</h3>
                </div>
                <p className="text-slate-600 text-sm mb-4">
                  Carregue os documentos necessários e comece a análise
                </p>
                <Button size="sm" variant="outline" className="w-full" disabled>
                  Criar Caso Primeiro
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}