import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const statusConfig = {
  novo: { label: 'Novo', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  em_analise: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  resolvido: { label: 'Resolvido', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  ignorado: { label: 'Ignorado', color: 'bg-gray-100 text-gray-800', icon: Trash2 }
};

const prioridadeConfig = {
  baixa: { label: 'Baixa', color: 'bg-slate-100 text-slate-700' },
  media: { label: 'Média', color: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  critica: { label: 'Crítica', color: 'bg-red-100 text-red-700' }
};

export default function Reports() {
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media',
    usuario_email: '',
    pagina_origem: ''
  });
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => base44.entities.ReportErro.list('-created_date')
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ReportErro.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Status atualizado');
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => base44.entities.ReportErro.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report excluído');
    }
  });

  const createReportMutation = useMutation({
    mutationFn: (data) => base44.entities.ReportErro.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report criado com sucesso');
      setOpenDialog(false);
      setFormData({ titulo: '', descricao: '', prioridade: 'media', usuario_email: '', pagina_origem: '' });
    }
  });

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!formData.descricao.trim() || !formData.usuario_email.trim()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    createReportMutation.mutate(formData);
  };

  const reportsFiltrados = filtroStatus === 'todos' 
    ? reports 
    : reports.filter(r => r.status === filtroStatus);

  const stats = {
    total: reports.length,
    novos: reports.filter(r => r.status === 'novo').length,
    em_analise: reports.filter(r => r.status === 'em_analise').length,
    resolvidos: reports.filter(r => r.status === 'resolvido').length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-slate-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reports de Erros</h1>
            <p className="text-slate-600 mt-1">Gerencie os erros reportados</p>
          </div>
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Report
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Novos</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.novos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Em Análise</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.em_analise}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Resolvidos</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.resolvidos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="novo">Novos</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="resolvido">Resolvidos</SelectItem>
              <SelectItem value="ignorado">Ignorados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Reports */}
        <div className="space-y-4">
          {reportsFiltrados.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum report encontrado</p>
              </CardContent>
            </Card>
          ) : (
            reportsFiltrados.map((report) => {
              const StatusIcon = statusConfig[report.status].icon;
              
              return (
                <Card key={report.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={statusConfig[report.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[report.status].label}
                          </Badge>
                          <Badge className={prioridadeConfig[report.prioridade].color}>
                            {prioridadeConfig[report.prioridade].label}
                          </Badge>
                        </div>
                        
                        {report.titulo && (
                          <CardTitle className="text-lg mb-1">{report.titulo}</CardTitle>
                        )}
                        
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span>{report.usuario_email}</span>
                          <span>•</span>
                          <span>{moment(report.created_date).format('DD/MM/YYYY HH:mm')}</span>
                          {report.pagina_origem && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600">{report.pagina_origem}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Deseja excluir este report?')) {
                            deleteReportMutation.mutate(report.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-slate-700 mb-4 whitespace-pre-wrap">{report.descricao}</p>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Alterar status:</span>
                      <Select
                        value={report.status}
                        onValueChange={(value) => 
                          updateStatusMutation.mutate({ id: report.id, status: value })
                        }
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="novo">Novo</SelectItem>
                          <SelectItem value="em_analise">Em Análise</SelectItem>
                          <SelectItem value="resolvido">Resolvido</SelectItem>
                          <SelectItem value="ignorado">Ignorado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Dialog Novo Report */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Report</DialogTitle>
              <DialogDescription>
                Registre um erro ou problema reportado por usuário
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <Label htmlFor="usuario_email">Email do Usuário *</Label>
                <Input
                  id="usuario_email"
                  value={formData.usuario_email}
                  onChange={(e) => setFormData({ ...formData, usuario_email: e.target.value })}
                  placeholder="usuario@exemplo.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Erro ao salvar documento"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o problema"
                  className="h-24"
                  required
                />
              </div>

              <div>
                <Label htmlFor="pagina_origem">Página</Label>
                <Input
                  id="pagina_origem"
                  value={formData.pagina_origem}
                  onChange={(e) => setFormData({ ...formData, pagina_origem: e.target.value })}
                  placeholder="Ex: /casos"
                />
              </div>

              <div>
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createReportMutation.isPending}>
                  {createReportMutation.isPending ? 'Criando...' : 'Criar Report'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}