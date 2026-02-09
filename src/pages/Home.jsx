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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 py-32">
          <div className="text-center mb-16">
            {/* Badge */}
            <Badge className="mb-6 bg-blue-600/30 text-blue-300 border border-blue-500 px-4 py-2">
              <Sparkles className="h-3 w-3 mr-2" />
              Powered by AI
            </Badge>

            <h1 className="text-7xl md:text-8xl font-black text-white mb-8 leading-tight">
              RevEstimativa
            </h1>
            <p className="text-2xl md:text-3xl text-blue-100 mb-6 font-light max-w-3xl mx-auto">
              Plataforma de IA para gestão de revisões de capacidade financeira
            </p>
            <p className="text-lg text-slate-300 mb-12 max-w-2xl mx-auto">
              Análise automática, conforme IN RFB 1984/2020 e Portaria Coana 72/2020
            </p>
            {user && (
              <p className="text-base text-blue-200 mb-8 font-medium">
                🎉 Bem-vindo, <strong>{user.full_name}</strong>
              </p>
            )}
          </div>

          {/* Stats Grid */}
           {stats && (
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
               <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-white shadow-2xl hover:shadow-3xl transition-shadow">
                 <div className="text-center">
                   <p className="text-5xl font-bold mb-2">{stats.totalClientes}</p>
                   <p className="text-blue-100 text-sm font-medium flex items-center justify-center gap-2">
                     <Users className="h-4 w-4" /> Clientes
                   </p>
                 </div>
               </div>

               <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 p-8 text-white shadow-2xl hover:shadow-3xl transition-shadow">
                 <div className="text-center">
                   <p className="text-5xl font-bold mb-2">{stats.totalCasos}</p>
                   <p className="text-purple-100 text-sm font-medium flex items-center justify-center gap-2">
                     <FileText className="h-4 w-4" /> Casos
                   </p>
                 </div>
               </div>

               <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-white shadow-2xl hover:shadow-3xl transition-shadow">
                 <div className="text-center">
                   <p className="text-5xl font-bold mb-2">{stats.casosAtivos}</p>
                   <p className="text-emerald-100 text-sm font-medium flex items-center justify-center gap-2">
                     <Rocket className="h-4 w-4" /> Ativos
                   </p>
                 </div>
               </div>

               <div className="rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 p-8 text-white shadow-2xl hover:shadow-3xl transition-shadow">
                 <div className="text-center">
                   <p className="text-5xl font-bold mb-2">{stats.documentosPendentes}</p>
                   <p className="text-amber-100 text-sm font-medium flex items-center justify-center gap-2">
                     <Clock className="h-4 w-4" /> Pendentes
                   </p>
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">
            Funcionalidades Poderosas
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Tudo o que você precisa para gerenciar revisões de habilitação em um único lugar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {features.map((feature, idx) => (
              <div key={idx} className="group relative rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-8 border border-slate-600/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/10 group-hover:to-purple-600/10 rounded-2xl transition-all duration-300" />
                <div className="relative">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 w-fit mb-6 group-hover:from-blue-500/40 group-hover:to-purple-500/40 transition-all">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {feature.descricao}
                  </p>
                </div>
              </div>
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