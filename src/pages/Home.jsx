import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
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
  Clock,
  Rocket,
  Plus,
  FolderOpen } from
'lucide-react';

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
          casosAtivos: casos.filter((c) => ['em_analise', 'aguardando_documentos', 'protocolado'].includes(c.status)).length,
          documentosPendentes: documentos.filter((d) => d.status_analise === 'pendente').length
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
  }];


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
    descricao: "Análise automatizada com validação de documentos e cálculos"
  },
  {
    icon: <CheckCircle2 className="h-6 w-6" />,
    titulo: "Conformidade",
    descricao: "Siga todas as normas IN 1984/2020 e Portaria Coana 72/2020"
  }];


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="mx-auto my-1 px-6 py-32 relative max-w-6xl">
          <div className="text-center mb-16">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69837481d21b7c5da35b451b/71a683b7b_Designsemnome10.png" alt="Radar UP" className="h-56 w-56 object-contain" />
            </div>

            {/* Badge */}
            <Badge className="mb-6 bg-blue-600/30 text-blue-300 border border-blue-500 px-4 py-2">
              <Sparkles className="h-3 w-3 mr-2" />
              Powered by AI
            </Badge>

            <h1 className="text-7xl md:text-8xl font-black text-white mb-8 leading-tight">
              RADAR UP
            </h1>
            <p className="text-2xl md:text-3xl text-blue-100 mb-6 font-light max-w-3xl mx-auto">
              Plataforma de IA para gestão de revisões de capacidade financeira
            </p>
            <p className="text-lg text-slate-300 mb-12 max-w-2xl mx-auto">
              Análise automática, conforme IN RFB 1984/2020 e Portaria Coana 72/2020
            </p>
            {user &&
            <p className="text-base text-blue-200 mb-8 font-medium">
                🎉 Bem-vindo, <strong>{user.full_name}</strong>
              </p>
            }
          </div>

          {/* Stats Grid */}
           {stats &&
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            <div className="rounded-2xl bg-white/10 border border-white/20 p-6 text-center">
              <div className="text-4xl font-black text-white mb-1">{stats.totalClientes}</div>
              <div className="text-sm text-blue-200 font-medium">Clientes</div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/20 p-6 text-center">
              <div className="text-4xl font-black text-white mb-1">{stats.totalCasos}</div>
              <div className="text-sm text-blue-200 font-medium">Casos</div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/20 p-6 text-center">
              <div className="text-4xl font-black text-white mb-1">{stats.casosAtivos}</div>
              <div className="text-sm text-blue-200 font-medium">Casos Ativos</div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/20 p-6 text-center">
              <div className="text-4xl font-black text-white mb-1">{stats.documentosPendentes}</div>
              <div className="text-sm text-blue-200 font-medium">Docs Pendentes</div>
            </div>
             </div>
          }
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-0">
        <div className="text-center mb-4">
          <h2 className="text-5xl font-bold text-white mb-6">
            Funcionalidades Poderosas
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Tudo o que você precisa para gerenciar revisões de habilitação em um único lugar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {features.map((feature, idx) =>
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
          )}
        </div>
      </div>

      {/* Highlights Section */}
      <div className="py-12 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-6">
              Por que escolher RADAR UP?
            </h2>
            <p className="text-xl text-slate-300">Desenvolvido por especialistas em conformidade RFB</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {highlights.map((item, idx) =>
            <div key={idx} className="group relative rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-8 border border-slate-600/50 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/0 to-teal-600/0 group-hover:from-emerald-600/10 group-hover:to-teal-600/10 rounded-2xl transition-all duration-300" />
                <div className="relative flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 flex-shrink-0 group-hover:from-emerald-500/40 group-hover:to-teal-500/40 transition-all">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 text-lg">
                      {item.titulo}
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {item.descricao}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="relative rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 p-12 md:p-20 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          </div>
          <div className="relative text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Pronto para transformar sua gestão?
            </h2>
            <p className="text-lg text-blue-50 mb-10 max-w-2xl mx-auto">
              Crie seu primeiro caso e comece a utilizar IA para análise automática de documentos
            </p>
            {user ?
            <Link to={createPageUrl('Casos')}>
                <Button size="lg" className="bg-white text-blue-600 hover:bg-slate-50 shadow-lg hover:shadow-xl text-base px-8">
                  Criar Novo Caso
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link> :

            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-slate-50 shadow-lg hover:shadow-xl text-base px-8"
              onClick={() => base44.auth.redirectToLogin()}>

                Fazer Login
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            }
          </div>
        </div>
      </div>

      {/* Quick Actions — only for logged-in users with existing data */}
      {user && stats && stats.totalCasos > 0 &&
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="rounded-2xl bg-white/10 border border-white/20 p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-300" />
            Acesso Rápido
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link to={createPageUrl('Casos')}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Novo Caso
              </Button>
            </Link>
            <Link to={createPageUrl('Casos')}>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <FolderOpen className="h-4 w-4 mr-2" />
                Casos Ativos ({stats.casosAtivos})
              </Button>
            </Link>
            <Link to={createPageUrl('Clientes')}>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Users className="h-4 w-4 mr-2" />
                Clientes ({stats.totalClientes})
              </Button>
            </Link>
            {stats.documentosPendentes > 0 &&
            <Link to={createPageUrl('Casos')}>
              <Button variant="outline" className="border-orange-400/50 text-orange-300 hover:bg-orange-500/10">
                <Clock className="h-4 w-4 mr-2" />
                {stats.documentosPendentes} Doc{stats.documentosPendentes !== 1 ? 's' : ''} Pendente{stats.documentosPendentes !== 1 ? 's' : ''}
              </Button>
            </Link>
            }
          </div>
        </div>
      </div>
      }

      {/* Onboarding Section */}
      {user && stats && stats.totalClientes === 0 &&
      <div className="py-20 border-t border-slate-700">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold text-white mb-6">
                Comece em 3 passos simples
              </h2>
              <p className="text-xl text-slate-300">
                Seu primeiro caso em menos de 5 minutos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-700/20 p-8 border border-blue-500/30 hover:border-blue-500/60 transition-all hover:shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">1</div>
                  <h3 className="font-bold text-white text-lg">Cadastre um Cliente</h3>
                </div>
                <p className="text-slate-200 text-sm mb-6 leading-relaxed">
                  Adicione sua primeira empresa ao sistema com alguns cliques
                </p>
                <Link to={user ? createPageUrl('Clientes') : '#'} className="block">
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Ir para Clientes
                  </Button>
                </Link>
              </div>

              <div className="relative rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-700/20 p-8 border border-purple-500/30 hover:border-purple-500/60 transition-all hover:shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">2</div>
                  <h3 className="font-bold text-white text-lg">Crie um Caso</h3>
                </div>
                <p className="text-slate-200 text-sm mb-6 leading-relaxed">
                  Inicie um novo caso de revisão de estimativa ou habilitação
                </p>
                <Link to={user ? createPageUrl('Casos') : '#'} className="block">
                  <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    Ir para Casos
                  </Button>
                </Link>
              </div>

              <div className="relative rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 p-8 border border-emerald-500/30 hover:border-emerald-500/60 transition-all hover:shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">3</div>
                  <h3 className="font-bold text-white text-lg">Envie Documentos</h3>
                </div>
                <p className="text-slate-200 text-sm mb-6 leading-relaxed">
                  Carregue documentos e ative análise automática com IA
                </p>
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled>
                  Criar Caso Primeiro
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  );
}