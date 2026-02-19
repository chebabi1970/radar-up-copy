import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Upload,
  List
} from 'lucide-react';
import { toast } from 'sonner';

import ChecklistTab from '@/components/caso/ChecklistTab';
import DocumentosTab from '@/components/caso/DocumentosTab';
import AnaliseTab from '@/components/caso/AnaliseTab';
import AnaliseCruzadaPanel from '@/components/caso/AnaliseCruzadaPanel';
import PrivacyWarning from '@/components/caso/PrivacyWarning';
import GerarPDFCaso from '@/components/caso/GerarPDFCaso';
import { Input } from "@/components/ui/input";

// Novos componentes implementados
import DashboardUnificado from '@/components/caso/DashboardUnificado';
import ProcessoWizard from '@/components/caso/ProcessoWizard';
import ChecklistDocumentos from '@/components/caso/ChecklistDocumentos';
import SmartUpload from '@/components/upload/SmartUpload';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';

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

  // Hook de análise automática
  const {
    analisando,
    progresso,
    resultados,
    executarAnalise,
    forcarAnalise
  } = useAutoAnalysis(casoId, documentos, cliente, {
    autoStart: true,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Privacy Warning */}
        <div className="mb-6">
          <PrivacyWarning />
        </div>

        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Link to={createPageUrl('Casos')}>
            <Button variant="ghost" className="mb-3 md:mb-4 text-slate-600 hover:text-slate-900 px-2 md:px-4 h-8 md:h-10">
              <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> <span className="hidden sm:inline">Voltar aos Casos</span><span className="sm:hidden">Voltar</span>
            </Button>
          </Link>

          <div className="flex flex-col gap-3 md:gap-4">
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
                <SelectTrigger className="w-full md:w-[200px] h-9 md:h-10 text-xs md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge className={`${statusColors[caso.status]} border text-xs md:text-sm py-1 md:py-1.5 px-2 md:px-3 flex-shrink-0`}>
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
          <DialogContent>
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
              >
                Não enviar
              </Button>
              <Button 
                onClick={() => confirmarAlteracao(true)}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enviar email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Summary Cards */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
           <Card className="border-0 shadow-md">
             <CardContent className="p-2.5 md:p-4">
               <div className="flex items-center gap-2 md:gap-3">
                 <div className="h-8 w-8 md:h-10 md:w-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                   <FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                 </div>
                 <div className="min-w-0">
                   <p className="text-xs md:text-sm text-slate-500">Documentos</p>
                   <p className="text-lg md:text-xl font-bold text-slate-900">{documentos.length}</p>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="border-0 shadow-md">
             <CardContent className="p-2.5 md:p-4">
               <div className="flex items-center gap-2 md:gap-3">
                 <div className="h-8 w-8 md:h-10 md:w-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                   <CheckSquare className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                 </div>
                 <div className="min-w-0">
                   <p className="text-xs md:text-sm text-slate-500">Checklist</p>
                   <p className="text-lg md:text-xl font-bold text-slate-900">{completedItems}/{checklistItems.length}</p>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="border-0 shadow-md">
             <CardContent className="p-2.5 md:p-4">
               <div className="flex items-center gap-2 md:gap-3">
                 <div className="h-8 w-8 md:h-10 md:w-10 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                   <CheckSquare className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
                 </div>
                 <div className="min-w-0">
                   <p className="text-xs md:text-sm text-slate-500">Pendentes</p>
                   <p className="text-lg md:text-xl font-bold text-slate-900">{pendingItems}</p>
                 </div>
               </div>
             </CardContent>
           </Card>

           <Card className="border-0 shadow-md">
             <CardContent className="p-2.5 md:p-4">
               <div className="flex items-center gap-2 md:gap-3">
                 <div className="h-8 w-8 md:h-10 md:w-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                   <Calculator className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                 </div>
                 <div className="min-w-0">
                   <p className="text-xs md:text-sm text-slate-500">Estimativa</p>
                   <p className="text-xs md:text-lg lg:text-xl font-bold text-slate-900 truncate">
                     {caso.estimativa_calculada && typeof caso.estimativa_calculada === 'number' && caso.estimativa_calculada > 0 
                       ? `R$ ${caso.estimativa_calculada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                       : 'Pendente'}
                   </p>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>

        {/* Tabs */}
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <Tabs defaultValue="dashboard" className="w-full">
            <CardHeader className="border-b border-slate-100 pb-0 px-3 md:px-6 py-3 md:py-4">
              <TabsList className="bg-transparent h-auto p-0 gap-0 sm:gap-2 overflow-x-auto pb-3 flex-nowrap">
                <TabsTrigger 
                  value="dashboard" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-2 md:px-3 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <LayoutDashboard className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Dash</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="wizard" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-2 md:px-3 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Guia</span>
                  <span className="sm:hidden">Guia</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="lista-docs" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-2 md:px-3 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <List className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Lista Docs</span>
                  <span className="sm:hidden">Lista</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="upload" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-2 md:px-3 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Upload</span>
                  <span className="sm:hidden">Up</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="checklist" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-2 md:px-3 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <CheckSquare className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Checklist</span>
                  <span className="sm:hidden">Check</span>
                  {pendingItems > 0 && (
                    <Badge className="ml-1 md:ml-2 bg-orange-100 text-orange-700 text-xs px-1.5">{pendingItems}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="documentos" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-2 md:px-3 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Documentos</span>
                  <span className="sm:hidden">Docs</span>
                </TabsTrigger>
                 <TabsTrigger 
                   value="cruzada" 
                   className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-2 md:px-3 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                 >
                   <Shield className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                   <span className="hidden lg:inline">Cruzada</span>
                   <span className="lg:hidden">Cruz</span>
                 </TabsTrigger>
                <TabsTrigger 
                  value="resumo" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-2 md:px-3 py-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <Calculator className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Resumo</span>
                  <span className="sm:hidden">Res</span>
                </TabsTrigger>
                  </TabsList>
            </CardHeader>

            <TabsContent value="dashboard" className="p-3 md:p-6 mt-0">
              <DashboardUnificado
                caso={caso}
                documentos={documentos}
                cliente={cliente}
                onAcaoClick={(acao) => {
                  if (acao === 'upload') {
                    // Mudar para aba de upload
                    document.querySelector('[value="upload"]')?.click();
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="wizard" className="p-3 md:p-6 mt-0">
              <ProcessoWizard
                caso={caso}
                documentos={documentos}
                analise={resultados}
                onEtapaClick={(etapaId) => {
                  if (etapaId === 'documentos') {
                    document.querySelector('[value="upload"]')?.click();
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="lista-docs" className="p-3 md:p-6 mt-0">
              <ChecklistDocumentos
                documentos={documentos}
                onUploadClick={(tipo) => {
                  // Mudar para aba de upload
                  document.querySelector('[value="upload"]')?.click();
                }}
                onViewClick={(tipo) => {
                  // Mudar para aba de documentos
                  document.querySelector('[value="documentos"]')?.click();
                }}
              />
            </TabsContent>

            <TabsContent value="upload" className="p-3 md:p-6 mt-0">
              <SmartUpload
                casoId={casoId}
                onUploadComplete={() => {
                  queryClient.invalidateQueries(['documentos', casoId]);
                }}
                triggerAnalise={executarAnalise}
              />
            </TabsContent>

            <TabsContent value="checklist" className="p-3 md:p-6 mt-0">
              <ChecklistTab casoId={casoId} checklistItems={checklistItems} documentos={documentos} cliente={cliente} />
            </TabsContent>

            <TabsContent value="documentos" className="p-3 md:p-6 mt-0">
              <DocumentosTab casoId={casoId} documentos={documentos} checklistItems={checklistItems} cliente={cliente} />
            </TabsContent>

            <TabsContent value="cruzada" className="p-3 md:p-6 mt-0">
              <AnaliseCruzadaPanel documentos={documentos} cliente={cliente} />
            </TabsContent>

            <TabsContent value="resumo" className="p-3 md:p-6 mt-0">
              <AnaliseTab caso={caso} cliente={cliente} documentos={documentos} />
            </TabsContent>
            </Tabs>
        </Card>
      </div>
    </div>
  );
}