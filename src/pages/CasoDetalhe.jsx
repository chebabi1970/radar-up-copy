import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  LayoutDashboard,
  Sparkles,
  Clock,
  BookOpen,
  Upload,
  FileText,
  Shield
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import DocumentosConsolidado from '@/components/caso/DocumentosConsolidado';
import AnaliseCruzadaPanel from '@/components/caso/AnaliseCruzadaPanel';
import PrivacyWarning from '@/components/caso/PrivacyWarning';
import GerarPDFCaso from '@/components/caso/GerarPDFCaso';

// Componentes modularizados
import CasoHeader from '@/components/caso/CasoHeader';
import CasoStats from '@/components/caso/CasoStats';

// Novos componentes implementados
import DashboardUnificado from '@/components/caso/DashboardUnificado';
import SeletorHipotese from '@/components/caso/SeletorHipotese';
import AtividadeTimeline from '@/components/caso/AtividadeTimeline';
import AnaliseIndividualTab from '@/components/caso/AnaliseIndividualTab';

import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import DocumentoPaginadoView from '@/components/caso/DocumentoPaginadoView';
import UploadInteligenteTab from '@/components/caso/UploadInteligenteTab';
import { logInfo, logError } from '@/components/utils/logger';

const hipoteseLabels = {
  recursos_financeiros_livres: "I - Recursos Financeiros de Livre Movimentação (Art. 4º)",
  fruicao_desoneracao_tributaria: "II - Fruição de Desonerações Tributárias (Art. 4º)",
  recolhimento_tributos_das: "III - Recolhimento Tributos - DAS (Art. 4º)",
  recolhimento_tributos_cprb: "IV - Recolhimento CPRB (Art. 4º)",
  retomada_atividades: "V - Retomada de Atividades (Art. 4º)",
  inicio_retomada_atividades_5anos: "Início/Retomada de Atividades há menos de 5 anos"
};

export default function CasoDetalhe() {
  const [casoId, setCasoId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id || id.trim() === '') {
      setCasoId(null);
      return;
    }
    setCasoId(id.trim());
    logInfo('Caso detalhado carregado', { casoId: id });
  }, [window.location.search]);

  const { data: caso, isLoading: casoLoading } = useQuery({
    queryKey: ['caso', casoId],
    queryFn: () => base44.entities.Caso.filter({ id: casoId }).then(res => res[0]),
    enabled: !!casoId
  });

  const { data: cliente } = useQuery({
     queryKey: ['cliente', caso?.cliente_id],
     queryFn: () => {
       if (!caso?.cliente_id) return null;
       return base44.entities.Cliente.filter({ id: caso.cliente_id }).then(res => res[0]);
     },
     enabled: !!caso?.cliente_id
   });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ['checklist', casoId],
    queryFn: () => base44.entities.ChecklistItem.filter({ caso_id: casoId }),
    enabled: !!casoId
  });

  const { data: documentos = [] } = useQuery({
    queryKey: ['documentos', casoId],
    queryFn: () => base44.entities.Documento.filter({ caso_id: casoId }),
    enabled: !!casoId
  });

  // Hook de análise automática (autoStart desabilitado - análise é feita pelo DashboardUnificado)
  const {
    executarAnalise,
    forcarAnalise
  } = useAutoAnalysis(casoId, documentos, cliente, {
    autoStart: false,
    notificar: true
  });

  // Mutation para mudar hipótese
  const updateHipoteseMutation = useMutation({
    mutationFn: async (novaHipotese) => {
      await base44.entities.Caso.update(casoId, { hipotese_revisao: novaHipotese });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', casoId] });
      toast.success('Hipótese atualizada com sucesso');
      logInfo('Hipótese atualizada', { casoId });
    },
    onError: (error) => {
      logError('Erro ao atualizar hipótese', error, { casoId });
      toast.error(`Erro ao atualizar hipótese: ${error.message}`);
    }
  });

  const handleMudarHipotese = (novaHipotese) => {
    updateHipoteseMutation.mutate(novaHipotese);
  };

  if (!casoId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Nenhum caso selecionado</p>
          <Link to={createPageUrl('Casos')}>
            <Button>Ver Casos</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (casoLoading || !caso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-3">
        {/* Privacy Warning */}
        <div className="mb-3">
          <PrivacyWarning />
        </div>

        {/* Header com navegação */}
        <div className="mb-3">
          <Link to={createPageUrl('Casos')}>
            <Button variant="ghost" className="mb-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-2 h-8 rounded-xl transition-all">
              <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> <span className="hidden sm:inline">Voltar aos Casos</span><span className="sm:hidden">Voltar</span>
            </Button>
          </Link>

          {/* Componente modularizado para header do caso */}
          <CasoHeader 
            caso={caso} 
            cliente={cliente} 
            hipoteseLabel={hipoteseLabels[caso.hipotese_revisao]}
            onStatusChange={() => queryClient.invalidateQueries({ queryKey: ['caso', casoId] })}
          />
        </div>

        {/* Componente modularizado para stats */}
        <CasoStats 
          documentos={documentos} 
          checklistItems={checklistItems} 
          caso={caso}
        />

        {/* Tabs */}
        <div className="rounded-xl border border-slate-100 bg-white shadow-lg shadow-slate-200/30 overflow-hidden">
          <Tabs defaultValue="dashboard" className="w-full">
            <div className="border-b border-slate-100 px-3 pt-2 pb-0">
              <TabsList className="bg-slate-100/80 rounded-xl p-1 h-auto gap-1 overflow-x-auto flex-nowrap w-full md:w-auto">
                <TabsTrigger
                  value="dashboard"
                  className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 text-slate-500 transition-all"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Dash</span>
                </TabsTrigger>

                <TabsTrigger
                  value="documentos"
                  className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 text-slate-500 transition-all"
                >
                  <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">Documentos</span>
                  <span className="sm:hidden">Docs</span>
                </TabsTrigger>

                <TabsTrigger
                  value="analise"
                  className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 text-slate-500 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">Análise</span>
                  <span className="sm:hidden">Anal.</span>
                </TabsTrigger>

                <TabsTrigger
                  value="cruzada"
                  className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 text-slate-500 transition-all"
                >
                  <Shield className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  <span className="hidden lg:inline">Cruzada</span>
                  <span className="lg:hidden">Cruz</span>
                </TabsTrigger>

                <TabsTrigger
                  value="atividade"
                  className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 text-slate-500 transition-all"
                >
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  <span className="hidden lg:inline">Atividade</span>
                  <span className="lg:hidden">Log</span>
                </TabsTrigger>

                <TabsTrigger
                  value="revisao"
                  className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 text-slate-500 transition-all"
                >
                  <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">Revisão</span>
                  <span className="sm:hidden">Rev.</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard" className="p-3 mt-0 max-h-[calc(100vh-220px)] overflow-y-auto">
              <div className="space-y-6">
                {/* Seletor de Hipótese */}
                <SeletorHipotese
                  hipoteseAtual={caso?.hipotese_revisao || 'I'}
                  onMudarHipotese={handleMudarHipotese}
                  bloqueado={caso?.status === 'protocolado' || caso?.status === 'deferido' || caso?.status === 'indeferido'}
                />
                
                {/* Dashboard Unificado */}
                <DashboardUnificado
                  caso={caso}
                  documentos={documentos}
                  cliente={cliente}
                  onAcaoClick={(acao) => {
                    if (acao === 'upload') {
                      document.querySelector('[value="documentos"]')?.click();
                    }
                  }}
                />
              </div>
            </TabsContent>







            <TabsContent value="documentos" className="p-3 mt-0 max-h-[calc(100vh-220px)] overflow-y-auto">
              <DocumentosConsolidado 
                caso={caso}
                documentos={documentos}
                onDocumentosChange={() => queryClient.invalidateQueries(['documentos', casoId])}
              />
            </TabsContent>

            <TabsContent value="analise" className="p-3 mt-0 max-h-[calc(100vh-220px)] overflow-y-auto">
              <AnaliseIndividualTab
                caso={caso}
                documentos={documentos}
                cliente={cliente}
                onDocumentosChange={() => queryClient.invalidateQueries(['documentos', casoId])}
              />
            </TabsContent>

            <TabsContent value="cruzada" className="p-3 mt-0 max-h-[calc(100vh-220px)] overflow-y-auto">
              <AnaliseCruzadaPanel documentos={documentos} cliente={cliente} />
            </TabsContent>

            <TabsContent value="atividade" className="p-3 mt-0 max-h-[calc(100vh-220px)] overflow-y-auto">
              <AtividadeTimeline casoId={casoId} documentos={documentos} caso={caso} />
            </TabsContent>

            <TabsContent value="revisao" className="p-3 mt-0 max-h-[calc(100vh-220px)] overflow-y-auto">
              <DocumentoPaginadoView
                documentos={documentos}
                caso={caso}
                cliente={cliente}
              />
            </TabsContent>

            <TabsContent value="upload_ia" className="p-3 mt-0 max-h-[calc(100vh-220px)] overflow-y-auto">
              <UploadInteligenteTab
                casoId={casoId}
                onDocumentosChange={() => queryClient.invalidateQueries(['documentos', casoId])}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}