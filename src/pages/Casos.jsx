import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  FolderOpen,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  Filter,
  Trash2,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
// Imports de date-fns removidos (não utilizados)

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
  recursos_financeiros_livres: "Recursos Financeiros de Livre Movimentação (Art. 4º, I)",
  fruicao_desoneracao_tributaria: "Fruição de Desonerações Tributárias (Art. 4º, II)",
  recolhimento_tributos_das: "Recolhimento Tributos - DAS (Art. 4º, III)",
  recolhimento_tributos_cprb: "Recolhimento Tributos - CPRB (Art. 4º, IV)",
  retomada_atividades: "Retomada de Atividades (Art. 4º, V)",
  inicio_retomada_atividades_5anos: "Início/Retomada de Atividades há menos de 5 anos"
};

export default function Casos() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    cliente_id: '',
    numero_caso: '',
    hipotese_revisao: '',
    modalidade_pretendida: '',
    limite_pretendido: '',
    observacoes: '',
    numero_processo_ecac: '',
    data_protocolo_ecac: ''
  });

  const queryClient = useQueryClient();

  // Get cliente from URL params (atualiza quando URL muda)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get('cliente') || '';
    setFormData(prev => ({ ...prev, cliente_id: clienteId }));
  }, [window.location.search]);

  const { data: casos = [], isLoading } = useQuery({
    queryKey: ['casos'],
    queryFn: () => base44.entities.Caso.list('-created_date')
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      try {
        const caso = await base44.entities.Caso.create(data);
        try {
          // Auto-generate checklist items based on hipotese
          await generateChecklist(caso.id, data.hipotese_revisao);
        } catch (checklistError) {
          console.error('Erro ao gerar checklist para caso:', caso.id, checklistError);
          // Delete caso se checklist falhar (rollback)
          await base44.entities.Caso.delete(caso.id);
          throw new Error('Falha ao gerar checklist. Caso revertido.');
        }
        return caso;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casos'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao criar caso: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      try {
        const docs = await base44.entities.Documento.filter({ caso_id: id });
        const checklist = await base44.entities.ChecklistItem.filter({ caso_id: id });
        
        // Deletar documentos
        for (const d of docs) {
          try {
            await base44.entities.Documento.delete(d.id);
          } catch (err) {
            console.error(`Erro ao deletar documento ${d.id}:`, err);
            throw err;
          }
        }
        
        // Deletar checklist
        for (const c of checklist) {
          try {
            await base44.entities.ChecklistItem.delete(c.id);
          } catch (err) {
            console.error(`Erro ao deletar checklist ${c.id}:`, err);
            throw err;
          }
        }
        
        // Finalmente deletar caso
        return base44.entities.Caso.delete(id);
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casos'] });
      toast.success('Caso deletado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao deletar caso: ${error.message}`);
    }
  });

  const generateChecklist = async (casoId, hipotese) => {
     const items = [
       { codigo_dda: "1100", tipo_documento: "requerimento_das", descricao: "Requerimento Disponibilidade Ativo Circulante", base_legal: "Art. 5º", obrigatorio: true },
       { codigo_dda: "2100", tipo_documento: "documento_identificacao_responsavel", descricao: "Documento de identificação do responsável", base_legal: "Art. 5º, § 2º", obrigatorio: true },
       { codigo_dda: "2110", tipo_documento: "procuracao", descricao: "Procuração", base_legal: "Art. 5º, § 3º", obrigatorio: false },
       { codigo_dda: "2120", tipo_documento: "documento_identificacao_procurador", descricao: "Documento de identificação do procurador", base_legal: "Art. 5º, § 3º", obrigatorio: false },
       { codigo_dda: "3100", tipo_documento: "contrato_social", descricao: "Contrato Social e Alterações", base_legal: "Art. 7º, I", obrigatorio: true },
       { codigo_dda: "3110", tipo_documento: "certidao_junta_comercial", descricao: "Certidão Junta Comercial", base_legal: "Art. 7º, I", obrigatorio: true },
       { codigo_dda: "4100", tipo_documento: "conta_energia", descricao: "Conta de energia dos últimos 3 meses", base_legal: "Art. 7º, III", obrigatorio: true },
       { codigo_dda: "4110", tipo_documento: "plano_internet", descricao: "Plano de internet dos últimos 3 meses", base_legal: "Art. 7º, III", obrigatorio: true },
       { codigo_dda: "3120", tipo_documento: "guia_iptu", descricao: "Guia de IPTU", base_legal: "Art. 7º, IV, a", obrigatorio: false },
       { codigo_dda: "3130", tipo_documento: "escritura_imovel", descricao: "Escritura do imóvel", base_legal: "Art. 7º, IV, b", obrigatorio: false },
       { codigo_dda: "3140", tipo_documento: "contrato_locacao", descricao: "Contrato de locação e pagamentos dos últimos 3 meses", base_legal: "Art. 7º, IV, c", obrigatorio: false },
       { codigo_dda: "3150", tipo_documento: "comprovante_espaco_armazenamento", descricao: "Comprovante Espaço Armazenagem", base_legal: "Art. 7º, V", obrigatorio: false },
       { codigo_dda: "5100", tipo_documento: "extrato_bancario_corrente", descricao: "Extratos Bancários dos últimos 3 meses", base_legal: "Art. 6º, I, a", obrigatorio: true },
       { codigo_dda: "6100", tipo_documento: "balancete_verificacao", descricao: "Balancete de Verificação dos últimos 3 meses", base_legal: "Art. 6º, I, b", obrigatorio: true },
       { codigo_dda: "5110", tipo_documento: "comprovante_transferencia_integralizacao", descricao: "Comprovante de transferência de recursos", base_legal: "Art. 6º, I, c", obrigatorio: false },
       { codigo_dda: "5130", tipo_documento: "contrato_mutuo", descricao: "Contrato de Empréstimo Bancário", base_legal: "Art. 6º, I, d", obrigatorio: false },
       { codigo_dda: "5120", tipo_documento: "contrato_mutuo", descricao: "Contrato de Mútuo Registrado em Cartório", base_legal: "Art. 6º, I, e", obrigatorio: false },
       { codigo_dda: "2130", tipo_documento: "contrato_social", descricao: "Contrato Social do Mutuante", base_legal: "Art. 6º, § 3º, I", obrigatorio: false },
       { codigo_dda: "6110", tipo_documento: "balancete_mutuante", descricao: "Balancete de verificação do Mutuante PJ - 3 meses antecedentes ao aporte", base_legal: "Art. 6º, § 3º, II", obrigatorio: false },
       { codigo_dda: "5140", tipo_documento: "comprovante_iof", descricao: "Comprovante Recolhimento IOF Contrato Mútuo PJ", base_legal: "Art. 6º, § 3º, III", obrigatorio: false },
       { codigo_dda: "5150", tipo_documento: "extrato_bancario_integralizacao", descricao: "Extratos Bancários no mês do aporte", base_legal: "Art. 7º, II, a", obrigatorio: false },
       { codigo_dda: "6120", tipo_documento: "balanco_patrimonial_integralizacao", descricao: "Balanço Patrimonial - Integralização ou Aumento Capital Social", base_legal: "Art. 7º, II, b", obrigatorio: false },
       { codigo_dda: "5160", tipo_documento: "comprovante_transferencia_integralizacao", descricao: "Comprovante de transferência de recursos", base_legal: "Art. 7º, II, c", obrigatorio: false },
     ];

     for (const item of items) {
       await base44.entities.ChecklistItem.create({
         caso_id: casoId,
         codigo_dda: item.codigo_dda,
         tipo_documento: item.tipo_documento,
         descricao: item.descricao,
         base_legal: item.base_legal,
         obrigatorio: item.obrigatorio,
         aplicavel_hipotese: [hipotese],
         status: 'pendente'
       });
     }
   };

  const resetForm = () => {
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get('cliente') || '';
    setFormData({
      cliente_id: clienteId,
      numero_caso: '',
      hipotese_revisao: '',
      modalidade_pretendida: '',
      limite_pretendido: '',
      observacoes: '',
      numero_processo_ecac: '',
      data_protocolo_ecac: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validar cliente selecionado
    if (!formData.cliente_id.trim()) {
      toast.error('Selecione um cliente');
      return;
    }

    // Validar e limpar limite pretendido
    let limitePretendido = null;
    if (formData.limite_pretendido.trim()) {
      const parsed = parseFloat(formData.limite_pretendido);
      if (isNaN(parsed) || parsed < 0) {
        toast.error('Limite pretendido deve ser um número positivo');
        return;
      }
      limitePretendido = parsed;
    }

    // Calcular prazo de análise baseado em hipótese (Art. 14: 15 dias | Art. 15: 30 dias)
    let prazoAnalise = null;
    if (formData.data_protocolo_ecac) {
      const dataProtocolo = new Date(formData.data_protocolo_ecac);
      // Validar se data não é no futuro
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (dataProtocolo > hoje) {
        toast.error('Data de protocolo não pode ser no futuro');
        return;
      }
      
      // Art. 14 vs 15: usando 30 dias como padrão (pode ser refinado)
      dataProtocolo.setDate(dataProtocolo.getDate() + 30);
      prazoAnalise = dataProtocolo.toISOString().split('T')[0];
    }

    const data = {
      ...formData,
      cliente_id: formData.cliente_id.trim(),
      numero_caso: formData.numero_caso.trim() || null,
      limite_pretendido: limitePretendido,
      prazo_analise_rfb: prazoAnalise,
      status: formData.data_protocolo_ecac ? 'protocolado' : 'novo'
    };
    createMutation.mutate(data);
  };

  const clienteMap = React.useMemo(() => {
     return new Map(clientes.map(c => [c.id, c.razao_social]));
   }, [clientes]);

   const getClienteName = (clienteId) => {
     return clienteMap.get(clienteId) || 'Cliente não encontrado';
   };

  const filteredCasos = casos.filter(c => {
    const matchesSearch = 
      c.numero_caso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClienteName(c.cliente_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const exportarCSV = () => {
    const headers = ['Número do Caso', 'Cliente', 'CNPJ', 'Hipótese', 'Status', 'Modalidade Pretendida', 'Limite Pretendido (USD)', 'Data Protocolo', 'Prazo RFB', 'Criado em'];
    
    const rows = filteredCasos.map(caso => {
      const cliente = clientes.find(c => c.id === caso.cliente_id);
      return [
        caso.numero_caso || '',
        cliente?.razao_social || '',
        cliente?.cnpj || '',
        hipoteseLabels[caso.hipotese_revisao] || '',
        statusLabels[caso.status] || '',
        caso.modalidade_pretendida || '',
        caso.limite_pretendido || '',
        caso.data_protocolo_ecac || '',
        caso.prazo_analise_rfb || '',
        new Date(caso.created_date).toLocaleDateString('pt-BR')
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `casos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <FolderOpen className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Casos</h1>
            </div>
            <p className="text-sm text-slate-600 ml-10">Acompanhe todos os processos de revisão de habilitação</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={exportarCSV}
              disabled={filteredCasos.length === 0}
              className="border-slate-300"
            >
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Novo Caso</span><span className="sm:hidden">Novo</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg sm:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Novo Caso</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                <div>
                  <Label htmlFor="cliente_id" className="text-xs sm:text-sm">Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) => setFormData({...formData, cliente_id: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="numero_caso" className="text-xs sm:text-sm">Número do Caso</Label>
                  <Input
                    id="numero_caso"
                    value={formData.numero_caso}
                    onChange={(e) => setFormData({...formData, numero_caso: e.target.value})}
                    placeholder="Ex: REV-2024-001"
                  />
                </div>

                <div>
                  <Label htmlFor="hipotese_revisao" className="text-xs sm:text-sm">Hipótese de Revisão *</Label>
                  <Select
                    value={formData.hipotese_revisao}
                    onValueChange={(value) => setFormData({...formData, hipotese_revisao: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a hipótese..." />
                    </SelectTrigger>
                    <SelectContent className="text-xs sm:text-sm">
                       <SelectItem value="recursos_financeiros_livres">
                         Recursos Financeiros Livres
                       </SelectItem>
                       <SelectItem value="fruicao_desoneracao_tributaria">
                         Desonerações Tributárias
                       </SelectItem>
                       <SelectItem value="recolhimento_tributos_das">
                         Recolhimento Tributos DAS
                       </SelectItem>
                       <SelectItem value="recolhimento_tributos_cprb">
                         Recolhimento CPRB
                       </SelectItem>
                       <SelectItem value="retomada_atividades">
                         Retomada de Atividades
                       </SelectItem>
                       <SelectItem value="inicio_retomada_atividades_5anos">
                         Início/Retomada &lt;5 anos
                       </SelectItem>
                     </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="modalidade_pretendida" className="text-xs sm:text-sm">Modalidade Pretendida</Label>
                  <Select
                    value={formData.modalidade_pretendida}
                    onValueChange={(value) => setFormData({...formData, modalidade_pretendida: value})}
                  >
                    <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="text-xs sm:text-sm">
                      <SelectItem value="limitada">Limitada</SelectItem>
                      <SelectItem value="ilimitada">Ilimitada</SelectItem>
                      <SelectItem value="analise_regularizacao">Regularização</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="limite_pretendido" className="text-xs sm:text-sm">Limite Pretendido (USD)</Label>
                  <Input
                    id="limite_pretendido"
                    type="number"
                    value={formData.limite_pretendido}
                    onChange={(e) => setFormData({...formData, limite_pretendido: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="numero_processo_ecac" className="text-xs sm:text-sm">Processo e-CAC (opcional)</Label>
                  <Input
                    id="numero_processo_ecac"
                    value={formData.numero_processo_ecac}
                    onChange={(e) => setFormData({...formData, numero_processo_ecac: e.target.value})}
                    placeholder="Ex: 10880.000000/2026-00"
                  />
                </div>

                <div>
                  <Label htmlFor="data_protocolo_ecac" className="text-xs sm:text-sm">Data Protocolo (opcional)</Label>
                  <Input
                    id="data_protocolo_ecac"
                    type="date"
                    value={formData.data_protocolo_ecac}
                    onChange={(e) => setFormData({...formData, data_protocolo_ecac: e.target.value})}
                  />
                  {formData.data_protocolo_ecac && (
                    <p className="text-xs text-amber-600 mt-0.5 sm:mt-1">
                      Prazo: 30 dias
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="observacoes" className="text-xs sm:text-sm">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs sm:text-sm h-8 sm:h-9">
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm h-8 sm:h-9"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending && (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                    )}
                    <span className="hidden sm:inline">Criar Caso</span>
                    <span className="sm:hidden">Criar</span>
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-2.5 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                <Input
                  placeholder="Buscar caso ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[200px] text-xs sm:text-sm h-9 sm:h-10">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cases List */}
        {isLoading ? (
          <div className="p-6 sm:p-8 text-center">
            <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin mx-auto text-blue-600" />
          </div>
        ) : filteredCasos.length === 0 ? (
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardContent className="p-6 sm:p-8 text-center text-slate-500">
              <FolderOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-slate-300" />
              <p className="text-sm sm:text-base">Nenhum caso encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredCasos.map((caso) => (
              <Card key={caso.id} className="border border-slate-100 hover:border-blue-200 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link to={createPageUrl(`CasoDetalhe?id=${caso.id}`)} className="flex items-start gap-4 flex-1 cursor-pointer min-w-0 group">
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                        <FolderOpen className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 text-base group-hover:text-blue-600 transition-colors truncate">
                          {caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 truncate">
                          {getClienteName(caso.cliente_id)}
                        </p>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                          {hipoteseLabels[caso.hipotese_revisao]}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3 sm:flex-shrink-0 flex-wrap justify-end">
                      {caso.divergencias_encontradas?.some(d => !d.resolvida) && (
                        <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="hidden sm:inline">Divergências</span>
                        </div>
                      )}
                      <Badge className={`${statusColors[caso.status]} border text-xs font-medium py-1.5 px-2.5`}>
                        {statusLabels[caso.status]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Deseja realmente excluir este caso?`)) {
                            deleteMutation.mutate(caso.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0 flex-shrink-0 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Link to={createPageUrl(`CasoDetalhe?id=${caso.id}`)} className="flex-shrink-0">
                        <ArrowRight className="h-5 w-5 text-blue-400 group-hover:text-blue-600 transition-colors" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}