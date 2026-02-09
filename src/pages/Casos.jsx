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
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  // Get cliente from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get('cliente');
    if (clienteId) {
      setFormData(prev => ({ ...prev, cliente_id: clienteId }));
    }
  }, []);

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
      const caso = await base44.entities.Caso.create(data);
      // Auto-generate checklist items based on hipotese
      await generateChecklist(caso.id, data.hipotese_revisao);
      return caso;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casos'] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Caso.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casos'] });
    }
  });

  const generateChecklist = async (casoId, hipotese) => {
    // Lista padrão para todas as hipóteses (baseada na lista de Recursos Financeiros)
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
      { codigo_dda: "5160", tipo_documento: "comprovante_transferencia_integralizacao", descricao: "Comprovante de transferência de recursos", base_legal: "Art. 6º, I, c", obrigatorio: false },
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
    
    // Calcular prazo de análise se houver data de protocolo
    let prazoAnalise = null;
    if (formData.data_protocolo_ecac) {
      const dataProtocolo = new Date(formData.data_protocolo_ecac);
      dataProtocolo.setDate(dataProtocolo.getDate() + 30);
      prazoAnalise = dataProtocolo.toISOString().split('T')[0];
    }
    
    const data = {
      ...formData,
      limite_pretendido: formData.limite_pretendido ? parseFloat(formData.limite_pretendido) : null,
      prazo_analise_rfb: prazoAnalise,
      status: formData.data_protocolo_ecac ? 'protocolado' : 'novo'
    };
    createMutation.mutate(data);
  };

  const getClienteName = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.razao_social || 'Cliente não encontrado';
  };

  const filteredCasos = casos.filter(c => {
    const matchesSearch = 
      c.numero_caso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClienteName(c.cliente_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Casos</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">Gerencie os processos de revisão</p>
          </div>
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
                  <Label htmlFor="cliente_id">Cliente *</Label>
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
                  <Label htmlFor="numero_caso">Número do Caso</Label>
                  <Input
                    id="numero_caso"
                    value={formData.numero_caso}
                    onChange={(e) => setFormData({...formData, numero_caso: e.target.value})}
                    placeholder="Ex: REV-2024-001"
                  />
                </div>

                <div>
                  <Label htmlFor="hipotese_revisao">Hipótese de Revisão (Art. 4º) *</Label>
                  <Select
                    value={formData.hipotese_revisao}
                    onValueChange={(value) => setFormData({...formData, hipotese_revisao: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a hipótese..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recursos_financeiros_livres">
                        I - Recursos Financeiros de Livre Movimentação
                      </SelectItem>
                      <SelectItem value="fruicao_desoneracao_tributaria">
                        II - Fruição de Desonerações Tributárias
                      </SelectItem>
                      <SelectItem value="recolhimento_tributos_das">
                        III - Recolhimento Tributos via DAS
                      </SelectItem>
                      <SelectItem value="recolhimento_tributos_cprb">
                        IV - Recolhimento CPRB
                      </SelectItem>
                      <SelectItem value="retomada_atividades">
                        V - Retomada de Atividades
                      </SelectItem>
                      <SelectItem value="inicio_retomada_atividades_5anos">
                        Início/Retomada de Atividades há menos de 5 anos
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="modalidade_pretendida">Modalidade Pretendida</Label>
                  <Select
                    value={formData.modalidade_pretendida}
                    onValueChange={(value) => setFormData({...formData, modalidade_pretendida: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="limitada">Limitada (até USD 150.000,00)</SelectItem>
                      <SelectItem value="ilimitada">Ilimitada</SelectItem>
                      <SelectItem value="analise_regularizacao">Análise de Regularização</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="limite_pretendido">Limite Pretendido (USD)</Label>
                  <Input
                    id="limite_pretendido"
                    type="number"
                    value={formData.limite_pretendido}
                    onChange={(e) => setFormData({...formData, limite_pretendido: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="numero_processo_ecac">Número do Processo e-CAC (opcional)</Label>
                  <Input
                    id="numero_processo_ecac"
                    value={formData.numero_processo_ecac}
                    onChange={(e) => setFormData({...formData, numero_processo_ecac: e.target.value})}
                    placeholder="Ex: 10880.000000/2026-00"
                  />
                </div>

                <div>
                  <Label htmlFor="data_protocolo_ecac">Data de Protocolo e-CAC (opcional)</Label>
                  <Input
                    id="data_protocolo_ecac"
                    type="date"
                    value={formData.data_protocolo_ecac}
                    onChange={(e) => setFormData({...formData, data_protocolo_ecac: e.target.value})}
                  />
                  {formData.data_protocolo_ecac && (
                    <p className="text-xs text-amber-600 mt-1">
                      Prazo RFB: 30 dias após protocolo
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Criar Caso
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por número ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
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
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          </div>
        ) : filteredCasos.length === 0 ? (
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardContent className="p-8 text-center text-slate-500">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>Nenhum caso encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredCasos.map((caso) => (
              <Card key={caso.id} className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link to={createPageUrl(`CasoDetalhe?id=${caso.id}`)} className="flex items-start gap-4 flex-1 cursor-pointer">
                      <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`}
                        </h3>
                        <p className="text-slate-600 mt-0.5">
                          {getClienteName(caso.cliente_id)}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          {hipoteseLabels[caso.hipotese_revisao]}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3 sm:flex-shrink-0">
                      {caso.divergencias_encontradas?.some(d => !d.resolvida) && (
                        <div className="flex items-center gap-1 text-red-600 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Divergências</span>
                        </div>
                      )}
                      <Badge className={`${statusColors[caso.status]} border`}>
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
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Link to={createPageUrl(`CasoDetalhe?id=${caso.id}`)}>
                        <ArrowRight className="h-5 w-5 text-slate-400" />
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