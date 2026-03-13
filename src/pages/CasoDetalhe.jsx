import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft,
  Building2,
  FileText,
  CheckSquare,
  AlertTriangle,
  Loader2,
  Calculator,
  Shield,
  Edit2,
  Check,
  X,
  LayoutDashboard,
  Sparkles,
  Clock,
  BookOpen,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

import DocumentosConsolidado from '@/components/caso/DocumentosConsolidado';
import AnaliseCruzadaPanel from '@/components/caso/AnaliseCruzadaPanel';
import PrivacyWarning from '@/components/caso/PrivacyWarning';
import GerarPDFCaso from '@/components/caso/GerarPDFCaso';
import { Input } from "@/components/ui/input";

// Novos componentes implementados
import DashboardUnificado from '@/components/caso/DashboardUnificado';
import SeletorHipotese from '@/components/caso/SeletorHipotese';
import AtividadeTimeline from '@/components/caso/AtividadeTimeline';
import AnaliseIndividualTab from '@/components/caso/AnaliseIndividualTab';

import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import DocumentoPaginadoView from '@/components/caso/DocumentoPaginadoView';
import UploadInteligenteTab from '@/components/caso/UploadInteligenteTab';

const statusColors = {
  novo: "bg-blue-100 text-blue-800 border-blue-200",
  em_analise: "bg-yellow-100 text-yellow-800 border-yellow-200",
  aguardando_documentos: "bg-orange-100 text-orange-800 border-orange-200",
  documentacao_completa: "bg-green-100 text-green-800 border-green-200",
  protocolado: "bg-purple-100 text-purple-800 border-purple-200",
  deferido: "bg-emerald-100 text-emerald-800 border-emerald-200",
  indeferido: "bg-red-100 text-red-800 border-red-200",
  arquivado: "bg-gray-100 text-gray-800 border-gray-200"
};

const statusLabels = {
  novo: "Novo",
  em_analise: "Em Análise",
  aguardando_documentos: "Aguardando Documentos",
  documentacao_completa: "Documentação Completa",
  protocolado: "Protocolado",
  deferido: "Deferido",
  indeferido: "Indeferido",
  arquivado: "Arquivado"
};

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
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [dialogEmail, setDialogEmail] = useState(false);
  const [novoStatus, setNovoStatus] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id || id.trim() === '') {
      setCasoId(null);
      return;
    }
    setCasoId(id.trim());
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ newStatus, enviarEmail }) => {
      // Validar transição de estado
      const transicoes_validas = {
        novo: ['em_analise', 'aguardando_documentos'],
        em_analise: ['aguardando_documentos', 'documentacao_completa'],
        aguardando_documentos: ['em_analise', 'documentacao_completa'],
        documentacao_completa: ['protocolado', 'indeferido'],
        protocolado: ['deferido', 'indeferido', 'arquivado'],
        deferido: ['arquivado'],
        indeferido: ['arquivado'],
        arquivado: []
      };

      if (!transicoes_validas[caso.status]?.includes(newStatus)) {
        throw new Error(`Transição inválida de ${statusLabels[caso.status]} para ${statusLabels[newStatus]}`);
      }

      await base44.entities.Caso.update(casoId, { status: newStatus });
      
      // Enviar email se autorizado
      if (enviarEmail && cliente?.email) {
         try {
           await base44.integrations.Core.SendEmail({
             to: cliente.email,
             subject: `Status do Caso ${caso.numero_caso || casoId.slice(0, 8)} Atualizado`,
             body: `<h2>Atualização de Status</h2><p>Olá,</p><p>O status do seu caso <strong>${caso.numero_caso || `#${casoId.slice(0, 8)}`}</strong> foi atualizado para:</p><h3 style="color: #3b82f6;">${statusLabels[newStatus]}</h3><p><strong>Cliente:</strong> ${cliente.razao_social}<br/><strong>CNPJ:</strong> ${cliente.cnpj}</p><p>Para mais detalhes, acesse o sistema RevEstimativa.</p><p>Atenciosamente,<br/>Equipe RevEstimativa</p>`
           });
           toast.success('Email enviado com sucesso');
         } catch (error) {
           console.error('Erro ao enviar email:', error);
           toast.error('Erro ao enviar email de notificação');
         }
       }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', casoId] });
      setDialogEmail(false);
      setNovoStatus(null);
      toast.success('Status atualizado');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  });

  // Mutation para mudar hipótese
  const updateHipoteseMutation = useMutation({
    mutationFn: async (novaHipotese) => {
      await base44.entities.Caso.update(casoId, { hipotese_revisao: novaHipotese });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', casoId] });
      toast.success('Hipótese atualizada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar hipótese: ${error.message}`);
    }
  });

  const handleMudarHipotese = (novaHipotese) => {
    updateHipoteseMutation.mutate(novaHipotese);
  };

  const handleStatusChange = (value) => {
    setNovoStatus(value);
    setDialogEmail(true);
  };

  const confirmarAlteracao = (enviarEmail) => {
    updateStatusMutation.mutate({ newStatus: novoStatus, enviarEmail });
  };

  const updateNomeMutation = useMutation({
    mutationFn: (newNome) => base44.entities.Caso.update(casoId, { numero_caso: newNome }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caso', casoId] });
      setEditandoNome(false);
    }
  });

  const handleSalvarNome = () => {
    if (novoNome.trim()) {
      updateNomeMutation.mutate(novoNome.trim());
    }
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

  const pendingItems = checklistItems.filter(i => i.status === 'pendente').length;
  const completedItems = checklistItems.filter(i => i.status !== 'pendente').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-3">
        {/* Privacy Warning */}
        <div className="mb-3">
          <PrivacyWarning />
        </div>

        {/* Header */}
        <div className="mb-3">
          <Link to={createPageUrl('Casos')}>
            <Button variant="ghost" className="mb-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-2 h-8 rounded-xl transition-all">
              <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> <span className="hidden sm:inline">Voltar aos Casos</span><span className="sm:hidden">Voltar</span>
            </Button>
          </Link>

          <div className="flex flex-col gap-2">
            <div className="flex-1">
              {editandoNome ? (
                <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4">
                  <Input
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Digite o nome do caso"
                    className="text-xl md:text-3xl font-bold h-9 md:h-10"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSalvarNome}
                    disabled={updateNomeMutation.isPending}
                    className="h-9 w-9 md:h-10 md:w-10"
                  >
                    <Check className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditandoNome(false)}
                    className="h-9 w-9 md:h-10 md:w-10"
                  >
                    <X className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 flex-wrap">
                  <h1 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight break-words">
                    {caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`}
                  </h1>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-600 h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
                    onClick={() => {
                      setNovoNome(caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`);
                      setEditandoNome(true);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2 flex-wrap">
                <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400 flex-shrink-0" />
                <span className="text-xs md:text-sm text-slate-600 break-words">{cliente?.razao_social}</span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1 md:mt-1.5 line-clamp-2">
                {hipoteseLabels[caso.hipotese_revisao]}
              </p>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <Select
                value={caso.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-full md:w-[200px] h-9 md:h-10 text-xs md:text-sm rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge className={`${statusColors[caso.status]} border text-xs md:text-sm py-1 md:py-1.5 px-2.5 md:px-3 flex-shrink-0 rounded-lg font-medium`}>
                {statusLabels[caso.status]}
              </Badge>
              <GerarPDFCaso 
                caso={caso} 
                cliente={cliente} 
                documentos={documentos} 
                checklist={checklistItems} 
              />
            </div>
          </div>
        </div>

        {/* Dialog de confirmação de email */}
        <Dialog open={dialogEmail} onOpenChange={setDialogEmail}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Notificar Cliente?</DialogTitle>
              <DialogDescription>
                Deseja enviar um email para <strong>{cliente?.email}</strong> notificando sobre a mudança de status para <strong>{statusLabels[novoStatus]}</strong>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => confirmarAlteracao(false)}
                disabled={updateStatusMutation.isPending}
                className="rounded-xl"
              >
                Não enviar
              </Button>
              <Button
                onClick={() => confirmarAlteracao(true)}
                disabled={updateStatusMutation.isPending}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
              >
                {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enviar email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {[
            { icon: FileText, label: 'Documentos', value: documentos.length, color: 'blue', gradient: 'from-blue-500 to-indigo-600' },
            { icon: CheckSquare, label: 'Checklist', value: `${completedItems}/${checklistItems.length}`, color: 'emerald', gradient: 'from-emerald-500 to-teal-600' },
            { icon: AlertTriangle, label: 'Pendentes', value: pendingItems, color: 'amber', gradient: 'from-amber-500 to-orange-600' },
            { icon: Calculator, label: 'Estimativa', value: caso.estimativa_calculada && typeof caso.estimativa_calculada === 'number' && caso.estimativa_calculada > 0
              ? `R$ ${caso.estimativa_calculada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : 'Pendente', color: 'violet', gradient: 'from-violet-500 to-purple-600' }
          ].map((card, idx) => (
            <div key={idx} className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-2.5 transition-all hover:shadow-lg hover:shadow-slate-100/50 hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-slate-50/80 to-transparent rounded-full -translate-y-1/3 translate-x-1/3 group-hover:from-slate-100/80 transition-colors" />
              <div className="relative flex items-center gap-2 md:gap-3">
                <div className={`h-9 w-9 md:h-11 md:w-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center flex-shrink-0 shadow-lg shadow-${card.color}-200/50`}>
                  <card.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <p className="text-lg md:text-xl font-bold text-slate-900 truncate">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

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

                <TabsTrigger
                  value="upload_ia"
                  className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0 text-slate-500 transition-all"
                >
                  <Upload className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">Upload IA</span>
                  <span className="sm:hidden">IA</span>
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

            <TabsContent value="analise" className="p-3 md:p-6 mt-0 max-h-[calc(100vh-280px)] overflow-y-auto">
              <AnaliseIndividualTab
                caso={caso}
                documentos={documentos}
                cliente={cliente}
                onDocumentosChange={() => queryClient.invalidateQueries(['documentos', casoId])}
              />
            </TabsContent>

            <TabsContent value="cruzada" className="p-3 md:p-6 mt-0 max-h-[calc(100vh-280px)] overflow-y-auto">
              <AnaliseCruzadaPanel documentos={documentos} cliente={cliente} />
            </TabsContent>

            <TabsContent value="atividade" className="p-3 md:p-6 mt-0 max-h-[calc(100vh-280px)] overflow-y-auto">
              <AtividadeTimeline casoId={casoId} documentos={documentos} caso={caso} />
            </TabsContent>

            <TabsContent value="revisao" className="p-3 md:p-6 mt-0 max-h-[calc(100vh-280px)] overflow-y-auto">
              <DocumentoPaginadoView
                documentos={documentos}
                caso={caso}
                cliente={cliente}
              />
            </TabsContent>

            <TabsContent value="upload_ia" className="p-3 md:p-6 mt-0 max-h-[calc(100vh-280px)] overflow-y-auto">
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