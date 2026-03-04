import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  FolderOpen,
  ArrowRight,
  AlertTriangle,
  Clock,
  Loader2,
  Filter,
  Trash2,
  Download,
  DollarSign,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { HIPOTESES } from '@/config/documentosPorHipotese';

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

const hipoteseLabelsShort = {
  recursos_financeiros_livres: "Recursos Livres",
  fruicao_desoneracao_tributaria: "Desonerações",
  recolhimento_tributos_das: "DAS",
  recolhimento_tributos_cprb: "CPRB",
  retomada_atividades: "Retomada",
  inicio_retomada_atividades_5anos: "Início <5 anos"
};

export default function Casos() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterHipotese, setFilterHipotese] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'
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
    const clienteId = params.get('cliente') || '';
    setFormData(prev => ({ ...prev, cliente_id: clienteId }));
  }, [window.location.search]);

  // Auto-switch to table on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setViewMode('table');
      } else {
        setViewMode('cards');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: casos = [], isLoading } = useQuery({
    queryKey: ['casos'],
    queryFn: () => base44.entities.Caso.list('-created_date')
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  // Query para documentos de cada caso
  const { data: todosDocumentos = [] } = useQuery({
    queryKey: ['documentos-todos'],
    queryFn: async () => {
      const docs = await base44.entities.Documento.list();
      return docs;
    }
  });

  // Query para checklist de cada caso
  const { data: todosChecklists = [] } = useQuery({
    queryKey: ['checklists-todos'],
    queryFn: async () => {
      const items = await base44.entities.ChecklistItem.list();
      return items;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      try {
        const caso = await base44.entities.Caso.create(data);
        try {
          await generateChecklist(caso.id, data.hipotese_revisao);
        } catch (checklistError) {
          console.error('Erro ao gerar checklist para caso:', caso.id, checklistError);
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
      queryClient.invalidateQueries({ queryKey: ['checklists-todos'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Caso criado com sucesso!');
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
        
        for (const d of docs) {
          try {
            await base44.entities.Documento.delete(d.id);
          } catch (err) {
            console.error(`Erro ao deletar documento ${d.id}:`, err);
            throw err;
          }
        }
        
        for (const c of checklist) {
          try {
            await base44.entities.ChecklistItem.delete(c.id);
          } catch (err) {
            console.error(`Erro ao deletar checklist ${c.id}:`, err);
            throw err;
          }
        }
        
        return base44.entities.Caso.delete(id);
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casos'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-todos'] });
      queryClient.invalidateQueries({ queryKey: ['checklists-todos'] });
      toast.success('Caso deletado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao deletar caso: ${error.message}`);
    }
  });

  // Mapeamento de hipótese do caso para chave do config
  const hipoteseParaConfig = {
    'recursos_financeiros_livres': 'I',
    'fruicao_desoneracao_tributaria': 'II',
    'recolhimento_tributos_das': 'III',
    'recolhimento_tributos_cprb': 'IV',
    'retomada_atividades': 'V',
    'inicio_retomada_atividades_5anos': 'V',
  };

  // Labels de documentos para descrição no checklist
  const docDescricoes = {
    requerimento_das: { descricao: "Requerimento Disponibilidade Ativo Circulante", base_legal: "Art. 5º" },
    documento_identificacao_responsavel: { descricao: "Documento de identificação do responsável", base_legal: "Art. 5º, § 2º" },
    procuracao: { descricao: "Procuração", base_legal: "Art. 5º, § 3º" },
    documento_identificacao_procurador: { descricao: "Documento de identificação do procurador", base_legal: "Art. 5º, § 3º" },
    contrato_social: { descricao: "Contrato Social e Alterações", base_legal: "Art. 7º, I" },
    certidao_junta_comercial: { descricao: "Certidão Junta Comercial", base_legal: "Art. 7º, I" },
    conta_energia: { descricao: "Conta de energia dos últimos 3 meses", base_legal: "Art. 7º, III" },
    plano_internet: { descricao: "Plano de internet dos últimos 3 meses", base_legal: "Art. 7º, III" },
    guia_iptu: { descricao: "Guia de IPTU", base_legal: "Art. 7º, III" },
    escritura_imovel: { descricao: "Escritura do Imóvel", base_legal: "Art. 7º, IV" },
    contrato_locacao: { descricao: "Contrato de Locação", base_legal: "Art. 7º, IV" },
    comprovante_espaco_armazenagem: { descricao: "Comprovante Espaço de Armazenagem", base_legal: "Art. 7º, V" },
    extratos_bancarios: { descricao: "Extratos Bancários dos últimos 3 meses", base_legal: "Art. 6º, I, a" },
    extrato_bancario_corrente: { descricao: "Extratos Bancários - Conta Corrente (3 meses)", base_legal: "Art. 6º, I, a" },
    balancete_verificacao: { descricao: "Balancete de Verificação dos últimos 3 meses", base_legal: "Art. 6º, I, b" },
    contrato_mutuo: { descricao: "Contrato de Mútuo", base_legal: "Art. 6º, III" },
    balancete_mutuante: { descricao: "Balancete do Mutuante", base_legal: "Art. 6º, III" },
    comprovante_iof_mutuo: { descricao: "Comprovante IOF do Mútuo", base_legal: "Art. 6º, III" },
    balanco_patrimonial_integralizacao: { descricao: "Balanço Patrimonial - Integralização", base_legal: "Art. 6º, II" },
    comprovante_transferencia_integralizacao: { descricao: "Comprovante Transferência - Integralização", base_legal: "Art. 6º, II" },
    embasamento_legal_desoneracao: { descricao: "Embasamento Legal da Desoneração", base_legal: "Art. 4º, II" },
    comprovante_habilitacao_regime_especial: { descricao: "Comprovante Habilitação Regime Especial", base_legal: "Art. 4º, II" },
    planilha_tributos_nao_recolhidos: { descricao: "Planilha de Tributos Não Recolhidos", base_legal: "Art. 4º, II" },
  };

  const generateChecklist = async (casoId, hipotese) => {
    const configKey = hipoteseParaConfig[hipotese];
    const configHipotese = configKey ? HIPOTESES[configKey] : null;

    if (!configHipotese) {
      // Fallback: gerar checklist mínimo com documentos comuns
      const fallbackDocs = ['requerimento_das', 'documento_identificacao_responsavel', 'contrato_social', 'certidao_junta_comercial', 'conta_energia'];
      for (const tipo of fallbackDocs) {
        const info = docDescricoes[tipo] || { descricao: tipo.replace(/_/g, ' '), base_legal: '' };
        await base44.entities.ChecklistItem.create({
          caso_id: casoId, tipo_documento: tipo, descricao: info.descricao,
          base_legal: info.base_legal, obrigatorio: true,
          aplicavel_hipotese: [hipotese], status: 'pendente'
        });
      }
      return;
    }

    // Gerar itens obrigatórios
    for (const tipo of configHipotese.documentos_obrigatorios) {
      const info = docDescricoes[tipo] || { descricao: tipo.replace(/_/g, ' '), base_legal: configHipotese.artigo };
      const periodo = configHipotese.periodo_documentos?.[tipo];
      await base44.entities.ChecklistItem.create({
        caso_id: casoId, tipo_documento: tipo,
        descricao: periodo ? `${info.descricao} (${periodo})` : info.descricao,
        base_legal: info.base_legal, obrigatorio: true,
        aplicavel_hipotese: [hipotese], status: 'pendente'
      });
    }

    // Gerar itens opcionais
    for (const tipo of configHipotese.documentos_opcionais) {
      const info = docDescricoes[tipo] || { descricao: tipo.replace(/_/g, ' '), base_legal: configHipotese.artigo };
      await base44.entities.ChecklistItem.create({
        caso_id: casoId, tipo_documento: tipo,
        descricao: info.descricao, base_legal: info.base_legal,
        obrigatorio: false, aplicavel_hipotese: [hipotese], status: 'pendente'
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

    if (!formData.cliente_id.trim()) {
      toast.error('Selecione um cliente');
      return;
    }

    let limitePretendido = null;
    if (formData.limite_pretendido.trim()) {
      const parsed = parseFloat(formData.limite_pretendido);
      if (isNaN(parsed) || parsed < 0) {
        toast.error('Limite pretendido deve ser um número positivo');
        return;
      }
      limitePretendido = parsed;
    }

    let prazoAnalise = null;
    if (formData.data_protocolo_ecac) {
      const dataProtocolo = new Date(formData.data_protocolo_ecac);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (dataProtocolo > hoje) {
        toast.error('Data de protocolo não pode ser no futuro');
        return;
      }
      
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

  // Calcular progresso de documentos para cada caso
  const getProgressoCaso = (casoId) => {
    const checklistCaso = todosChecklists.filter(item => item.caso_id === casoId && item.obrigatorio);
    const documentosCaso = todosDocumentos.filter(doc => doc.caso_id === casoId);
    
    if (checklistCaso.length === 0) return { percentual: 0, enviados: 0, total: 0 };
    
    const tiposEnviados = new Set(documentosCaso.map(d => d.tipo_documento));
    const enviados = checklistCaso.filter(item => tiposEnviados.has(item.tipo_documento)).length;
    const total = checklistCaso.length;
    const percentual = total > 0 ? Math.round((enviados / total) * 100) : 0;
    
    return { percentual, enviados, total };
  };

  // Calcular dias restantes até prazo
  const getDiasRestantes = (prazoAnaliseRfb) => {
    if (!prazoAnaliseRfb) return null;
    const hoje = new Date();
    const prazo = new Date(prazoAnaliseRfb);
    const diffTime = prazo - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredCasos = casos.filter(c => {
    const cliente = clientes.find(cl => cl.id === c.cliente_id);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      c.numero_caso?.toLowerCase().includes(searchLower) ||
      getClienteName(c.cliente_id).toLowerCase().includes(searchLower) ||
      cliente?.cnpj?.includes(searchTerm) ||
      cliente?.nome_fantasia?.toLowerCase().includes(searchLower);
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesHipotese = filterHipotese === 'all' || c.hipotese_revisao === filterHipotese;
    return matchesSearch && matchesStatus && matchesHipotese;
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
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Casos</h1>
            </div>
            <p className="text-sm sm:text-base text-slate-600">
              Gerencie os casos de revisão de capacidade financeira
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={exportarCSV}
              className="flex items-center gap-2 rounded-xl border-slate-200"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200/50 rounded-xl text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Caso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-indigo-500" />
                    Criar Novo Caso
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                            {cliente.razao_social} - {cliente.cnpj}
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
                    <Label htmlFor="hipotese_revisao">Hipótese de Revisão *</Label>
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
                    <Label htmlFor="modalidade_pretendida">Modalidade Pretendida</Label>
                    <Select
                      value={formData.modalidade_pretendida}
                      onValueChange={(value) => setFormData({...formData, modalidade_pretendida: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="limitada">Limitada</SelectItem>
                        <SelectItem value="ilimitada">Ilimitada</SelectItem>
                        <SelectItem value="analise_regularizacao">Regularização</SelectItem>
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
                    <Label htmlFor="numero_processo_ecac">Processo e-CAC (opcional)</Label>
                    <Input
                      id="numero_processo_ecac"
                      value={formData.numero_processo_ecac}
                      onChange={(e) => setFormData({...formData, numero_processo_ecac: e.target.value})}
                      placeholder="Ex: 10880.000000/2026-00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_protocolo_ecac">Data Protocolo (opcional)</Label>
                    <Input
                      id="data_protocolo_ecac"
                      type="date"
                      value={formData.data_protocolo_ecac}
                      onChange={(e) => setFormData({...formData, data_protocolo_ecac: e.target.value})}
                    />
                    {formData.data_protocolo_ecac && (
                      <p className="text-xs text-amber-600 mt-1">
                        Prazo: 30 dias
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
                      className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl"
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
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5">
          {[
            { label: 'Total', value: casos.length, color: 'slate', gradient: 'from-slate-500 to-slate-700' },
            { label: 'Em Análise', value: casos.filter(c => c.status === 'em_analise').length, color: 'amber', gradient: 'from-amber-500 to-orange-600' },
            { label: 'Protocolados', value: casos.filter(c => c.status === 'protocolado').length, color: 'violet', gradient: 'from-violet-500 to-purple-600' },
            { label: 'Deferidos', value: casos.filter(c => c.status === 'deferido').length, color: 'emerald', gradient: 'from-emerald-500 to-teal-600' },
          ].map((stat, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-3 md:p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 md:h-9 md:w-9 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <span className="text-sm md:text-base font-bold text-white">{stat.value}</span>
                </div>
                <span className="text-xs md:text-sm text-slate-500 font-medium">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/30 mb-6 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por caso, cliente ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-slate-200"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px] rounded-xl border-slate-200">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterHipotese} onValueChange={setFilterHipotese}>
                <SelectTrigger className="w-full sm:w-[180px] rounded-xl border-slate-200">
                  <FileText className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Hipótese" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as hipóteses</SelectItem>
                  {Object.entries(hipoteseLabelsShort).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(filterStatus !== 'all' || filterHipotese !== 'all' || searchTerm) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Filtros ativos:</span>
              {searchTerm && (
                <Badge variant="outline" className="text-xs rounded-lg border-slate-200 cursor-pointer hover:bg-slate-50" onClick={() => setSearchTerm('')}>
                  Busca: {searchTerm} ✕
                </Badge>
              )}
              {filterStatus !== 'all' && (
                <Badge variant="outline" className="text-xs rounded-lg border-slate-200 cursor-pointer hover:bg-slate-50" onClick={() => setFilterStatus('all')}>
                  {statusLabels[filterStatus]} ✕
                </Badge>
              )}
              {filterHipotese !== 'all' && (
                <Badge variant="outline" className="text-xs rounded-lg border-slate-200 cursor-pointer hover:bg-slate-50" onClick={() => setFilterHipotese('all')}>
                  {hipoteseLabelsShort[filterHipotese]} ✕
                </Badge>
              )}
              <button
                onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterHipotese('all'); }}
                className="text-xs text-slate-400 hover:text-slate-600 ml-auto"
              >
                Limpar todos
              </button>
            </div>
          )}
        </div>

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
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Caso</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Hipótese</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Limite (USD)</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCasos.map((caso) => {
                      const progresso = getProgressoCaso(caso.id);
                      const diasRestantes = getDiasRestantes(caso.prazo_analise_rfb);
                      const prazoUrgente = diasRestantes !== null && diasRestantes <= 7;
                      
                      return (
                        <TableRow key={caso.id} className="hover:bg-blue-50/50">
                          <TableCell className="font-medium">
                            <Link to={createPageUrl(`CasoDetalhe?id=${caso.id}`)} className="hover:text-blue-600">
                              {caso.numero_caso || `#${caso.id.slice(0, 8)}`}
                            </Link>
                          </TableCell>
                          <TableCell>{getClienteName(caso.cliente_id)}</TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {hipoteseLabelsShort[caso.hipotese_revisao]}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[caso.status]} border text-xs`}>
                              {statusLabels[caso.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={progresso.percentual} className="w-20 h-2" />
                              <span className="text-xs text-slate-600 whitespace-nowrap">
                                {progresso.enviados}/{progresso.total}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {caso.modalidade_pretendida ? (
                              <span className="capitalize">{caso.modalidade_pretendida}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {caso.limite_pretendido ? (
                              <span className="font-mono">{parseFloat(caso.limite_pretendido).toLocaleString('en-US')}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {diasRestantes !== null ? (
                              <Badge className={prazoUrgente ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}>
                                {diasRestantes > 0 ? `${diasRestantes}d` : 'Vencido'}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`Deseja realmente excluir este caso?`)) {
                                    deleteMutation.mutate(caso.id);
                                  }
                                }}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Link to={createPageUrl(`CasoDetalhe?id=${caso.id}`)}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ArrowRight className="h-4 w-4 text-blue-600" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden grid gap-4">
              {filteredCasos.map((caso) => {
                const progresso = getProgressoCaso(caso.id);
                const diasRestantes = getDiasRestantes(caso.prazo_analise_rfb);
                const prazoUrgente = diasRestantes !== null && diasRestantes <= 7;
                
                return (
                  <Card key={caso.id} className="border border-slate-100 hover:border-blue-200 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
                    <CardContent className="p-4">
                      <Link to={createPageUrl(`CasoDetalhe?id=${caso.id}`)} className="block space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-12 w-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FolderOpen className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-slate-900 truncate">
                                {caso.numero_caso || `Caso #${caso.id.slice(0, 8)}`}
                              </h3>
                              <p className="text-sm text-slate-500 truncate">
                                {getClienteName(caso.cliente_id)}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${statusColors[caso.status]} border text-xs flex-shrink-0`}>
                            {statusLabels[caso.status]}
                          </Badge>
                        </div>

                        {/* Progresso */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              Documentos
                            </span>
                            <span className="font-medium text-slate-700">
                              {progresso.enviados}/{progresso.total} ({progresso.percentual}%)
                            </span>
                          </div>
                          <Progress value={progresso.percentual} className="h-2" />
                        </div>

                        {/* Detalhes */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5">Hipótese</p>
                            <p className="text-slate-700 font-medium text-xs">
                              {hipoteseLabelsShort[caso.hipotese_revisao]}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5">Modalidade</p>
                            <p className="text-slate-700 font-medium capitalize text-xs">
                              {caso.modalidade_pretendida || '-'}
                            </p>
                          </div>
                          {caso.limite_pretendido && (
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Limite (USD)
                              </p>
                              <p className="text-slate-700 font-medium font-mono text-xs">
                                {parseFloat(caso.limite_pretendido).toLocaleString('en-US')}
                              </p>
                            </div>
                          )}
                          {diasRestantes !== null && (
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Prazo e-CAC
                              </p>
                              <Badge className={prazoUrgente ? 'bg-red-100 text-red-800 border-red-200 text-xs' : 'bg-green-100 text-green-800 border-green-200 text-xs'}>
                                {diasRestantes > 0 ? `${diasRestantes} dias` : 'Vencido'}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Divergências */}
                        {caso.divergencias_encontradas?.some(d => !d.resolvida) && (
                          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Divergências encontradas
                          </div>
                        )}
                      </Link>

                      {/* Ações */}
                      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Deseja realmente excluir este caso?`)) {
                              deleteMutation.mutate(caso.id);
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link to={createPageUrl(`CasoDetalhe?id=${caso.id}`)}>
                          <Button variant="ghost" size="sm" className="h-8 px-3">
                            Ver detalhes
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}