import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import SugestaoProximaEtapa from './SugestaoProximaEtapa';

const statusColors = {
  pendente: 'bg-slate-100 text-slate-800 border-slate-300',
  em_progresso: 'bg-blue-100 text-blue-800 border-blue-300',
  concluida: 'bg-green-100 text-green-800 border-green-300',
  bloqueada: 'bg-red-100 text-red-800 border-red-300'
};

const statusIcons = {
  pendente: Circle,
  em_progresso: Clock,
  concluida: CheckCircle2,
  bloqueada: AlertCircle
};

export default function WorkflowGestao({ casoId, casoData }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState(null);
  const [novaEtapa, setNovaEtapa] = useState({
    nome: '',
    descricao: '',
    responsavel_email: '',
    data_inicio: '',
    documentos_requeridos: []
  });
  const queryClient = useQueryClient();

  // Buscar workflow do caso
  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', casoId],
    queryFn: async () => {
      const workflows = await base44.entities.CasoWorkflow.list();
      let casoWorkflow = workflows.find(w => w.caso_id === casoId);
      
      // Se não existe, criar workflow padrão baseado na hipótese
      if (!casoWorkflow) {
        const defaultWorkflow = criarWorkflowPadrao(casoData);
        await base44.entities.CasoWorkflow.create(defaultWorkflow);
        const updated = await base44.entities.CasoWorkflow.list();
        casoWorkflow = updated.find(w => w.caso_id === casoId);
      }
      
      return casoWorkflow;
    }
  });

  // Buscar tarefas do caso
  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas', casoId],
    queryFn: async () => {
      const allTarefas = await base44.entities.CasoTarefa.list();
      return allTarefas.filter(t => t.caso_id === casoId).sort((a, b) => {
        // Ordenar por prioridade e data de vencimento
        const prioridades = { critica: 0, alta: 1, media: 2, baixa: 3 };
        if (a.prioridade !== b.prioridade) {
          return prioridades[a.prioridade] - prioridades[b.prioridade];
        }
        return new Date(a.data_vencimento) - new Date(b.data_vencimento);
      });
    }
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async (data) => {
      if (editingEtapa) {
        // Atualizar etapa existente
        const etapas = workflow.etapas.map(e => 
          e.id === editingEtapa.id ? { ...e, ...novaEtapa } : e
        );
        return base44.entities.CasoWorkflow.update(workflow.id, { etapas });
      } else {
        // Adicionar nova etapa
        const newEtapa = {
          id: `etapa_${Date.now()}`,
          numero: (workflow.etapas?.length || 0) + 1,
          ...novaEtapa,
          status: 'pendente'
        };
        return base44.entities.CasoWorkflow.update(workflow.id, {
          etapas: [...(workflow.etapas || []), newEtapa]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', casoId] });
      setDialogOpen(false);
      setEditingEtapa(null);
      setNovaEtapa({
        nome: '',
        descricao: '',
        responsavel_email: '',
        data_inicio: '',
        documentos_requeridos: []
      });
    }
  });

  const atualizarStatusEtapaMutation = useMutation({
    mutationFn: async (etapaId, newStatus) => {
      const etapas = workflow.etapas.map(e => 
        e.id === etapaId ? { ...e, status: newStatus } : e
      );
      const progresso = calcularProgresso(etapas);
      return base44.entities.CasoWorkflow.update(workflow.id, { 
        etapas,
        progresso_percentual: progresso,
        etapa_atual_id: etapaId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', casoId] });
    }
  });

  const deletarEtapaMutation = useMutation({
    mutationFn: async (etapaId) => {
      const etapas = workflow.etapas.filter(e => e.id !== etapaId).map((e, idx) => ({
        ...e,
        numero: idx + 1
      }));
      return base44.entities.CasoWorkflow.update(workflow.id, { etapas });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', casoId] });
    }
  });

  const criarWorkflowPadrao = (caso) => {
    const etapasPadrao = {
      recursos_financeiros_livres: [
        { numero: 1, nome: 'Análise de Admissibilidade', descricao: 'Validar requisitos básicos' },
        { numero: 2, nome: 'Análise de Documentos', descricao: 'Revisar documentação apresentada' },
        { numero: 3, nome: 'Cálculo de Capacidade', descricao: 'Calcular capacidade financeira' },
        { numero: 4, nome: 'Validação Final', descricao: 'Revisão final antes de protocolo' },
        { numero: 5, nome: 'Protocolo e-CAC', descricao: 'Protocolamento junto à RFB' }
      ]
    };

    const etapas = etapasPadrao[caso?.hipotese_revisao] || etapasPadrao.recursos_financeiros_livres;

    return {
      caso_id: casoId,
      nome_workflow: `Workflow - ${caso?.numero_caso || 'Novo Caso'}`,
      tipo_hipotese: caso?.hipotese_revisao || 'generico',
      etapas: etapas.map(e => ({
        id: `etapa_${Date.now()}_${Math.random()}`,
        ...e,
        status: 'pendente',
        documentos_requeridos: [],
        criterios_conclusao: []
      })),
      progresso_percentual: 0,
      notificacoes_habilitadas: true
    };
  };

  const calcularProgresso = (etapas) => {
    if (!etapas || etapas.length === 0) return 0;
    const concluidas = etapas.filter(e => e.status === 'concluida').length;
    return Math.round((concluidas / etapas.length) * 100);
  };

  const handleAddEtapa = () => {
    setEditingEtapa(null);
    setNovaEtapa({
      nome: '',
      descricao: '',
      responsavel_email: '',
      data_inicio: '',
      documentos_requeridos: []
    });
    setDialogOpen(true);
  };

  const handleEditEtapa = (etapa) => {
    setEditingEtapa(etapa);
    setNovaEtapa({
      nome: etapa.nome,
      descricao: etapa.descricao,
      responsavel_email: etapa.responsavel_email,
      data_inicio: etapa.data_inicio,
      documentos_requeridos: etapa.documentos_requeridos || []
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  const etapas = workflow?.etapas || [];
  const progresso = workflow?.progresso_percentual || 0;

  return (
    <div className="space-y-6">
      {/* Barra de Progresso */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-900">Progresso do Workflow</span>
            <span className="text-sm font-bold text-blue-600">{progresso}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sugestão de Próxima Etapa */}
      <SugestaoProximaEtapa casoId={casoId} casoData={casoData} workflow={workflow} />

      {/* Etapas do Workflow */}
      <div className="space-y-3">
        {etapas.map((etapa, idx) => {
          const Icon = statusIcons[etapa.status];
          const isAtual = workflow.etapa_atual_id === etapa.id;

          return (
            <Card 
              key={etapa.id} 
              className={`border-0 shadow-sm transition-all ${isAtual ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 flex-shrink-0 mt-1 ${
                    etapa.status === 'concluida' ? 'text-green-600' :
                    etapa.status === 'em_progresso' ? 'text-blue-600' :
                    etapa.status === 'bloqueada' ? 'text-red-600' :
                    'text-slate-400'
                  }`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {idx + 1}. {etapa.nome}
                        </p>
                        {etapa.descricao && (
                          <p className="text-xs text-slate-600 mt-1">{etapa.descricao}</p>
                        )}
                      </div>
                      <Badge className={`${statusColors[etapa.status]} text-xs flex-shrink-0`}>
                        {etapa.status}
                      </Badge>
                    </div>

                    {/* Detalhes da Etapa */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                      {etapa.responsavel_email && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <User className="h-3 w-3" />
                          <span className="truncate">{etapa.responsavel_email}</span>
                        </div>
                      )}
                      {etapa.data_inicio && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Calendar className="h-3 w-3" />
                          {new Date(etapa.data_inicio).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      {etapa.documentos_requeridos?.length > 0 && (
                        <div className="text-slate-600">
                          {etapa.documentos_requeridos.length} doc{etapa.documentos_requeridos.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Tarefas da Etapa */}
                    {tarefas.filter(t => t.etapa_workflow_id === etapa.id).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                        {tarefas.filter(t => t.etapa_workflow_id === etapa.id).slice(0, 3).map(tarefa => (
                          <div key={tarefa.id} className="flex items-center gap-2 text-xs text-slate-600">
                            <div className={`h-2 w-2 rounded-full ${
                              tarefa.status === 'concluida' ? 'bg-green-500' :
                              tarefa.prioridade === 'critica' ? 'bg-red-500' :
                              tarefa.prioridade === 'alta' ? 'bg-orange-500' :
                              'bg-blue-500'
                            }`} />
                            {tarefa.titulo}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-1 flex-shrink-0">
                    {etapa.status !== 'concluida' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => atualizarStatusEtapaMutation.mutate(etapa.id, 
                          etapa.status === 'pendente' ? 'em_progresso' : 
                          etapa.status === 'em_progresso' ? 'concluida' : 
                          'em_progresso'
                        )}
                        disabled={atualizarStatusEtapaMutation.isPending}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => handleEditEtapa(etapa)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm('Deseja remover esta etapa?')) {
                          deletarEtapaMutation.mutate(etapa.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Botão Adicionar Etapa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            onClick={handleAddEtapa}
            variant="outline" 
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Etapa
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEtapa ? 'Editar Etapa' : 'Nova Etapa'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700">Nome *</label>
              <Input
                value={novaEtapa.nome}
                onChange={(e) => setNovaEtapa({...novaEtapa, nome: e.target.value})}
                placeholder="Nome da etapa"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Descrição</label>
              <Textarea
                value={novaEtapa.descricao}
                onChange={(e) => setNovaEtapa({...novaEtapa, descricao: e.target.value})}
                placeholder="Descrição detalhada"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Responsável (Email)</label>
              <Input
                value={novaEtapa.responsavel_email}
                onChange={(e) => setNovaEtapa({...novaEtapa, responsavel_email: e.target.value})}
                type="email"
                placeholder="responsavel@email.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Data de Início</label>
              <Input
                value={novaEtapa.data_inicio}
                onChange={(e) => setNovaEtapa({...novaEtapa, data_inicio: e.target.value})}
                type="date"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => updateWorkflowMutation.mutate()}
                disabled={!novaEtapa.nome || updateWorkflowMutation.isPending}
              >
                {updateWorkflowMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}